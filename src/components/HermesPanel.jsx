import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  sendHermesMessage, checkHermesHealth, listHermesSessions, getHermesHistory,
  getHermesProfiles, saveHermesProfiles, discoverProfiles,
} from '../services/hermesService'

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
            {blocks.length > 0 && blocks.map((b, i) => {
              if (b.type === 'toolCall') return <ToolCallBlock key={i} name={b.name} args={b.arguments} />
              if (b.type === 'text') return (
                <div key={i} className="prose prose-sm max-w-none">
                  <ReactMarkdown>{b.text || ''}</ReactMarkdown>
                </div>
              )
              return null
            })}
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

export default function HermesPanel() {
  const [profiles, setProfiles] = useState(() => {
    const data = getHermesProfiles()
    return data.profiles || []
  })
  const [activeIdx, setActiveIdx] = useState(() => {
    const data = getHermesProfiles()
    return Math.min(data.activeProfileIndex || 0, (data.profiles?.length || 1) - 1)
  })
  const [profileHealth, setProfileHealth] = useState({})

  // Per-profile state (active only, saved/restored on tab switch)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const cancelRef = useRef(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Session list state
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Saved states for inactive tabs
  const savedStates = useRef({})

  const healthy = profileHealth[activeIdx] ?? false
  const activeProfile = profiles[activeIdx]

  // --- Load session list ---
  const loadSessions = useCallback(async () => {
    if (!activeProfile) return
    setSessionsLoading(true)
    try {
      const res = await listHermesSessions(activeProfile, 50, 0)
      const list = res.sessions || []
      setSessions(list)
      window.dispatchEvent(new CustomEvent('hermes-sessions-updated', { detail: { sessions: list, activeSessionId: sessionId } }))
    } catch {} finally { setSessionsLoading(false) }
  }, [activeProfile, sessionId])

  // --- Expose API to Sidebar via window.hermesPanel ---
  useEffect(() => {
    window.hermesPanel = {
      selectSession: (id) => handleSelectSession(id),
      newChat: () => handleNewChat(),
      getSessions: () => sessions,
      getSessionId: () => sessionId,
      getActiveProfile: () => activeProfile,
      getHealthy: () => healthy,
    }
    return () => { delete window.hermesPanel }
  })

  // --- Auto-discover on mount ---
  useEffect(() => {
    const run = async () => {
      const discovered = await discoverProfiles()
      if (discovered.length === 0) return

      const data = getHermesProfiles()
      const existing = data.profiles || []
      let changed = false

      for (const d of discovered) {
        const exists = existing.find((p) => p.id === d.id || p.apiUrl === d.apiUrl)
        if (!exists) {
          existing.push({ ...d, dashboardUrl: '', apiToken: '', dashboardToken: '' })
          changed = true
        }
      }

      if (changed) {
        const updated = { ...data, profiles: existing }
        saveHermesProfiles(updated)
        setProfiles(existing)
      }
    }
    run()
  }, [])

  // --- Health check all profiles ---
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const results = {}
      await Promise.all(profiles.map(async (p, i) => {
        results[i] = await checkHermesHealth(p)
      }))
      if (!cancelled) setProfileHealth(results)
    }
    if (profiles.length > 0) check()
    const t = setInterval(() => { if (profiles.length > 0) check() }, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [profiles])

  // Auto-load sessions when healthy
  useEffect(() => {
    if (healthy) loadSessions()
  }, [healthy, activeProfile])

  // --- Auto-scroll ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // --- Slash commands ---
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

  // --- Tab switching ---
  const switchTab = useCallback((newIdx) => {
    if (newIdx === activeIdx) return
    // Cancel ongoing stream
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    // Save current state
    savedStates.current[activeIdx] = { sessionId, messages, sessions }
    // Load new tab state
    const saved = savedStates.current[newIdx] || { sessionId: null, messages: [], sessions: [] }
    setSessionId(saved.sessionId)
    setMessages(saved.messages)
    setSessions(saved.sessions || [])
    setActiveIdx(newIdx)
    // Persist
    const data = getHermesProfiles()
    data.activeProfileIndex = newIdx
    saveHermesProfiles(data)
  }, [activeIdx, sessionId, messages, sessions])

  // --- Session management ---
  const handleSelectSession = useCallback(async (id) => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setSessionId(id)
    setMessages([])
    window.dispatchEvent(new CustomEvent('hermes-session-changed', { detail: { sessionId: id } }))
    if (!id) return
    setLoadingHistory(true)
    try {
      const history = await getHermesHistory(activeProfile, id)
      setMessages(history)
    } catch {} finally { setLoadingHistory(false) }
  }, [activeProfile])

  const handleNewChat = useCallback(() => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setSessionId(null)
    setMessages([])
    window.dispatchEvent(new CustomEvent('hermes-session-changed', { detail: { sessionId: null } }))
  }, [])

  // --- Send message ---
  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || !healthy || !activeProfile) return
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
      cfg: activeProfile,
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
        loadSessions()
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
  }, [input, messages, sessionId, healthy, activeProfile, loadSessions])

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

  // No profiles configured
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
          </svg>
          <div className="mt-3 text-sm">请在设置中配置 Hermes</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tab bar */}
      {profiles.length > 1 && (
        <div className="flex-none flex items-center border-b border-base-300/50 px-2 gap-0.5">
          {profiles.map((p, i) => (
            <button
              key={p.id || i}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 border-b-2 ${
                i === activeIdx
                  ? 'border-primary text-primary opacity-90'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
              onClick={() => switchTab(i)}
            >
              <StatusDot healthy={profileHealth[i] ?? false} />
              {p.name || p.id || 'Profile'}
            </button>
          ))}
        </div>
      )}

      {/* Header bar */}
      <div className="flex-none flex items-center gap-3 px-4 py-2 border-b border-base-300/50">
        {profiles.length <= 1 && <StatusDot healthy={healthy} />}
        <span className="text-sm font-semibold opacity-80">
          {profiles.length <= 1 ? 'Hermes Agent' : (activeProfile?.name || activeProfile?.id || 'Profile')}
        </span>
        <div className="flex-1" />
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
              {healthy ? 'Hermes Agent 已就绪' : '未连接'}
            </div>
          </div>
        )}
        <div className="space-y-4 max-w-[770px] mx-auto">
          {!loadingHistory && messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
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
