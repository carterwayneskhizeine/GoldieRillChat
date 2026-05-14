// Hermes Agent 渲染进程服务层
// 通过 window.hermesAPI (preload 桥接) 与主进程 HTTP 代理通信，绕过 CORS 限制

const STORAGE_KEY_CONFIG = 'hermes_config'
const STORAGE_KEY_PROFILES = 'hermes_profiles'

// --- Migration ---

function migrateIfNeeded() {
  const oldRaw = localStorage.getItem(STORAGE_KEY_CONFIG)
  const newRaw = localStorage.getItem(STORAGE_KEY_PROFILES)

  if (oldRaw && !newRaw) {
    try {
      const oldCfg = JSON.parse(oldRaw)
      const profiles = []
      if (oldCfg.apiUrl || oldCfg.dashboardUrl || oldCfg.apiToken) {
        profiles.push({
          id: 'default',
          name: 'Default',
          apiUrl: oldCfg.apiUrl || 'http://127.0.0.1:8651',
          dashboardUrl: oldCfg.dashboardUrl || 'http://127.0.0.1:9119',
          apiToken: oldCfg.apiToken || '',
          dashboardToken: oldCfg.dashboardToken || '',
        })
      }
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify({ profiles, activeProfileIndex: 0 }))
    } catch {}
  }
}
migrateIfNeeded()

// --- Multi-profile CRUD ---

export function getHermesProfiles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILES) || '{}')
  } catch {
    return { profiles: [], activeProfileIndex: 0 }
  }
}

export function saveHermesProfiles(profilesData) {
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profilesData))
}

export function getActiveProfileIndex() {
  const data = getHermesProfiles()
  const idx = data.activeProfileIndex || 0
  return Math.min(idx, (data.profiles?.length || 1) - 1)
}

export function setActiveProfileIndex(index) {
  const data = getHermesProfiles()
  data.activeProfileIndex = Math.max(0, Math.min(index, (data.profiles?.length || 1) - 1))
  saveHermesProfiles(data)
}

function getActiveProfileConfig() {
  const data = getHermesProfiles()
  const profiles = data.profiles || []
  const idx = data.activeProfileIndex || 0
  return profiles[Math.min(idx, profiles.length - 1)] || {}
}

// --- Backward-compatible API ---

export function getHermesConfig() {
  return getActiveProfileConfig()
}

export function saveHermesConfig(config) {
  const data = getHermesProfiles()
  const idx = data.activeProfileIndex || 0
  if (data.profiles && data.profiles[idx]) {
    data.profiles[idx] = { ...data.profiles[idx], ...config }
    saveHermesProfiles(data)
  }
}

// --- Health check ---

export async function checkHermesHealth(cfg) {
  if (!window.hermesAPI) return false
  try {
    const config = cfg || getHermesConfig()
    const res = await window.hermesAPI.health(config)
    return res.ok
  } catch {
    return false
  }
}

/**
 * 发送消息（通过主进程 SSE 流式）
 * 返回清理函数（取消监听）
 */
export function sendHermesMessage({
  cfg,
  sessionId,
  conversationHistory,
  userMessage,
  model,
  onChunk,
  onToolProgress,
  onFinish,
  onError,
}) {
  if (!window.hermesAPI) {
    if (onError) onError(new Error('hermesAPI 未初始化'))
    return () => {}
  }

  const messages = [
    ...(conversationHistory || []),
    { role: 'user', content: userMessage },
  ]

  let finished = false
  let unsubChunk = null
  let unsubDone = null
  let unsubErr = null

  window.hermesAPI.startChatStream({ cfg: cfg || getHermesConfig(), sessionId, messages, model }).then(({ requestId }) => {
    if (finished) return

    let pendingEvent = null  // tracks current SSE event type across lines

    unsubChunk = window.hermesAPI.onChunk(requestId, ({ data, sessionId: newSid }) => {
      if (finished) return
      const lines = data.split('\n')
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          pendingEvent = line.slice(7).trim()
          continue
        }
        if (line === '') {
          pendingEvent = null
          continue
        }
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') return
        try {
          const parsed = JSON.parse(payload)
          if (pendingEvent === 'hermes.tool.progress') {
            if (onToolProgress) onToolProgress(parsed)
            pendingEvent = null
            continue
          }
          const content = parsed.choices?.[0]?.delta?.content
          if (content && onChunk) onChunk(content)
        } catch {}
        pendingEvent = null
      }
    })

    unsubDone = window.hermesAPI.onDone(requestId, ({ sessionId: finalSid }) => {
      if (finished) return
      finished = true
      cleanup()
      if (onFinish) onFinish({ sessionId: finalSid || sessionId })
    })

    unsubErr = window.hermesAPI.onError(requestId, ({ error }) => {
      if (finished) return
      finished = true
      cleanup()
      if (onError) onError(new Error(error))
    })
  }).catch((err) => {
    if (!finished) {
      finished = true
      if (onError) onError(err)
    }
  })

  function cleanup() {
    if (unsubChunk) unsubChunk()
    if (unsubDone) unsubDone()
    if (unsubErr) unsubErr()
  }

  return () => {
    if (!finished) {
      finished = true
      cleanup()
    }
  }
}

export async function getHermesHistory(cfg, sessionId) {
  if (!window.hermesAPI || !sessionId) return []
  try {
    const res = await window.hermesAPI.getHistory(cfg || getHermesConfig(), sessionId)
    if (!res.ok) return []
    return normalizeHermesHistory(res.messages || [])
  } catch {
    return []
  }
}

export async function listHermesSessions(cfg, limit = 20, offset = 0) {
  if (!window.hermesAPI) return { sessions: [], total: 0 }
  try {
    const res = await window.hermesAPI.listSessions(cfg || getHermesConfig(), limit, offset)
    if (!res.ok) return { sessions: [], total: 0 }
    return { sessions: res.sessions || [], total: res.total || 0 }
  } catch {
    return { sessions: [], total: 0 }
  }
}

// --- Auto-discovery ---

export async function discoverProfiles() {
  if (!window.hermesAPI?.discoverProfiles) return []
  try {
    return await window.hermesAPI.discoverProfiles()
  } catch {
    return []
  }
}

// --- Normalize Hermes messages to internal format ---

function normalizeHermesHistory(rawMessages) {
  return rawMessages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => {
      const contentBlocks = parseHermesContent(msg)
      const textContent = contentBlocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
      return {
        id: msg.id || String(Date.now() + Math.random()),
        role: msg.role,
        content: textContent,
        contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
        timestamp: msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now()),
      }
    })
}

function parseHermesContent(msg) {
  const blocks = []

  if (msg.role === 'tool') {
    blocks.push({
      type: 'toolResult',
      id: msg.tool_call_id,
      name: msg.name,
      text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    })
    return blocks
  }

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    for (const tc of msg.tool_calls) {
      let args = {}
      try { args = JSON.parse(tc.function?.arguments || '{}') } catch {}
      blocks.push({ type: 'toolCall', id: tc.id, name: tc.function?.name || '', arguments: args })
    }
  }

  if (msg.content) {
    blocks.push({
      type: 'text',
      text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    })
  }

  return blocks
}
