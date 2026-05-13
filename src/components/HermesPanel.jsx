import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { sendHermesMessage, checkHermesHealth, listHermesSessions, getHermesHistory } from '../services/hermesService'

const SLASH_COMMANDS = [
  { name: 'new', description: '开始新会话（清空当前对话）', hint: '' },
]

function SlashCommandMenu({ commands, activeIndex, onSelect }) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (commands.length === 0) return null

  return (
    <div
      style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8, maxHeight: 280, overflowY: 'auto', zIndex: 200 }}
      className="bg-base-100 border border-base-300 rounded-2xl shadow-xl"
    >
      {commands.map((cmd, i) => (
        <button
          key={cmd.name}
          ref={i === activeIndex ? activeRef : null}
          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${i === activeIndex ? 'bg-base-200' : 'hover:bg-base-200/60'}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(cmd) }}
        >
          <span className="font-mono font-semibold opacity-90 shrink-0">/{cmd.name}</span>
          {cmd.hint && <span className="text-xs opacity-40 shrink-0">{cmd.hint}</span>}
          <span className="text-xs opacity-50 ml-auto truncate">{cmd.description}</span>
        </button>
      ))}
    </div>
  )
}

function SystemMessage({ lines }) {
  return (
    <div style={{ margin: '8px 0', padding: '10px 14px', borderLeft: '3px solid rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.06)', borderRadius: '0 10px 10px 0', fontSize: 13 }}>
      {lines.map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre-wrap', opacity: line.startsWith('✦') ? 0.45 : 0.8, marginTop: i > 0 && line && !lines[i - 1] ? 6 : 0 }}>
          {line}
        </div>
      ))}
    </div>
  )
}

function StatusDot({ healthy }) {
  return (
    <span
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: healthy ? '#22c55e' : '#6b7280',
      }}
      title={healthy ? 'Hermes 已连接' : 'Hermes 未连接'}
    />
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
          {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
        </pre>
      )}
    </div>
  )
}

function MessageBubble({ msg }) {
  if (msg.role === 'system') return <SystemMessage lines={msg.lines || [msg.content]} />

  const isUser = msg.role === 'user'
  const blocks = msg.contentBlocks || []

  return (
    <div className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
      <div className={`chat-bubble ${isUser ? '' : 'chat-bubble-neutral'} max-w-[80%] ${msg.error ? 'border border-error' : ''}`}>
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        ) : (
          <>
            {/* Live tool progress (streaming) */}
            {msg.toolProgress && msg.toolProgress.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {msg.toolProgress.map((p, i) => (
                  <div key={i} style={{ borderLeft: '2px solid rgba(59,130,246,0.3)', paddingLeft: 8, margin: '3px 0', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}>
                      <span>{p.emoji || '🔧'}</span>
                      <span style={{ fontWeight: 500 }}>{p.tool}</span>
                      {p.status === 'running'
                        ? <span className="loading loading-dots loading-xs" />
                        : <span style={{ opacity: 0.5 }}>✓</span>}
                    </div>
                    {p.label && <div style={{ opacity: 0.5, fontSize: 11, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{p.label}</div>}
                  </div>
                ))}
              </div>
            )}
            {/* History contentBlocks (tool calls stored in session) */}
            {blocks.length > 0 && blocks.map((b, i) => {
              if (b.type === 'toolCall') return <ToolCallBlock key={i} name={b.name} args={b.arguments} />
              if (b.type === 'text') return (
                <div key={i} className="prose prose-sm max-w-none">
                  <ReactMarkdown>{b.text || ''}</ReactMarkdown>
                </div>
              )
              return null
            })}
            {/* Plain text content (streaming or simple history) */}
            {blocks.length === 0 && (
              msg.generating && !msg.content
                ? <span className="loading loading-dots loading-sm" />
                : <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
                  </div>
            )}
            {blocks.length > 0 && msg.generating && (
              <span className="loading loading-dots loading-xs" style={{ marginTop: 4, opacity: 0.4 }} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SessionSelector({ sessionId, onSelect, healthy }) {
  const [sessions, setSessions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!healthy) return
    setLoading(true)
    try {
      const res = await listHermesSessions(30, 0)
      setSessions(res.sessions || [])
    } catch {} finally { setLoading(false) }
  }, [healthy])

  useEffect(() => { if (open) load() }, [open, load])

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts)
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-xs btn-ghost opacity-60 hover:opacity-100 font-mono"
        onClick={() => setOpen((v) => !v)}
        disabled={!healthy}
      >
        {sessionId ? sessionId.slice(0, 10) + '…' : '历史会话'} ▾
      </button>
      {open && (
        <div
          style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 260, zIndex: 50, maxHeight: 300, overflowY: 'auto' }}
          className="bg-base-100 border border-base-300 rounded-lg shadow-lg"
        >
          <button
            className="w-full text-left px-3 py-2 text-xs hover:bg-base-200 flex items-center gap-2 font-medium"
            onClick={() => { onSelect(null); setOpen(false) }}
          >
            ＋ 新对话
          </button>
          {loading && <div className="px-3 py-2 text-xs opacity-40">加载中…</div>}
          {sessions.length > 0 && <div className="divider my-0" />}
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-base-200 ${s.id === sessionId ? 'bg-base-200 font-semibold' : ''}`}
              onClick={() => { onSelect(s.id); setOpen(false) }}
            >
              <div className="truncate">{s.title || s.preview || s.id}</div>
              <div className="opacity-40 mt-0.5">{formatTime(s.last_active)} · {s.message_count ?? '?'} 条</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HermesPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [healthy, setHealthy] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const cancelRef = useRef(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const slashFilter = useMemo(() => {
    if (!input.startsWith('/')) return null
    if (input.includes(' ')) return null
    return input.slice(1).toLowerCase()
  }, [input])

  const filteredCommands = useMemo(() => {
    if (slashFilter === null) return []
    const cmds = SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(slashFilter))
    setActiveCommandIndex(0)
    return cmds
  }, [slashFilter])

  const handleSelectCommand = useCallback((cmd) => {
    const newVal = `/${cmd.name}${cmd.hint ? ' ' : ' '}`
    setInput(newVal)
    setActiveCommandIndex(0)
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const ok = await checkHermesHealth()
      if (!cancelled) setHealthy(ok)
    }
    check()
    const t = setInterval(check, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectSession = useCallback(async (id) => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setSessionId(id)
    setMessages([])
    if (!id) return
    setLoadingHistory(true)
    try {
      const history = await getHermesHistory(id)
      setMessages(history)
    } catch {} finally { setLoadingHistory(false) }
  }, [])

  const handleNewChat = useCallback(() => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setSessionId(null)
    setMessages([])
  }, [])

  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || !healthy) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = '100px'

    if (content === '/new') {
      if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
      setSessionId(null)
      setMessages([{
        id: `sys_${Date.now()}`,
        role: 'system',
        lines: ['✨ Session reset! Starting fresh.'],
      }])
      return
    }

    const history = messages
      .filter((m) => !m.generating && m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content || '' }))

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content }
    const assistantId = `a_${Date.now()}`
    const assistantMsg = { id: assistantId, role: 'assistant', content: '', generating: true, toolProgress: [] }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    let buffer = ''
    const toolProgressMap = {}

    if (cancelRef.current) cancelRef.current()
    cancelRef.current = sendHermesMessage({
      sessionId,
      conversationHistory: history,
      userMessage: content,
      model: 'default',
      onChunk: (text) => {
        buffer += text
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: buffer } : m))
        )
      },
      onToolProgress: (p) => {
        const key = p.toolCallId || p.tool || String(Date.now())
        toolProgressMap[key] = { ...(toolProgressMap[key] || {}), ...p }
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, toolProgress: Object.values(toolProgressMap) } : m))
        )
      },
      onFinish: ({ sessionId: newSid }) => {
        if (newSid) setSessionId(newSid)
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, generating: false } : m))
        )
        cancelRef.current = null
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, generating: false, content: buffer || `错误: ${err.message}`, error: true }
              : m
          )
        )
        cancelRef.current = null
      },
    })
  }, [input, messages, sessionId, healthy])

  const handleKeyDown = (e) => {
    if (filteredCommands.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveCommandIndex((i) => Math.max(0, i - 1))
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveCommandIndex((i) => Math.min(filteredCommands.length - 1, i + 1))
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        handleSelectCommand(filteredCommands[activeCommandIndex] || filteredCommands[0])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setInput('')
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header bar */}
      <div className="flex-none flex items-center gap-3 px-4 py-2 border-b border-base-300/50">
        <StatusDot healthy={healthy} />
        <span className="text-sm font-semibold opacity-80">Hermes Agent</span>
        <SessionSelector sessionId={sessionId} onSelect={handleSelectSession} healthy={healthy} />
        <div className="flex-1" />
        <button className="btn btn-xs btn-ghost opacity-60 hover:opacity-100" onClick={handleNewChat}>
          ＋ 新对话
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loadingHistory && (
          <div className="flex items-center justify-center h-full opacity-40">
            <span className="loading loading-spinner loading-md" />
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 select-none pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
            <div className="mt-3 text-sm">
              {healthy ? 'Hermes Agent 已就绪' : '请在设置中配置 Hermes'}
            </div>
          </div>
        )}
        {!loadingHistory && messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area — matches AIChat InputArea exactly */}
      <div className="flex-none border-t border-base-300 p-4 bg-transparent">
        <div className="relative max-w-[770px] mx-auto">
          <SlashCommandMenu
            commands={filteredCommands}
            activeIndex={activeCommandIndex}
            onSelect={handleSelectCommand}
          />
          <textarea
            ref={textareaRef}
            className="textarea textarea-bordered w-full min-h-[100px] max-h-[480px] rounded-3xl resize-none pb-10 bg-transparent scrollbar-hide aichat-input"
            placeholder={healthy ? 'Send a message...' : 'Hermes 未连接，请在设置中配置'}
            value={input}
            disabled={!healthy}
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
              disabled={!healthy || !input.trim()}
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
