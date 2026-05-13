import React, { useState } from 'react'
import { MarkdownRenderer } from '../../shared/MarkdownRenderer'
import '../styles/contentBlocks.css'

// 思考过程块（紫色，默认折叠）
export function ThinkingBlock({ thinking }) {
  const [collapsed, setCollapsed] = useState(true)
  if (!thinking) return null
  return (
    <div className="content-block content-block--thinking">
      <button
        className="content-block__header"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="content-block__icon">🧠</span>
        <span className="content-block__title">思考过程</span>
        <span className="content-block__toggle">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <pre className="content-block__body content-block__body--thinking">{thinking}</pre>
      )}
    </div>
  )
}

// 工具调用块（蓝色）
export function ToolCallBlock({ id, name, arguments: args }) {
  const [collapsed, setCollapsed] = useState(false)
  const displayName = name?.replace(/^call_\w+__/, '') || name || '工具调用'
  let argsText = ''
  try {
    argsText = typeof args === 'string' ? args : JSON.stringify(args, null, 2)
  } catch {
    argsText = String(args)
  }
  return (
    <div className="content-block content-block--tool-call">
      <button
        className="content-block__header"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="content-block__icon">🔧</span>
        <span className="content-block__title">{displayName}</span>
        <span className="content-block__toggle">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && argsText && (
        <pre className="content-block__body content-block__body--code">{argsText}</pre>
      )}
    </div>
  )
}

// 工具结果块（绿色）
export function ToolResultBlock({ id, name, text }) {
  const [collapsed, setCollapsed] = useState(false)
  const displayName = name || '执行结果'
  return (
    <div className="content-block content-block--tool-result">
      <button
        className="content-block__header"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="content-block__icon">✅</span>
        <span className="content-block__title">{displayName}</span>
        <span className="content-block__toggle">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <pre className="content-block__body content-block__body--result">{text || ''}</pre>
      )}
    </div>
  )
}

// 流式推理实时显示
export function StreamingReasoningBlock({ text }) {
  if (!text) return null
  return (
    <div className="content-block content-block--thinking content-block--streaming">
      <div className="content-block__header">
        <span className="content-block__icon">🧠</span>
        <span className="content-block__title">正在思考…</span>
        <span className="content-block__dot-anim" />
      </div>
      <pre className="content-block__body content-block__body--thinking">{text}</pre>
    </div>
  )
}

/**
 * 渲染 contentBlocks 数组
 * blocks: Array<{ type, text?, thinking?, id?, name?, arguments?, text? }>
 * markdownRenderer: 可选的自定义文本渲染组件（默认用 MarkdownRenderer）
 */
export function ContentBlockList({ blocks, isStreaming, streamingReasoning, openInBrowserTab }) {
  if (!blocks || blocks.length === 0) return null

  return (
    <div className="content-block-list">
      {isStreaming && streamingReasoning && (
        <StreamingReasoningBlock text={streamingReasoning} />
      )}
      {blocks.map((block, idx) => {
        if (block.type === 'thinking') {
          return <ThinkingBlock key={idx} thinking={block.thinking} />
        }
        if (block.type === 'toolCall') {
          return <ToolCallBlock key={idx} id={block.id} name={block.name} arguments={block.arguments} />
        }
        if (block.type === 'toolResult') {
          return <ToolResultBlock key={idx} id={block.id} name={block.name} text={block.text} />
        }
        if (block.type === 'text' && block.text) {
          return (
            <div key={idx} className="content-block-text">
              <MarkdownRenderer content={block.text} openInBrowserTab={openInBrowserTab} />
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
