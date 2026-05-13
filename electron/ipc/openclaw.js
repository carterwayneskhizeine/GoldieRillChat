const { ipcMain, app } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs').promises
const crypto = require('crypto')

let getMainWindow = null
let ws = null
let connectionState = 'disconnected'
const pendingRequests = new Map()
let msgCounter = 0

// Challenge-response state
let pendingConnect = null  // { resolve, reject, identity, config }
let connectSent = false
let challengeTimeoutId = null

const OPENCLAW_PROTOCOL_VERSION = 3
const DEFAULT_CLIENT_ID = 'gateway-client'
const DEFAULT_CLIENT_MODE = 'backend'
const DEFAULT_DISPLAY_NAME = 'GoldieRillChat'
const DEFAULT_ROLE = 'operator'
const DEFAULT_SCOPES = ['operator.admin', 'operator.read', 'operator.write']
const DEFAULT_CAPS = ['tool-events']
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

// --- Identity ---

function base64UrlEncode(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function derivePublicKeyRaw(publicKeyPem) {
  const spki = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' })
  if (spki.length === ED25519_SPKI_PREFIX.length + 32 && spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)) {
    return spki.subarray(ED25519_SPKI_PREFIX.length)
  }
  return spki
}

function fingerprintPublicKey(publicKeyPem) {
  return crypto.createHash('sha256').update(derivePublicKeyRaw(publicKeyPem)).digest('hex')
}

async function loadOrCreateIdentity() {
  const identityPath = path.join(os.homedir(), '.openclaw', 'identity', 'device.json')
  try {
    const data = await fs.readFile(identityPath, 'utf8')
    const parsed = JSON.parse(data)
    if (parsed && typeof parsed.publicKeyPem === 'string' && typeof parsed.privateKeyPem === 'string') {
      const deviceId = fingerprintPublicKey(parsed.publicKeyPem)
      if (parsed.deviceId !== deviceId) {
        const updated = { ...parsed, deviceId }
        await fs.writeFile(identityPath, `${JSON.stringify(updated, null, 2)}\n`, { mode: 0o600 })
      }
      return { deviceId, publicKeyPem: parsed.publicKeyPem, privateKeyPem: parsed.privateKeyPem }
    }
  } catch {
    // Fall through and generate a new OpenClaw-compatible identity.
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  const deviceId = fingerprintPublicKey(publicKey)
  const identity = { deviceId, publicKeyPem: publicKey, privateKeyPem: privateKey }
  const stored = { version: 1, ...identity, createdAtMs: Date.now() }
  await fs.mkdir(path.dirname(identityPath), { recursive: true })
  await fs.writeFile(identityPath, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 })
  try { await fs.chmod(identityPath, 0o600) } catch {}
  return identity
}

// Build v3 pipe-delimited payload expected by the gateway
function buildDeviceAuthPayloadV3(identity, nonce, config, signedAtMs) {
  const role = config.role || DEFAULT_ROLE
  const scopes = (config.scopes || DEFAULT_SCOPES).join(',')
  const token = config.token || ''
  const platform = process.platform
  const deviceFamily = config.deviceFamily || ''
  const clientId = config.clientId || DEFAULT_CLIENT_ID
  return ['v3', identity.deviceId, clientId, DEFAULT_CLIENT_MODE, role, scopes, String(signedAtMs), token, nonce, platform, deviceFamily].join('|')
}

function buildDeviceAuth(identity, nonce, config) {
  const signedAt = Date.now()
  const publicKey = base64UrlEncode(derivePublicKeyRaw(identity.publicKeyPem))
  const payload = buildDeviceAuthPayloadV3(identity, nonce, config, signedAt)
  const signature = base64UrlEncode(crypto.sign(null, Buffer.from(payload, 'utf8'), identity.privateKeyPem))
  return { id: identity.deviceId, publicKey, signature, signedAt, nonce }
}

// --- WebSocket RPC ---

function nextId() {
  return `grc_${++msgCounter}_${Date.now()}`
}

function pushState(state, error = null) {
  connectionState = state
  const win = getMainWindow && getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('openclaw:connection-state', { state, error })
  }
}

function clearChallengeTimer() {
  if (challengeTimeoutId) {
    clearTimeout(challengeTimeoutId)
    challengeTimeoutId = null
  }
}

function rejectPendingRequests(error) {
  for (const [, req] of pendingRequests) {
    clearTimeout(req.timeout)
    req.reject(error)
  }
  pendingRequests.clear()
}

function closeSocket(socket) {
  if (!socket) return
  socket.removeAllListeners()
  socket.on('error', () => {})
  try {
    if (socket.readyState === 0) socket.terminate()
    else socket.close()
  } catch {}
}

function sendConnectRequest(identity, config, nonce) {
  if (connectSent) return
  connectSent = true
  clearChallengeTimer()

  const deviceAuth = buildDeviceAuth(identity, nonce || '', config)
  const id = nextId()
  const timeout = setTimeout(() => {
    if (!pendingRequests.has(id)) return
    pendingRequests.delete(id)
    pushState('disconnected', 'Connect timeout')
    if (pendingConnect) { pendingConnect.reject(new Error('Connect timeout')); pendingConnect = null }
  }, 15000)

  pendingRequests.set(id, {
    method: 'connect',
    resolve: (payload) => {
      pushState('connected')
      if (pendingConnect) { pendingConnect.resolve(payload); pendingConnect = null }
    },
    reject: (e) => {
      pushState('disconnected', e.message)
      if (pendingConnect) { pendingConnect.reject(e); pendingConnect = null }
    },
    timeout,
  })

  ws.send(JSON.stringify({
    type: 'req',
    id,
    method: 'connect',
    params: {
      minProtocol: OPENCLAW_PROTOCOL_VERSION,
      maxProtocol: OPENCLAW_PROTOCOL_VERSION,
      client: {
        id: config.clientId || DEFAULT_CLIENT_ID,
        displayName: config.displayName || DEFAULT_DISPLAY_NAME,
        version: app.getVersion(),
        platform: process.platform,
        deviceFamily: config.deviceFamily || undefined,
        mode: DEFAULT_CLIENT_MODE,
      },
      caps: config.caps || DEFAULT_CAPS,
      role: config.role || DEFAULT_ROLE,
      scopes: config.scopes || DEFAULT_SCOPES,
      auth: config.token ? { token: config.token } : undefined,
      device: deviceAuth,
    },
  }))
}

function gatewayRequest(method, params, timeoutMs = 30000) {
  if (!ws || ws.readyState !== 1) return Promise.reject(new Error('Not connected to OpenClaw Gateway'))
  return new Promise((resolve, reject) => {
    const id = nextId()
    const timeout = setTimeout(() => { pendingRequests.delete(id); reject(new Error(`Timeout: ${method}`)) }, timeoutMs)
    pendingRequests.set(id, { method, resolve, reject, timeout })
    ws.send(JSON.stringify({ type: 'req', id, method, params }))
  })
}

function handleMessage(raw) {
  let msg
  try { msg = JSON.parse(raw.toString()) } catch { return }

  // New protocol: { type: 'res', id, ok, payload, error }
  if (msg.type === 'res' && msg.id && pendingRequests.has(msg.id)) {
    const req = pendingRequests.get(msg.id)
    pendingRequests.delete(msg.id)
    clearTimeout(req.timeout)
    if (!msg.ok) {
      req.reject(new Error((msg.error && msg.error.message) || 'Gateway error'))
    } else {
      req.resolve(msg.payload)
    }
    return
  }

  // New protocol: { type: 'event', event, payload, seq }
  if (msg.type === 'event') {
    if (msg.event === 'connect.challenge') {
      const nonce = (msg.payload && msg.payload.nonce) || ''
      if (!connectSent && pendingConnect) {
        sendConnectRequest(pendingConnect.identity, pendingConnect.config, nonce)
      }
      return
    }

    if (msg.event === 'chat') {
      const win = getMainWindow && getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('openclaw:stream-chunk', msg.payload)
      }
    }
    return
  }
}

function openConnection(config, identity) {
  return new Promise((resolve, reject) => {
    const WebSocket = require('ws')
    clearChallengeTimer()
    if (pendingConnect) {
      pendingConnect.reject(new Error('Connection superseded'))
      pendingConnect = null
    }
    rejectPendingRequests(new Error('Connection superseded'))
    closeSocket(ws)
    ws = null
    connectSent = false

    pushState('connecting')
    pendingConnect = { resolve, reject, identity, config }

    const socket = new WebSocket(config.url)
    ws = socket

    socket.on('open', () => {
      if (socket !== ws) return
      // Wait up to 3s for connect.challenge; if none arrives, connect without nonce
      challengeTimeoutId = setTimeout(() => {
        challengeTimeoutId = null
        if (!connectSent && pendingConnect) {
          sendConnectRequest(pendingConnect.identity, pendingConnect.config, '')
        }
      }, 3000)
    })

    socket.on('message', (data) => {
      if (socket !== ws) return
      handleMessage(data)
    })

    socket.on('error', (err) => {
      if (socket !== ws) return
      clearChallengeTimer()
      pushState('disconnected', err.message)
      if (pendingConnect) { pendingConnect.reject(err); pendingConnect = null }
      rejectPendingRequests(err)
    })

    socket.on('close', () => {
      if (socket !== ws) return
      clearChallengeTimer()
      pushState('disconnected')
      if (pendingConnect) { pendingConnect.reject(new Error('WebSocket closed')); pendingConnect = null }
      rejectPendingRequests(new Error('WebSocket closed'))
    })
  })
}

// --- IPC Registration ---

module.exports = function registerOpenClawHandlers(getWindow) {
  getMainWindow = getWindow

  ipcMain.handle('openclaw:connect', async (_, config) => {
    try {
      const identity = await loadOrCreateIdentity()
      await openConnection(config, identity)
      return { ok: true, deviceId: identity.deviceId }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:disconnect', async () => {
    clearChallengeTimer()
    if (pendingConnect) { pendingConnect.reject(new Error('Disconnected')); pendingConnect = null }
    rejectPendingRequests(new Error('Disconnected'))
    closeSocket(ws)
    ws = null
    pushState('disconnected')
    return { ok: true }
  })

  ipcMain.handle('openclaw:get-state', async () => {
    return { state: connectionState }
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
      const result = await gatewayRequest('chat.send', { sessionKey, message, deliver: false, attachments: attachments || [], idempotencyKey }, 60000)
      return { ok: true, ...result }
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
      const result = await gatewayRequest('sessions.list', {
        limit: 100,
        includeLastMessage: false,
        includeDerivedTitles: true,
      })
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:create-session', async (_, { label }) => {
    try {
      const timestamp = Date.now().toString(36)
      const random = crypto.randomBytes(3).toString('hex')
      const key = `agent:main:custom:${timestamp}-${random}`
      if (label) {
        await gatewayRequest('sessions.patch', { key, label })
      }
      return { ok: true, key, sessionKey: key, sessionId: key, label }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:delete-session', async (_, { sessionKey }) => {
    try {
      if (sessionKey === 'main' || sessionKey === 'agent:main:main') {
        return { ok: false, error: 'Cannot delete main session' }
      }
      const result = await gatewayRequest('sessions.delete', { key: sessionKey, deleteTranscript: false })
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('openclaw:rename-session', async (_, { sessionKey, label }) => {
    try {
      const result = await gatewayRequest('sessions.patch', { key: sessionKey, label })
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
