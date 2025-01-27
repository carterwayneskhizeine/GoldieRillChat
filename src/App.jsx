import React from 'react'

export default function App() {
  return (
    <div className="flex h-screen bg-[#343541]">
      {/* 侧边栏 */}
      <div className="w-64 bg-[#202123] text-white p-2 flex flex-col">
        {/* 新建聊天按钮 */}
        <button className="border border-gray-600 rounded-md p-3 text-sm hover:bg-gray-700 flex items-center gap-3">
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          新建聊天
        </button>

        {/* 聊天历史列表 */}
        <div className="flex-1 mt-2 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {/* 示例聊天记录 */}
            <button className="text-sm text-gray-300 hover:bg-gray-700 rounded-lg p-3 text-left flex items-center gap-3">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" className="h-4 w-4" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              今天
            </button>
          </div>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <div className="h-12 border-b border-gray-600 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-white">ChatGPT 4.0</span>
          </div>
          <button className="text-white hover:bg-gray-700 p-2 rounded-md">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
        </div>

        {/* 聊天内容区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-4 px-6">
            {/* AI消息 */}
            <div className="flex gap-4 p-4 text-gray-100 bg-[#444654]">
              <div className="w-8 h-8 bg-[#10a37f] rounded-full flex items-center justify-center">
                <svg stroke="currentColor" fill="none" strokeWidth="1.5" viewBox="0 0 24 24" className="h-6 w-6 text-white" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="flex-1">
                Hey! What's up? 😊
              </div>
            </div>
          </div>
        </div>

        {/* 底部输入框 */}
        <div className="border-t border-gray-600 p-4">
          <div className="max-w-3xl mx-auto relative">
            <input 
              type="text" 
              placeholder="发送消息..."
              className="w-full bg-[#40414f] text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
