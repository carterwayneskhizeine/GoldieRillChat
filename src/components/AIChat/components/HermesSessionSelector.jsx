import React from 'react'

export function HermesSessionSelector({ currentSessionId, onSessionChange, isHealthy }) {
  if (!isHealthy) {
    return <div className="px-2 py-1 text-xs text-error/70">Hermes 未连接</div>
  }

  const label = currentSessionId ? currentSessionId.slice(0, 10) + '…' : '新聊天'

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-xs text-base-content/60 truncate max-w-[140px]" title={currentSessionId || ''}>
        {label}
      </span>
      <button
        className="btn btn-xs btn-ghost text-xs"
        onClick={() => onSessionChange && onSessionChange(null)}
        title="开始新聊天（清除当前会话 ID）"
      >
        ＋ 新聊天
      </button>
    </div>
  )
}
