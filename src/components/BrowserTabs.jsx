import React from 'react'

export const BrowserTabs = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }) => {
  return (
    <div className="flex flex-col h-full">
      {/* 标签列表 - 可滚动区域 */}
      <div className="flex-1 overflow-y-auto mt-2">
        <div className="flex flex-col gap-2">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`btn btn-ghost h-auto py-2 flex-nowrap ${
                activeTabId === tab.id ? 'btn-active' : ''
              }`}
              onClick={() => onTabClick(tab.id)}
            >
              <div className="flex items-center w-full min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-4 h-4 flex-shrink-0">
                    {tab.isLoading ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-base-content border-t-transparent" />
                    ) : tab.favicon ? (
                      <img src={tab.favicon} alt="" className="w-4 h-4" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="truncate block">
                    {tab.title || '新标签页'}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-xs flex-shrink-0 ml-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTabClose(tab.id)
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 新建标签页按钮 - 固定在底部 */}
      <div className="flex-none p-2 border-t border-base-content/10">
        <button
          className="btn btn-ghost btn-sm w-full flex justify-start gap-2"
          onClick={onNewTab}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>新标签页</span>
        </button>
      </div>
    </div>
  )
} 