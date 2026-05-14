import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  sendOpenClawMessage,
  connectOpenClaw,
  onOpenClawConnectionState,
  getOpenClawConfig,
  getOpenClawState,
  getOpenClawHistory,
  listOpenClawSessions,
  createOpenClawSession,
} from '../services/openclawService'

const STATUS_COLOR = { connected: '#22c55e', connecting: '#f59e0b', disconnected: '#6b7280' }

function StatusDot({ status }) {
  return (
    <span
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: STATUS_COLOR[status] || STATUS_COLOR.disconnected,
      }}
      title={`OpenClaw ${status}`}
    />
  )
}

function ThinkingBlock({ text, done }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderLeft: '2px solid rgba(168,85,247,0.4)', paddingLeft: 8, margin: '4px 0', fontSize: 12 }}>
      <button
        style={{ color: 'rgba(168,85,247,0.7)', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={() => setOpen((v) => !v)}
      >
        {done ? '💭 思考过程' : <><span className="loading loading-dots loading-xs" style={{ marginRight: 4 }} />思考中…</>}
        <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ marginTop: 4, opacity: 0.5, whiteSpace: 'pre-wrap' }}>{text}</div>}
    </div>
  )
}

function ToolCallBlock({ name, args }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderLeft: '2px solid rgba(59,130,246,0.4)', paddingLeft: 8, margin: '4px 0', fontSize: 12 }}>
      <button
        style={{ color: 'rgba(59,130,246,0.7)', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={() => setOpen((v) => !v)}
      >
        🔧 {name} <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <pre style={{ marginTop: 4, opacity: 0.5, fontSize: 11, overflowX: 'auto' }}>
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
    </div>
  )
}

function ToolResultBlock({ text }) {
  return (
    <div style={{ borderLeft: '2px solid rgba(34,197,94,0.4)', paddingLeft: 8, margin: '4px 0', fontSize: 12 }}>
      <div style={{ color: 'rgba(34,197,94,0.75)', marginBottom: 4 }}>工具结果</div>
      <pre style={{ margin: 0, opacity: 0.65, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
        {text}
      </pre>
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const blocks = msg.contentBlocks || []

  if (isUser) {
    return (
      <div className="chat chat-end">
        <div className="chat-bubble max-w-[80%]">
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="chat chat-start">
      <div className={`chat-bubble chat-bubble-neutral max-w-[80%] ${msg.error ? 'border border-error' : ''}`}>
        {blocks.length > 0 ? (
          <>
            {blocks.map((b, i) => {
              if (b.type === 'thinking') return <ThinkingBlock key={i} text={b.thinking} done={!msg.generating} />
              if (b.type === 'toolCall') return <ToolCallBlock key={i} name={b.name} args={b.arguments} />
              if (b.type === 'toolResult') return <ToolResultBlock key={i} text={b.text || ''} />
              if (b.type === 'text') return (
                <div key={i} className="prose prose-sm max-w-none">
                  <ReactMarkdown>{b.text || ''}</ReactMarkdown>
                </div>
              )
              return null
            })}
            {msg.generating && <span className="loading loading-dots loading-xs" style={{ marginTop: 4, opacity: 0.4 }} />}
          </>
        ) : msg.generating && !msg.content ? (
          <span className="loading loading-dots loading-sm" />
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OpenClawPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionKey, setSessionKey] = useState('main')
  const [status, setStatus] = useState('disconnected')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const cancelRef = useRef(null)
  const historyRequestRef = useRef(0)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Session list state
  const [sessions, setSessions] = useState([])

  // --- Load session list ---
  const loadSessions = useCallback(async () => {
    if (status !== 'connected') return
    try {
      const list = await listOpenClawSessions()
      setSessions(list || [])
      window.dispatchEvent(new CustomEvent('openclaw-sessions-updated', { detail: { sessions: list || [], activeSessionKey: sessionKey } }))
    } catch {}
  }, [status, sessionKey])

  // --- Expose API to Sidebar ---
  useEffect(() => {
    window.openclawPanel = {
      selectSession: (key) => setSessionKey(key),
      newChat: () => handleNewChat(),
      createSession: async (label) => {
        const res = await createOpenClawSession(label || '新会话')
        const key = res.key || res.sessionKey
        if (key) setSessionKey(key)
        loadSessions()
        return key
      },
      getSessions: () => sessions,
      getSessionKey: () => sessionKey,
      getStatus: () => status,
    }
    return () => { delete window.openclawPanel }
  })

  useEffect(() => {
    if (!window.openclawAPI) return
    const unsub = onOpenClawConnectionState(({ state }) => setStatus(state))
    // Sync initial state from main process, then auto-connect if needed
    getOpenClawState().then(({ state }) => {
      if (state === 'connected') {
        setStatus('connected')
      } else {
        const cfg = getOpenClawConfig()
        if (cfg.url) {
          setStatus('connecting')
          connectOpenClaw(cfg)
            .then((res) => { if (res.ok) setStatus('connected') })
            .catch(() => setStatus('disconnected'))
        }
      }
    }).catch(() => {})
    return () => unsub()
  }, [])

  // Auto-load sessions when connected
  useEffect(() => {
    if (status === 'connected') loadSessions()
  }, [status])

  useEffect(() => {
    if (status !== 'connected') return
    const requestId = ++historyRequestRef.current
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setHistoryLoading(true)
    setHistoryError(null)

    getOpenClawHistory(sessionKey || 'main', 100)
      .then((historyMessages) => {
        if (historyRequestRef.current !== requestId) return
        setMessages(historyMessages)
      })
      .catch((err) => {
        if (historyRequestRef.current !== requestId) return
        setHistoryError(err.message || '加载历史记录失败')
        setMessages([])
      })
      .finally(() => {
        if (historyRequestRef.current === requestId) setHistoryLoading(false)
      })

    window.dispatchEvent(new CustomEvent('openclaw-session-changed', { detail: { sessionKey } }))
  }, [sessionKey, status])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = useCallback(() => {
    historyRequestRef.current += 1
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setHistoryError(null)
    setHistoryLoading(false)
    setMessages([])
    setSessionKey('main')
    window.dispatchEvent(new CustomEvent('openclaw-session-changed', { detail: { sessionKey: 'main' } }))
  }, [])

  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || status !== 'connected') return
    historyRequestRef.current += 1
    setHistoryError(null)
    setHistoryLoading(false)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = '100px'

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content }
    const assistantId = `a_${Date.now()}`
    const assistantMsg = { id: assistantId, role: 'assistant', content: '', contentBlocks: [], generating: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    let textBuffer = ''
    let reasoningBuffer = ''
    const toolCallsMap = {}

    const buildBlocks = () => [
      ...(reasoningBuffer ? [{ type: 'thinking', thinking: reasoningBuffer }] : []),
      ...Object.values(toolCallsMap).map((t) => ({ type: 'toolCall', name: t.name, arguments: t.arguments })),
      ...(textBuffer ? [{ type: 'text', text: textBuffer }] : []),
    ]

    if (cancelRef.current) cancelRef.current()
    cancelRef.current = sendOpenClawMessage({
      sessionKey,
      message: content,
      onChunk: (text, reasoning) => {
        if (reasoning !== undefined) { reasoningBuffer += reasoning }
        else { textBuffer += text }
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, contentBlocks: buildBlocks(), content: textBuffer } : m)
        )
      },
      onToolCall: (tc) => {
        toolCallsMap[tc.id] = tc
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, contentBlocks: buildBlocks() } : m)
        )
      },
      onFinish: () => {
        const final = buildBlocks()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, generating: false, contentBlocks: final.length > 0 ? final : undefined, content: textBuffer }
              : m
          )
        )
        cancelRef.current = null
        loadSessions()
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, generating: false, contentBlocks: undefined, content: textBuffer || `错误: ${err.message}`, error: true }
              : m
          )
        )
        cancelRef.current = null
      },
    })
  }, [input, sessionKey, status, loadSessions])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isConnected = status === 'connected'

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header bar */}
      <div className="flex-none flex items-center gap-3 px-4 py-2 border-b border-base-300/50">
        <StatusDot status={status} />
        <span className="text-sm font-semibold opacity-80">OpenClaw</span>
        <div className="flex-1" />
        {!isConnected && (
          <button
            className="btn btn-xs btn-ghost opacity-60 hover:opacity-100"
            onClick={() => {
              setStatus('connecting')
              connectOpenClaw(getOpenClawConfig()).catch(() => setStatus('disconnected'))
            }}
          >
            重连
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {historyLoading && (
          <div className="flex items-center justify-center h-full opacity-40 text-sm">
            <span className="loading loading-dots loading-sm mr-2" />
            加载历史记录
          </div>
        )}
        {!historyLoading && historyError && (
          <div className="flex items-center justify-center h-full text-error/80 text-sm">
            历史记录加载失败: {historyError}
          </div>
        )}
        {!historyLoading && !historyError && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 select-none pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            <div className="mt-3 text-sm">
              {isConnected ? 'OpenClaw 已连接' : '未连接，请在设置中配置 OpenClaw'}
            </div>
          </div>
        )}
        <div className="space-y-4 max-w-[770px] mx-auto">
          {!historyLoading && !historyError && messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-none border-t border-base-300 p-4 bg-transparent">
        <div className="relative max-w-[770px] mx-auto">
          <textarea
            ref={textareaRef}
            className="textarea textarea-bordered w-full min-h-[100px] max-h-[480px] rounded-3xl resize-none pb-10 bg-transparent scrollbar-hide aichat-input"
            placeholder={isConnected ? 'Send a message...' : 'OpenClaw 未连接'}
            value={input}
            disabled={!isConnected}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = '100px'
              const h = Math.max(e.target.scrollHeight, 100)
              e.target.style.height = `${h}px`
              e.target.style.overflowY = e.target.scrollHeight > 480 ? 'scroll' : 'hidden'
            }}
            onKeyDown={handleKeyDown}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              backgroundColor: 'transparent',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              position: 'relative',
              zIndex: 1,
            }}
            rows={2}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2" style={{ zIndex: 1500 }}>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={handleSend}
              disabled={!isConnected || !input.trim()}
              title="发送消息"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
