import React, { useState, useEffect, useRef } from 'react'
import { toggleTheme, themes } from '../themeHandlers'
import { TextareaState } from '../DaisyTextarea'
import useToolStore from '../../stores/useToolStore'
import useUIStore from '../../stores/useUIStore'
import BrowserControls from './BrowserControls'
import AIChatControls from './AIChatControls'
import WindowControls from './WindowControls'

export default function TitleBar({
  currentUrl, setCurrentUrl, isLoading,
  onAddBookmark, onToggleBookmarksPanel, showBookmarksPanel,
  activeTabId, selectedModel, setSelectedModel, availableModels,
  currentConversation, selectedProvider, temperature, setTemperature,
  maxTokens, setMaxTokens
}) {
  const { activeTool, switchTool } = useToolStore()
  const { currentTheme, setCurrentTheme, sidebarOpen } = useUIStore()
  const [isImageBackground, setIsImageBackground] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [iconPath, setIconPath] = useState(null)

  useEffect(() => {
    // Initialize bubble background class
    const isChatBubbleSolid = localStorage.getItem('chat-bubble-solid') === 'true'
    if (isChatBubbleSolid) document.documentElement.classList.add('chat-bubble-solid')
    else document.documentElement.classList.remove('chat-bubble-solid')
  }, [])

  useEffect(() => {
    window.electron.window.isMaximized().then(setIsMaximized)
    setIconPath('app-resource://favicon.png')

    const unsubscribe = window.electron.window.onMaximizedStateChanged(setIsMaximized)

    const handleBackgroundModeChange = (event) => {
      if (event.detail?.isImageBackground !== undefined) setIsImageBackground(event.detail.isImageBackground)
    }
    if (window.isImageBackgroundMode !== undefined) setIsImageBackground(window.isImageBackgroundMode)
    window.addEventListener('backgroundModeChange', handleBackgroundModeChange)

    return () => {
      unsubscribe()
      window.removeEventListener('backgroundModeChange', handleBackgroundModeChange)
    }
  }, [])

  const handleToggleTheme = async () => {
    try { await toggleTheme(currentTheme, themes, setCurrentTheme) }
    catch (error) { console.error('切换主题失败:', error) }
  }

  const navBtnStyle = {
    WebkitAppRegion: 'no-drag', transition: 'all 0.3s ease',
    borderRadius: '4px', height: '26px', minHeight: '26px', lineHeight: '1'
  }

  const navBtnHover = (e) => {
    e.currentTarget.style.color = 'rgb(255, 215, 0)'
    e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)'
    e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)'
    e.currentTarget.style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.6)'
  }
  const navBtnOut = (e) => {
    e.currentTarget.style.color = ''
    e.currentTarget.style.borderColor = ''
    e.currentTarget.style.backgroundColor = ''
    e.currentTarget.style.textShadow = ''
  }

  const getTitleStyle = () => ({
    color: '#bababa',
    textShadow: '0px 0px 3px rgba(0, 0, 0, 0.7), 0px 0px 5px rgba(255, 215, 0, 0.5)',
    fontSize: '0.95rem', fontWeight: 'medium', display: 'inline-block',
    padding: '2px 6px', borderRadius: '4px',
    backgroundColor: currentTheme === 'bg-theme' ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
    opacity: 1, position: 'relative', zIndex: 5
  })

  return (
    <div className="h-11 flex items-center bg-base-300 select-none" style={{ WebkitAppRegion: 'drag' }}>
      {/* Logo + nav + notes */}
      <div className="flex items-center px-3 gap-3 w-[260px]">
        <div style={{
          position: 'relative', zIndex: 100, display: 'flex', alignItems: 'center',
          padding: isImageBackground ? '4px 16px 4px 4px' : '3px', margin: isImageBackground ? '3px 0' : '0',
          borderRadius: '6px', backdropFilter: isImageBackground ? 'blur(4px)' : 'none',
          WebkitBackdropFilter: isImageBackground ? 'blur(4px)' : 'none',
          border: isImageBackground ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
          transform: isImageBackground ? 'translateX(3px)' : 'none',
        }}>
          <img src={iconPath} alt="logo" className="w-5 h-5" style={{
            filter: isImageBackground ? 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.8)) brightness(1.2)' : 'none',
          }} />
          <span className="text-sm font-semibold ml-2" style={{
            color: isImageBackground ? 'white' : 'inherit',
            textShadow: isImageBackground ? '0px 0px 3px rgba(0, 0, 0, 0.8)' : 'none',
            fontWeight: isImageBackground ? '600' : 'inherit',
          }}>
            GoldieRillChat
          </span>
        </div>

        {!sidebarOpen && (
          <div className="flex items-center ml-3 gap-2">
            <button className="btn btn-ghost px-1.5" onClick={() => switchTool('prev')}
              style={navBtnStyle} title="Previous" onMouseOver={navBtnHover} onMouseOut={navBtnOut}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="btn btn-ghost px-1.5" onClick={() => switchTool('next')}
              style={navBtnStyle} title="Next" onMouseOver={navBtnHover} onMouseOut={navBtnOut}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center ml-3 gap-2">
          <button className="btn btn-ghost px-1.5" onClick={() => TextareaState.toggleVisibility()}
            style={{ ...navBtnStyle, zIndex: 5 }} title="Notes (Ctrl + Q)"
            onMouseOver={navBtnHover} onMouseOut={navBtnOut}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
              <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2" />
              <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2" />
              <line x1="7" y1="16" x2="12" y2="16" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center area */}
      <div className="flex-1 flex justify-center items-center">
        {activeTool === 'browser' ? (
          <BrowserControls
            currentUrl={currentUrl} setCurrentUrl={setCurrentUrl}
            isLoading={isLoading} activeTabId={activeTabId}
            onAddBookmark={onAddBookmark} onToggleBookmarksPanel={onToggleBookmarksPanel}
            showBookmarksPanel={showBookmarksPanel}
          />
        ) : activeTool === 'aichat' ? (
          <AIChatControls
            isImageBackground={isImageBackground}
            currentConversation={currentConversation}
            selectedModel={selectedModel} setSelectedModel={setSelectedModel}
            availableModels={availableModels} selectedProvider={selectedProvider}
            temperature={temperature} setTemperature={setTemperature}
            maxTokens={maxTokens} setMaxTokens={setMaxTokens}
          />
        ) : (activeTool === 'chat' || activeTool === 'monaco' || activeTool === 'threejs-shaders') ? (
          <div className="w-full flex items-center">
            <div className="flex-1 h-full flex items-center justify-center">
              <h2 className="text-sm text-center font-medium" style={getTitleStyle()}>
                {currentConversation?.name || 'Current session'}
              </h2>
            </div>
          </div>
        ) : null}
      </div>

      {/* Window controls */}
      <WindowControls isMaximized={isMaximized} onToggleTheme={handleToggleTheme} />
    </div>
  )
}
