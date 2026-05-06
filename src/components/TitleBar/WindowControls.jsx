import React from 'react'

const btnBaseStyle = {
  position: 'relative', width: '32px', height: '32px', borderRadius: '16px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.15)',
  color: 'rgba(255, 255, 255, 0.8)', fontSize: '18px', fontWeight: '300',
  transition: 'all 0.3s ease', padding: '0', minHeight: '32px', cursor: 'pointer',
  WebkitAppRegion: 'no-drag'
}

const hoverStyle = {
  backgroundColor: 'rgba(255, 215, 0, 0.2)', borderColor: 'rgba(255, 215, 0, 0.3)',
  color: 'white'
}

function WindowButton({ onClick, title, children, rotateOnHover }) {
  const handleOver = (e) => {
    Object.assign(e.currentTarget.style, hoverStyle)
    if (rotateOnHover) e.currentTarget.style.transform = rotateOnHover
  }
  const handleOut = (e) => {
    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
    if (rotateOnHover) e.currentTarget.style.transform = 'rotate(0deg)'
  }

  return (
    <button className="btn btn-ghost btn-xs" onClick={onClick} title={title}
      style={btnBaseStyle} onMouseOver={handleOver} onMouseOut={handleOut}>
      {children}
    </button>
  )
}

export default function WindowControls({ isMaximized, onToggleTheme }) {
  return (
    <div className="flex items-center space-x-2 mr-1" style={{ WebkitAppRegion: 'no-drag' }}>
      <WindowButton onClick={onToggleTheme} title="切换主题" rotateOnHover="rotate(180deg)">∞</WindowButton>
      <WindowButton onClick={() => window.electron.window.minimize()} title="最小化" rotateOnHover="rotate(180deg)">─</WindowButton>
      <WindowButton onClick={() => window.electron.window.maximize()} title={isMaximized ? '还原' : '最大化'} rotateOnHover="rotate(180deg)">
        {isMaximized ? '❐' : '□'}
      </WindowButton>
      <WindowButton onClick={() => window.electron.window.close()} title="关闭" rotateOnHover="rotate(90deg)">✕</WindowButton>
      <div style={{ width: '8px', height: '32px', opacity: 0, pointerEvents: 'none', WebkitAppRegion: 'drag' }} />
    </div>
  )
}
