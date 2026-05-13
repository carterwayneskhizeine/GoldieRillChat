import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { sendHermesMessage, checkHermesHealth } from '../services/hermesService'

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

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
      <div className={`chat-bubble ${isUser ? '' : 'chat-bubble-neutral'} max-w-[80%]`}>
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        ) : (
          <>
            {msg.toolProgress && msg.toolProgress.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {msg.toolProgress.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.6 }}>
                    <span>{p.emoji || '⚙️'}</span>
                    <span>{p.label || p.tool}</span>
                    {p.status === 'running' && <span className="loading loading-dots loading-xs" />}
                  </div>
                ))}
              </div>
            )}
            {msg.generating && !msg.content ? (
              <span className="loading loading-dots loading-sm" />
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function HermesPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [healthy, setHealthy] = useState(false)
  const cancelRef = useRef(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

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

    const history = messages
      .filter((m) => !m.generating)
      .map((m) => ({ role: m.role, content: m.content || '' }))

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content }
    const assistantId = `a_${Date.now()}`
    const assistantMsg = { id: assistantId, role: 'assistant', content: '', generating: true, toolProgress: [] }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    let buffer = ''
    const toolProgress = []

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
        toolProgress.push(p)
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, toolProgress: [...toolProgress] } : m))
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header bar — matches BackendSwitcher style */}
      <div className="flex-none flex items-center gap-3 px-4 py-2 border-b border-base-300/50">
        <StatusDot healthy={healthy} />
        <span className="text-sm font-semibold opacity-80">Hermes Agent</span>
        {sessionId && (
          <span className="text-xs opacity-30 font-mono truncate max-w-[120px]" title={sessionId}>
            {sessionId.slice(0, 12)}…
          </span>
        )}
        <div className="flex-1" />
        <button className="btn btn-xs btn-ghost opacity-60 hover:opacity-100" onClick={handleNewChat}>
          ＋ 新对话
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
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
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area — matches AIChat InputArea exactly */}
      <div className="flex-none border-t border-base-300 p-4 bg-transparent">
        <div className="relative max-w-[770px] mx-auto">
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
