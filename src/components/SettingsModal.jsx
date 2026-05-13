import React from 'react'
import useUIStore from '../stores/useUIStore'
import { handleSelectFolder } from './folderHandlers'
import { handleUpdateFolders } from './folderUpdateHandlers'
import { toggleTheme, themes } from './themeHandlers'

export function SettingsPanelContent({
  storagePath,
  setStoragePath,
  currentConversation,
  messages,
  setConversations,
  setCurrentConversation,
  onClose,
}) {
  const { currentTheme, setCurrentTheme } = useUIStore()

  return (
    <div className="settings-modal settings-sidebar-panel">
      <button onClick={onClose} className="close-btn" type="button">
        ✕
      </button>

      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Storage</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg">Folder</h3>
              <div className="flex flex-col items-center gap-2">
                <button
                  className="shader-btn save-btn"
                  onClick={() =>
                    handleSelectFolder(
                      setStoragePath,
                      currentConversation,
                      messages,
                      window,
                      setConversations,
                      setCurrentConversation
                    )
                  }
                >
                  Modify Folder
                </button>
                <span className="text-sm opacity-70 text-center">
                  {storagePath || 'No folder selected'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-lg">Update</h3>
              <button
                className="shader-btn"
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
                  className="shader-btn"
                >
                  Change Theme
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsModal(props) {
  const { showSettings, setShowSettings } = useUIStore()

  if (!showSettings) return null

  return (
    <div className="modal modal-open settings-modal">
      <div className="modal-box">
        <SettingsPanelContent {...props} onClose={() => setShowSettings(false)} />
      </div>
      <div className="modal-backdrop" onClick={() => setShowSettings(false)} />
    </div>
  )
}
