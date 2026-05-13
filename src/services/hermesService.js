// Hermes Agent 渲染进程服务层
// 通过 window.hermesAPI (preload 桥接) 与主进程 HTTP 代理通信，绕过 CORS 限制

const STORAGE_KEY_CONFIG = 'hermes_config'

export function getHermesConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || '{}')
  } catch {
    return {}
  }
}

export function saveHermesConfig(config) {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
}

/** 健康检查 */
export async function checkHermesHealth() {
  if (!window.hermesAPI) return false
  try {
    const res = await window.hermesAPI.health(getHermesConfig())
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

  window.hermesAPI.startChatStream({ cfg: getHermesConfig(), sessionId, messages, model }).then(({ requestId }) => {
    if (finished) return

    unsubChunk = window.hermesAPI.onChunk(requestId, ({ data, sessionId: newSid }) => {
      if (finished) return
      const lines = data.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') return
        try {
          const parsed = JSON.parse(payload)
          if (parsed.type === 'hermes.tool.progress' && onToolProgress) {
            onToolProgress(parsed)
            continue
          }
          const content = parsed.choices?.[0]?.delta?.content
          if (content && onChunk) onChunk(content)
        } catch {}
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

export async function getHermesHistory(sessionId) {
  if (!window.hermesAPI || !sessionId) return []
  try {
    const res = await window.hermesAPI.getHistory(getHermesConfig(), sessionId)
    if (!res.ok) return []
    return normalizeHermesHistory(res.messages || [])
  } catch {
    return []
  }
}

export async function listHermesSessions(limit = 20, offset = 0) {
  if (!window.hermesAPI) return { sessions: [], total: 0 }
  try {
    const res = await window.hermesAPI.listSessions(getHermesConfig(), limit, offset)
    if (!res.ok) return { sessions: [], total: 0 }
    return { sessions: res.sessions || [], total: res.total || 0 }
  } catch {
    return { sessions: [], total: 0 }
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
