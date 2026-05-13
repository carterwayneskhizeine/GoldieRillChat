import React from 'react'
import useToolStore from '../stores/useToolStore'
import { tools, getToolDisplayName } from '../config/toolsConfig'
import '../styles/tool-tab-bar.css'

// Lucide-style SVG icons for each tool
const toolIcons = {
  'threejs-shaders': (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  ),
  browser: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  aichat: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" />
    </svg>
  ),
  chat: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  monaco: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
}

// Keyboard shortcut labels
const toolShortcuts = {
  'threejs-shaders': 'Ctrl+1',
  browser: 'Ctrl+2',
  aichat: 'Ctrl+3',
  chat: 'Ctrl+4',
  monaco: 'Ctrl+5',
}

export default function ToolTabBar() {
  const { activeTool, setActiveTool } = useToolStore()

  return (
    <div className="tool-tab-bar">
      <div className="tool-tab-bar-inner">
        {tools.map((tool) => {
          const isActive = activeTool === tool
          return (
            <button
              key={tool}
              className={`tool-tab ${isActive ? 'tool-tab-active' : ''}`}
              onClick={() => setActiveTool(tool)}
              title={`${getToolDisplayName(tool)} (${toolShortcuts[tool] || ''})`}
            >
              <span className="tool-tab-icon">{toolIcons[tool]}</span>
              <span className="tool-tab-label">{getToolDisplayName(tool)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
