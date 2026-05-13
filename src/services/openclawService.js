// OpenClaw Gateway 渲染进程服务层
// 通过 window.openclawAPI (preload 桥接) 与主进程 WebSocket 网关通信

const STORAGE_KEY_CONFIG = 'openclaw_config'

export function getOpenClawConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || '{}')
  } catch {
    return {}
  }
}

export function saveOpenClawConfig(config) {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
}

/** 连接到 OpenClaw 网关，返回 { ok, deviceId?, error? } */
export async function connectOpenClaw(config) {
  const cfg = config || getOpenClawConfig()
  if (!cfg.url) return { ok: false, error: '未配置 Gateway URL' }
  return window.openclawAPI.connect(cfg)
}

/** 断开连接 */
export async function disconnectOpenClaw() {
  return window.openclawAPI.disconnect()
}

/** 获取设备 ID */
export async function getDeviceId() {
  return window.openclawAPI.getDeviceId()
}

/**
 * 发送消息并通过 onChunk / onFinish / onError 回调接收流式结果。
 * 返回一个清理函数（取消监听）。
 */
export function sendOpenClawMessage({ sessionKey, message, attachments, onChunk, onToolCall, onFinish, onError }) {
  let finished = false

  const unsubscribe = window.openclawAPI.onStreamChunk((event) => {
    if (finished) return
    if (event.sessionKey && event.sessionKey !== sessionKey) return

    const { state, message: payload } = event

    if (state === 'delta' && payload) {
      const blocks = Array.isArray(payload.content) ? payload.content : []
      for (const block of blocks) {
        if (block.type === 'text' && onChunk) onChunk(block.text || '')
        if (block.type === 'thinking' && onChunk) onChunk('', block.thinking || '')
        if ((block.type === 'tool_use' || block.type === 'toolCall') && onToolCall) {
          onToolCall({ id: block.id, name: block.name, arguments: block.input || block.arguments })
        }
      }
    }

    if (state === 'final') {
      finished = true
      unsubscribe()
      if (onFinish) onFinish(payload)
    }

    if (state === 'error' || state === 'aborted') {
      finished = true
      unsubscribe()
      if (onError) onError(new Error(event.error || state))
    }
  })

  // Fire the send (don't await — streaming via events)
  window.openclawAPI.sendMessage(sessionKey, message, attachments).then((res) => {
    if (res && !res.ok && !finished) {
      finished = true
      unsubscribe()
      if (onError) onError(new Error(res.error || 'Send failed'))
    }
  }).catch((err) => {
    if (!finished) {
      finished = true
      unsubscribe()
      if (onError) onError(err)
    }
  })

  // Return a cancel function
  return () => {
    if (!finished) {
      finished = true
      unsubscribe()
    }
  }
}

/** 订阅连接状态变化 */
export function onOpenClawConnectionState(callback) {
  return window.openclawAPI.onConnectionState(callback)
}

/** 获取会话历史，返回标准化消息数组 */
export async function getOpenClawHistory(sessionKey, limit = 50) {
  const res = await window.openclawAPI.getHistory(sessionKey, limit)
  if (!res.ok) throw new Error(res.error || 'Failed to load history')
  return normalizeHistory(res.messages || [])
}

/** 列出所有会话 */
export async function listOpenClawSessions() {
  const res = await window.openclawAPI.listSessions()
  if (!res.ok) throw new Error(res.error || 'Failed to list sessions')
  return res.sessions || []
}

/** 创建新会话 */
export async function createOpenClawSession(label) {
  const res = await window.openclawAPI.createSession(label)
  if (!res.ok) throw new Error(res.error || 'Failed to create session')
  return res
}

/** 删除会话 */
export async function deleteOpenClawSession(sessionKey) {
  const res = await window.openclawAPI.deleteSession(sessionKey)
  if (!res.ok) throw new Error(res.error || 'Failed to delete session')
  return res
}

/** 重命名会话 */
export async function renameOpenClawSession(sessionKey, label) {
  const res = await window.openclawAPI.renameSession(sessionKey, label)
  if (!res.ok) throw new Error(res.error || 'Failed to rename session')
  return res
}

/** 中止当前运行 */
export async function abortOpenClaw(sessionKey, runId) {
  return window.openclawAPI.abort(sessionKey, runId)
}

// --- Normalize history messages to internal format ---

function normalizeHistory(rawMessages) {
  return rawMessages.map((msg) => {
    const contentBlocks = parseContentBlocks(msg.content)
    const textContent = contentBlocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    return {
      id: msg.id || msg.messageId || String(Date.now() + Math.random()),
      type: msg.role === 'user' ? 'user' : 'assistant',
      content: textContent,
      contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
      timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
      model: msg.model,
      sessionKey: msg.sessionKey,
    }
  })
}

function parseContentBlocks(content) {
  if (!content) return []
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  if (!Array.isArray(content)) return []

  return content.map((block) => {
    if (block.type === 'text') return { type: 'text', text: block.text || '' }
    if (block.type === 'thinking') return { type: 'thinking', thinking: block.thinking || '' }
    if (block.type === 'tool_use') return { type: 'toolCall', id: block.id, name: block.name, arguments: block.input || {} }
    if (block.type === 'tool_result') return { type: 'toolResult', id: block.tool_use_id, text: extractToolResultText(block.content) }
    return { type: 'text', text: JSON.stringify(block) }
  })
}

function extractToolResultText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  return ''
}
