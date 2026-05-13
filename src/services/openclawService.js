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

/** 查询当前连接状态（不触发连接） */
export async function getOpenClawState() {
  return window.openclawAPI.getState()
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
        if (block.type === 'text' && onChunk) onChunk(sanitizeOpenClawText(block.text || ''))
        if (block.type === 'thinking' && onChunk) onChunk('', sanitizeOpenClawText(block.thinking || ''))
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
      if (onError) onError(new Error(event.error || event.errorMessage || state))
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
  return normalizeSessions(res.sessions || [])
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
    if (isToolResultMessage(msg)) return null

    const contentBlocks = parseContentBlocks(msg.content)
    const textContent = contentBlocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    const role = msg.role === 'user' ? 'user' : 'assistant'
    const timestamp = typeof msg.timestamp === 'number'
      ? msg.timestamp
      : msg.createdAt
        ? new Date(msg.createdAt).getTime()
        : Date.now()

    return {
      id: msg.id || msg.messageId || String(Date.now() + Math.random()),
      role,
      type: role,
      content: textContent,
      contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
      timestamp,
      model: msg.model,
      sessionKey: msg.sessionKey,
    }
  }).filter(Boolean)
}

function parseContentBlocks(content) {
  if (!content) return []
  if (typeof content === 'string') return [{ type: 'text', text: sanitizeOpenClawText(content) }]
  if (!Array.isArray(content)) return []

  return content.map((block) => {
    if (block.type === 'text') return { type: 'text', text: sanitizeOpenClawText(block.text || '') }
    if (block.type === 'thinking') return { type: 'thinking', thinking: sanitizeOpenClawText(block.thinking || '') }
    if (block.type === 'tool_use' || block.type === 'toolCall') {
      return { type: 'toolCall', id: block.id, name: block.name, arguments: block.input || block.arguments || {} }
    }
    if (block.type === 'tool_result' || block.type === 'toolResult') return null
    return { type: 'text', text: JSON.stringify(block) }
  }).filter(Boolean)
}

function extractToolResultText(content) {
  if (typeof content === 'string') return sanitizeOpenClawText(content)
  if (Array.isArray(content)) return sanitizeOpenClawText(content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'))
  return ''
}

function sanitizeOpenClawText(text) {
  if (typeof text !== 'string' || !text) return ''
  return text
    // Standard ANSI/VT escape sequences, e.g. "\x1b[32;1m".
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
    // Defensive cleanup for strings where ESC was already stripped before render.
    .replace(/\[(?:\d{1,3}(?:;\d{1,3})*)m/g, '')
}

function isToolResultMessage(msg) {
  return msg?.role === 'toolResult' || msg?.role === 'tool' || Boolean(msg?.toolCallId)
}

function normalizeSessions(sessions) {
  return sessions.map((session) => {
    const key = session.key || session.sessionKey || session.id
    return {
      ...session,
      key,
      sessionKey: session.sessionKey || key,
      id: session.id || key,
    }
  }).filter((session) => session.key)
}
