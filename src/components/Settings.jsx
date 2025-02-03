import React from 'react'

export default function Settings({
  showSettings,
  setShowSettings,
  storagePath,
  setStoragePath,
  currentTheme,
  currentConversation,
  messages,
  conversations,
  setConversations,
  handleSelectFolder,
  handleUpdateFolders,
  toggleTheme,
  themes
}) {
  if (!showSettings) return null

  return (
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
                <h3 className="text-lg">Folder</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-70">{storagePath || 'No folder selected'}</span>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleSelectFolder(setStoragePath, currentConversation, messages, window)}
                  >
                    Modify Folder
                  </button>
                </div>
              </div>
            
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Update</h3>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleUpdateFolders(storagePath, setConversations, window)}
                >
                  Update Folders
                </button>
              </div>

              <div className="divider"></div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg">Theme</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-70">{currentTheme}</span>
                  <button 
                    onClick={() => toggleTheme(currentTheme, themes, setCurrentTheme)} 
                    className="btn btn-primary"
                  >
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
  )
} 