import React, { useState, useEffect } from 'react'

const themes = ["light", "dark", "cupcake", "synthwave", "cyberpunk", "valentine", "halloween", "garden", "forest", "lofi", "pastel", "fantasy", "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "coffee", "winter"]

export default function App() {
  const [activeTool, setActiveTool] = useState('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
    localStorage.setItem('theme', currentTheme)
  }, [currentTheme])

  const toggleTheme = () => {
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    setCurrentTheme(themes[nextIndex])
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-base-300 text-base-content p-2 flex flex-col">
        {/* Top buttons row */}
        <div className="flex justify-between mb-2">
          {/* Settings button */}
          <button className="btn btn-circle btn-ghost" onClick={() => setShowSettings(true)}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          {/* New chat button */}
          <button className="btn btn-circle btn-ghost">
            <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Chat history list */}
        <div className="flex-1 mt-2 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <button className="btn btn-ghost justify-start">
              <svg className="h-4 w-4 mr-2" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-base-100">
        {/* Top navigation bar */}
        <div className="navbar bg-base-200">
          <div className="flex-1">
            <div className="tabs tabs-boxed">
              <button 
                onClick={() => setActiveTool('chat')}
                className={`tab ${activeTool === 'chat' ? 'tab-active' : ''}`}
              >
                Chat
              </button>
              <button 
                onClick={() => setActiveTool('editor')}
                className={`tab ${activeTool === 'editor' ? 'tab-active' : ''}`}
              >
                Image Editor
              </button>
            </div>
          </div>
        </div>

        {/* Chat content area */}
        {activeTool === 'chat' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto py-4 px-6">
                {/* Messages will appear here */}
              </div>
            </div>

            {/* Bottom input area */}
            <div className="border-t border-base-300 p-4">
              <div className="max-w-3xl mx-auto relative">
                <div className="join w-full">
                  <button className="btn join-item">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </button>
                  <input 
                    type="text" 
                    placeholder="Send a message..."
                    className="input input-bordered join-item flex-1"
                  />
                  <button className="btn btn-primary join-item">Send</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image editor area */}
        {activeTool === 'editor' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center">
              <p>Image Editor Coming Soon...</p>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button 
              onClick={() => setShowSettings(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Storage</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Storage Location</h3>
                    <button className="btn btn-primary">
                      Select Storage Location
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Update</h3>
                    <button className="btn btn-primary">
                      Update Folders
                    </button>
                  </div>

                  <div className="divider"></div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Theme</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm opacity-70">{currentTheme}</span>
                      <button onClick={toggleTheme} className="btn btn-primary">
                        Change Theme
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowSettings(false)}></div>
        </div>
      )}
    </div>
  )
}
