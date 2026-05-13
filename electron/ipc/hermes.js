const { ipcMain } = require('electron')
const http = require('http')
const https = require('https')

let getMainWindow = null
let reqCounter = 0

// Dashboard session token cache
let cachedToken = null
let cachedTokenExpiry = 0
let cachedDashboardUrl = null
const TOKEN_TTL = 5 * 60 * 1000

async function getDashboardToken(cfg) {
  const dashUrl = cfg.dashboardUrl || 'http://127.0.0.1:9119'
  if (dashUrl !== cachedDashboardUrl || Date.now() >= cachedTokenExpiry) {
    cachedToken = null
  }
  if (cachedToken) return cachedToken
  try {
    const opts = getDashboardOptions(cfg, '/')
    const res = await makeRequest(opts)
    const match = res.body.match(/window\.__HERMES_SESSION_TOKEN__\s*=\s*["']([^"']+)["']/)
    if (match) {
      cachedToken = match[1]
      cachedTokenExpiry = Date.now() + TOKEN_TTL
      cachedDashboardUrl = dashUrl
      return cachedToken
    }
  } catch {}
  return null
}

function parseUrl(urlStr) {
  try { return new URL(urlStr) } catch { return new URL('http://localhost:8651') }
}

function buildHeaders(cfg, extra = {}) {
  const h = { 'Content-Type': 'application/json' }
  if (cfg.apiToken) h['Authorization'] = `Bearer ${cfg.apiToken}`
  return { ...h, ...extra }
}

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const mod = options.protocol === 'https:' ? https : http
    const req = mod.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

function getRequestOptions(cfg, path, method = 'GET', extraHeaders = {}) {
  const base = cfg.apiUrl || 'http://127.0.0.1:8651'
  const parsed = parseUrl(base)
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path,
    method,
    headers: buildHeaders(cfg, extraHeaders),
  }
}

function getDashboardOptions(cfg, path, method = 'GET', extraHeaders = {}) {
  const base = cfg.dashboardUrl || 'http://127.0.0.1:9119'
  const parsed = parseUrl(base)
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path,
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  }
}

module.exports = function registerHermesHandlers(getWindow) {
  getMainWindow = getWindow

  // Health check — config passed directly from renderer
  ipcMain.handle('hermes:health', async (_, cfg = {}) => {
    try {
      const opts = getRequestOptions(cfg, '/health')
      const res = await makeRequest(opts)
      if (res.status < 400) return { ok: true, status: res.status }
      // Fallback: try /v1/models
      const opts2 = getRequestOptions(cfg, '/v1/models')
      const res2 = await makeRequest(opts2)
      return { ok: res2.status < 400 || res2.status === 401, status: res2.status }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // Start streaming chat
  ipcMain.handle('hermes:chat-stream', async (_, { cfg = {}, sessionId, messages, model }) => {
    const mainWindow = getMainWindow()
    const requestId = `hreq_${++reqCounter}_${Date.now()}`
    const body = JSON.stringify({ model: model || 'default', messages, stream: true })
    const extraHeaders = {}
    if (sessionId) extraHeaders['X-Hermes-Session-Id'] = sessionId

    const opts = {
      ...getRequestOptions(cfg, '/v1/chat/completions', 'POST', extraHeaders),
      headers: {
        ...buildHeaders(cfg, extraHeaders),
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const mod = opts.protocol === 'https:' ? https : http
    const req = mod.request(opts, (res) => {
      const newSessionId = res.headers['x-hermes-session-id'] || sessionId

      res.on('data', (chunk) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`hermes:chunk:${requestId}`, {
            data: chunk.toString(),
            sessionId: newSessionId,
          })
        }
      })

      res.on('end', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`hermes:done:${requestId}`, { sessionId: newSessionId })
        }
      })

      res.on('error', (err) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`hermes:error:${requestId}`, { error: err.message })
        }
      })
    })

    req.on('error', (err) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(`hermes:error:${requestId}`, { error: err.message })
      }
    })

    req.write(body)
    req.end()

    return { requestId }
  })

  // Get session history — lives on dashboard server (port 9119), needs session token
  ipcMain.handle('hermes:get-history', async (_, { cfg = {}, sessionId }) => {
    if (!sessionId) return { ok: true, messages: [] }
    try {
      const token = await getDashboardToken(cfg)
      const authHeaders = token ? { 'X-Hermes-Session-Token': token } : {}
      const opts = getDashboardOptions(cfg, `/api/sessions/${sessionId}/messages`, 'GET', authHeaders)
      const res = await makeRequest(opts)
      if (res.status === 401) return { ok: false, error: 'Unauthorized — check Dashboard URL is port 9119', messages: [] }
      const data = JSON.parse(res.body)
      const messages = Array.isArray(data) ? data : (data.messages || [])
      return { ok: res.status < 400, messages }
    } catch (e) {
      return { ok: false, error: e.message, messages: [] }
    }
  })

  // List sessions — lives on dashboard server (port 9119), needs session token
  ipcMain.handle('hermes:list-sessions', async (_, { cfg = {}, limit = 20, offset = 0 } = {}) => {
    try {
      const token = await getDashboardToken(cfg)
      const authHeaders = token ? { 'X-Hermes-Session-Token': token } : {}
      const opts = getDashboardOptions(cfg, `/api/sessions?limit=${limit}&offset=${offset}`, 'GET', authHeaders)
      const res = await makeRequest(opts)
      if (res.status === 401) return { ok: false, error: 'Unauthorized', sessions: [], total: 0 }
      const data = JSON.parse(res.body)
      const sessions = Array.isArray(data) ? data : (data.sessions || [])
      return { ok: res.status < 400, sessions, total: data.total || sessions.length }
    } catch (e) {
      return { ok: false, error: e.message, sessions: [], total: 0 }
    }
  })
}
