import React, { useState, useEffect } from 'react'

export default function TitleBar({ activeTool, currentUrl, setCurrentUrl, isLoading }) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [iconPath, setIconPath] = useState('')

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

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <div className="h-8 flex items-center bg-base-300 select-none app-drag-region">
      {/* 应用图标和名称 */}
      <div className="flex items-center px-2 gap-2 app-drag-region">
        <img src={iconPath} alt="logo" className="w-4 h-4 app-drag-region" />
        <span className="text-sm font-semibold app-drag-region">GoldieRillChat</span>
      </div>

      {/* 浏览器控制栏 - 只在浏览器工具激活时显示 */}
      {activeTool === 'browser' ? (
        <div className="flex-1 flex justify-center items-center gap-2 px-4 no-drag">
          <div className="join">
            <button 
              className="join-item btn btn-sm btn-ghost"
              onClick={() => window.electron.browser.back()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              className="join-item btn btn-sm btn-ghost"
              onClick={() => window.electron.browser.forward()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button 
              className="join-item btn btn-sm btn-ghost"
              onClick={() => window.electron.browser.refresh()}
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
          </div>
          <input
            type="text"
            className="input input-sm input-bordered flex-1 max-w-lg no-drag"
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
      ) : (
        <div className="flex-1 app-drag-region" />
      )}

      {/* 窗口控制按钮 */}
      <div className="flex h-full no-drag">
        <button
          className="h-full px-4 hover:bg-base-100 flex items-center justify-center"
          onClick={() => window.electron.window.minimize()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          className="h-full px-4 hover:bg-base-100 flex items-center justify-center"
          onClick={() => window.electron.window.maximize()}
        >
          {isMaximized ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
        <button
          className="h-full px-4 hover:bg-error hover:text-white flex items-center justify-center"
          onClick={() => window.electron.window.close()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
} 