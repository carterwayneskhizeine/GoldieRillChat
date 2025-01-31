import React from 'react'

export const BrowserTabs = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }) => {
  return (
    <div className="w-[200px] flex-none flex flex-col overflow-hidden">
      {/* 标签列表 */}
      <div className="flex-1 overflow-y-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-base-100 ${
              activeTabId === tab.id ? 'bg-base-100' : ''
            }`}
            onClick={() => onTabClick(tab.id)}
          >
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
            <div className="flex-1 truncate text-sm">
              {tab.title || '新标签页'}
            </div>
            <button
              className="opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* 新建标签页按钮 */}
      <div className="p-2 border-t border-base-content/10">
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