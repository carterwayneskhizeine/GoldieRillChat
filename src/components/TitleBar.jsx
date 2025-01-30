import React, { useState, useEffect } from 'react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // 初始化窗口状态
    window.electron.window.isMaximized().then(setIsMaximized)

    // 监听窗口最大化状态变化
    const unsubscribe = window.electron.window.onMaximizedStateChanged((state) => {
      setIsMaximized(state)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <div className="h-8 flex items-center bg-base-300 select-none">
      {/* 应用图标和名称 */}
      <div className="flex items-center px-2 gap-2">
        <img src="/GoldieRillicon.ico" alt="logo" className="w-4 h-4" />
        <span className="text-sm font-semibold">GoldieRillChat</span>
      </div>

      {/* 可拖拽区域 */}
      <div className="flex-1 app-drag-region" />

      {/* 窗口控制按钮 */}
      <div className="flex h-full">
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