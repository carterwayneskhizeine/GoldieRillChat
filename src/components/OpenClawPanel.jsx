import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  sendOpenClawMessage,
  connectOpenClaw,
  onOpenClawConnectionState,
  getOpenClawConfig,
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

function SessionSelector({ sessionKey, onSelect, status }) {
  const [sessions, setSessions] = useState([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (status !== 'connected') return
    try { setSessions(await listOpenClawSessions()) } catch {}
  }, [status])

  useEffect(() => { if (open) load() }, [open, load])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await createOpenClawSession('新会话')
      if (res.sessionKey) onSelect(res.sessionKey)
      setOpen(false)
    } catch {} finally { setCreating(false) }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-xs btn-ghost opacity-60 hover:opacity-100 font-mono"
        onClick={() => setOpen((v) => !v)}
        disabled={status !== 'connected'}
      >
        {(sessionKey || 'main').slice(0, 12)}{sessionKey && sessionKey.length > 12 ? '…' : ''}
        {' '}▾
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 220,
            zIndex: 50, maxHeight: 260, overflowY: 'auto',
          }}
          className="bg-base-100 border border-base-300 rounded-lg shadow-lg"
        >
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-base-200 flex items-center gap-2 font-medium"
            onClick={() => { onSelect('main'); setOpen(false) }}>
            🏠 main（默认）
          </button>
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-base-200 flex items-center gap-2"
            onClick={handleCreate} disabled={creating}>
            ＋ 新建会话
          </button>
          {sessions.length > 0 && <div className="divider my-0" />}
          {sessions.map((s) => (
            <button
              key={s.sessionKey || s.id}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-base-200 ${(s.sessionKey || s.id) === sessionKey ? 'bg-base-200 font-semibold' : ''}`}
              onClick={() => { onSelect(s.sessionKey || s.id); setOpen(false) }}
            >
              {s.label || s.sessionKey || s.id}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OpenClawPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionKey, setSessionKey] = useState('main')
  const [status, setStatus] = useState('disconnected')
  const cancelRef = useRef(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!window.openclawAPI) return
    const unsub = onOpenClawConnectionState(({ state }) => setStatus(state))
    return () => unsub()
  }, [])

  useEffect(() => {
    const cfg = getOpenClawConfig()
    if (cfg.url && status === 'disconnected') {
      setStatus('connecting')
      connectOpenClaw(cfg).catch(() => setStatus('disconnected'))
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = useCallback(() => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setMessages([])
  }, [])

  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || status !== 'connected') return
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
  }, [input, sessionKey, status])

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
        <SessionSelector sessionKey={sessionKey} onSelect={setSessionKey} status={status} />
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
        <button className="btn btn-xs btn-ghost opacity-60 hover:opacity-100" onClick={handleNewChat}>
          ＋ 新对话
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
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
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area — matches AIChat InputArea */}
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
