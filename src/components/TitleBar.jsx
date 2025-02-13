import React, { useState, useEffect } from 'react'
import { toggleTheme, themes } from '../components/themeHandlers'

export default function TitleBar({ activeTool, currentUrl, setCurrentUrl, isLoading, currentTheme, setCurrentTheme }) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [iconPath, setIconPath] = useState('')
  const [currentChatName, setCurrentChatName] = useState('')

  useEffect(() => {
    // 初始化窗口状态
    window.electron.window.isMaximized().then(setIsMaximized)

    // 获取图标路径
    const iconName = 'GoldieRillicon.png'
    setIconPath(`app-resource://${iconName}`)

    // 监听窗口最大化状态变化
    const unsubscribe = window.electron.window.onMaximizedStateChanged((state) => {
      setIsMaximized(state)
    })

    // 监听当前会话变化
    const handleStorageChange = () => {
      const savedConversation = localStorage.getItem('aichat_current_conversation');
      if (savedConversation) {
        const conversation = JSON.parse(savedConversation);
        setCurrentChatName(conversation?.name || '');
      }
    };

    // 初始化当前会话名称
    handleStorageChange();

    // 添加 storage 事件监听器
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    }
  }, [])

  return (
    <div className="h-7 flex items-center bg-base-300 select-none app-drag-region">
      {/* 应用图标和名称 */}
      <div className="flex items-center px-2 gap-2 app-drag-region w-[200px]">
        <img src={iconPath} alt="logo" className="w-3.5 h-3.5 app-drag-region" />
        <span className="text-xs font-semibold app-drag-region">GoldieRillChat</span>
      </div>

      {/* 中间区域：浏览器控制栏或聊天标题 */}
      <div className="flex-1 flex justify-center items-center app-drag-region">
        {activeTool === 'browser' ? (
          <div className="w-[600px] flex items-center gap-1 no-drag">
            <div className="join h-5 flex items-center">
              <button 
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.back()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.forward()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button 
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.refresh()}
              >
                {isLoading ? (
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
            <input
              type="text"
              className="input input-xs input-bordered flex-1 h-5 min-h-[20px] px-2 text-xs"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  window.electron.browser.navigate(currentUrl)
                }
              }}
              placeholder="输入网址..."
            />
          </div>
        ) : activeTool === 'browser' ? null : null}
      </div>

      {/* 右侧按钮组 */}
      <div className="flex items-center space-x-2 no-drag">
        {/* 主题切换按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 hover:rounded-none"
          onClick={async () => {
            try {
              await toggleTheme(currentTheme, themes, setCurrentTheme);
            } catch (error) {
              console.error('切换主题失败:', error);
            }
          }}
          title="切换主题"
        >
          ∞
        </button>
        
        {/* 最小化按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 hover:rounded-none"
          onClick={() => window.electron.window.minimize()}
        >
          ─
        </button>

        {/* 最大化按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 hover:rounded-none"
          onClick={() => window.electron.window.maximize()}
        >
          {isMaximized ? '❐' : '□'}
        </button>

        {/* 关闭按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 hover:rounded-none text-base-content hover:bg-error hover:text-error-content"
          onClick={() => window.electron.window.close()}
        >
          ×
        </button>
      </div>
    </div>
  )
} 