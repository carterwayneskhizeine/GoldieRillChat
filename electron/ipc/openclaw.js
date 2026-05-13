const { ipcMain, app } = require('electron')
const path = require('path')
const fs = require('fs').promises
const crypto = require('crypto')

let getMainWindow = null
let ws = null
let connectionState = 'disconnected'
const pendingRequests = new Map()
let msgCounter = 0

// --- Identity ---

async function loadOrCreateIdentity() {
  const identityPath = path.join(app.getPath('userData'), 'openclaw-identity.json')
  try {
    const data = await fs.readFile(identityPath, 'utf8')
    return JSON.parse(data)
  } catch {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })
    const pubDer = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' })
    const deviceId = crypto.createHash('sha256').update(pubDer).digest('hex')
    const identity = { deviceId, publicKeyPem: publicKey, privateKeyPem: privateKey, createdAt: new Date().toISOString() }
    await fs.writeFile(identityPath, JSON.stringify(identity, null, 2), 'utf8')
    return identity
  }
}

function buildDeviceAuth(identity, role = 'user') {
  const nonce = crypto.randomBytes(16).toString('hex')
  const signedAt = new Date().toISOString()
  const pubDer = crypto.createPublicKey(identity.publicKeyPem).export({ type: 'spki', format: 'der' })
  // Raw 32-byte Ed25519 public key is the last 32 bytes of the SPKI DER
  const publicKey = Buffer.from(pubDer).slice(-32).toString('base64url')
  const payload = JSON.stringify({ deviceId: identity.deviceId, nonce, signedAt, role })
  const signature = crypto.sign(null, Buffer.from(payload), identity.privateKeyPem).toString('base64url')
  return { id: identity.deviceId, publicKey, signature, signedAt, nonce }
}

// --- WebSocket RPC ---

function nextId() {
  return `grc_${++msgCounter}_${Date.now()}`
}

function pushState(state, error = null) {
  const win = getMainWindow && getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('openclaw:connection-state', { state, error })
  }
}

function handleMessage(raw) {
  let msg
  try { msg = JSON.parse(raw.toString()) } catch { return }

  // RPC response
  if (msg.id && pendingRequests.has(msg.id)) {
    const req = pendingRequests.get(msg.id)
    pendingRequests.delete(msg.id)
    clearTimeout(req.timeout)
    if (msg.error) {
      req.reject(new Error(msg.error.message || 'Gateway error'))
    } else {
      // Detect successful connect response
      if (req.method === 'connect') {
        connectionState = 'connected'
        pushState('connected')
      }
      req.resolve(msg.result)
    }
    return
  }

  // Server-pushed stream events
  if (msg.method === 'chat.event' && msg.params) {
    const win = getMainWindow && getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('openclaw:stream-chunk', msg.params)
    }
  }
}

function openConnection(config, identity) {
  const WebSocket = require('ws')
  if (ws) { ws.removeAllListeners(); try { ws.close() } catch {} ; ws = null }

  connectionState = 'connecting'
  pushState('connecting')

  ws = new WebSocket(config.url)

  ws.on('open', () => {
    const deviceAuth = buildDeviceAuth(identity, config.role || 'user')
    const id = nextId()
    const timeout = setTimeout(() => {
      pendingRequests.delete(id)
    }, 15000)
    pendingRequests.set(id, {
      method: 'connect',
      resolve: () => {},
      reject: (e) => { connectionState = 'error'; pushState('error', e.message) },
      timeout,
    })
    ws.send(JSON.stringify({
      id,
      method: 'connect',
      params: {
        minProtocol: 3, maxProtocol: 3,
        client: { id: identity.deviceId, displayName: config.clientName || 'GoldieRillChat', version: '2.0.1', platform: process.platform, mode: 'desktop' },
        auth: config.token ? { token: config.token } : undefined,
        device: deviceAuth,
      },
    }))
  })

  ws.on('message', (data) => handleMessage(data))

  ws.on('error', (err) => {
    connectionState = 'error'
    pushState('error', err.message)
    for (const [, req] of pendingRequests) { clearTimeout(req.timeout); req.reject(err) }
    pendingRequests.clear()
  })

  ws.on('close', () => {
    connectionState = 'disconnected'
    pushState('disconnected')
    for (const [, req] of pendingRequests) { clearTimeout(req.timeout); req.reject(new Error('WebSocket closed')) }
    pendingRequests.clear()
  })
}

function gatewayRequest(method, params, timeoutMs = 30000) {
  if (!ws || ws.readyState !== 1) return Promise.reject(new Error('Not connected to OpenClaw Gateway'))
  return new Promise((resolve, reject) => {
    const id = nextId()
    const timeout = setTimeout(() => { pendingRequests.delete(id); reject(new Error(`Timeout: ${method}`)) }, timeoutMs)
    pendingRequests.set(id, { method, resolve, reject, timeout })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

// --- IPC Registration ---

module.exports = function registerOpenClawHandlers(getWindow) {
  getMainWindow = getWindow

  ipcMain.handle('openclaw:connect', async (_, config) => {
    try {
      const identity = await loadOrCreateIdentity()
      openConnection(config, identity)
      return { ok: true, deviceId: identity.deviceId }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:disconnect', async () => {
    if (ws) { try { ws.close() } catch {} ; ws = null }
    connectionState = 'disconnected'
    return { ok: true }
  })

  ipcMain.handle('openclaw:get-device-id', async () => {
    try {
      const identity = await loadOrCreateIdentity()
      return { ok: true, deviceId: identity.deviceId }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:send-message', async (_, { sessionKey, message, attachments }) => {
    try {
      const idempotencyKey = crypto.randomBytes(16).toString('hex')
      const result = await gatewayRequest('chat.send', { sessionKey, message, attachments: attachments || [], idempotencyKey }, 60000)
      return { ok: true, result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:get-history', async (_, { sessionKey, limit = 50 }) => {
    try {
      const result = await gatewayRequest('chat.history', { sessionKey, limit })
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:list-sessions', async () => {
    try {
      const result = await gatewayRequest('chat.sessions', {})
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:create-session', async (_, { label }) => {
    try {
      const result = await gatewayRequest('chat.session.create', { label })
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:delete-session', async (_, { sessionKey }) => {
    try {
      const result = await gatewayRequest('chat.session.delete', { sessionKey })
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:rename-session', async (_, { sessionKey, label }) => {
    try {
      const result = await gatewayRequest('chat.session.rename', { sessionKey, label })
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:abort', async (_, { sessionKey, runId }) => {
    try {
      const result = await gatewayRequest('chat.abort', { sessionKey, runId })
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
}
