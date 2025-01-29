const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')

contextBridge.exposeInMainWorld('electron', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  createChatFolder: (basePath) => ipcRenderer.invoke('create-chat-folder', basePath),
  saveFile: (folderPath, file) => ipcRenderer.invoke('save-file', folderPath, file),
  saveMessageAsTxt: (folderPath, message) => ipcRenderer.invoke('save-message-as-txt', folderPath, message),
  renameMessageFile: (folderPath, oldFileName, newFileName) => 
    ipcRenderer.invoke('rename-message-file', folderPath, oldFileName, newFileName),
  renameFile: (folderPath, oldFileName, newFileName, subDir) =>
    ipcRenderer.invoke('renameFile', folderPath, oldFileName, newFileName, subDir),
  renameChatFolder: (folderPath, newName) =>
    ipcRenderer.invoke('rename-chat-folder', folderPath, newName),
  loadMessageTxt: (filePath) => ipcRenderer.invoke('load-message-txt', filePath),
  saveMessages: (folderPath, conversationId, messages) => 
    ipcRenderer.invoke('save-messages', folderPath, conversationId, messages),
  loadMessages: (folderPath, conversationId) => 
    ipcRenderer.invoke('load-messages', folderPath, conversationId),
  moveToRecycle: (folderPath, fileName) =>
    ipcRenderer.invoke('move-to-recycle', folderPath, fileName),
  moveFolderToRecycle: (folderPath) =>
    ipcRenderer.invoke('move-folder-to-recycle', folderPath),
  deleteMessage: (folderPath, message) =>
    ipcRenderer.invoke('delete-message', folderPath, message),
  openFileLocation: (filePath) => ipcRenderer.invoke('openFileLocation', filePath),
  scanFolders: (basePath) => ipcRenderer.invoke('scanFolders', basePath),
  path: {
    basename: (filePath) => path.basename(filePath),
    dirname: (filePath) => path.dirname(filePath),
    extname: (filePath) => path.extname(filePath),
    join: (...paths) => path.join(...paths)
  },

  // 浏览器相关的方法
  browser: {
    setVisibility: (visible) => ipcRenderer.invoke('set-browser-view-visibility', visible),
    updateSidebarWidth: (width) => ipcRenderer.invoke('update-sidebar-width', width),
    navigate: (url) => ipcRenderer.invoke('browser-navigate', url),
    back: () => ipcRenderer.invoke('browser-back'),
    forward: () => ipcRenderer.invoke('browser-forward'),
    refresh: () => ipcRenderer.invoke('browser-refresh'),
    onUrlUpdate: (callback) => {
      const subscription = (_event, url) => callback(url)
      ipcRenderer.on('browser-url-update', subscription)
      return () => ipcRenderer.removeListener('browser-url-update', subscription)
    },
    onLoading: (callback) => {
      const subscription = (_event, loading) => callback(loading)
      ipcRenderer.on('browser-loading', subscription)
      return () => ipcRenderer.removeListener('browser-loading', subscription)
    },
    onTitleUpdate: (callback) => {
      const subscription = (_event, title) => callback(title)
      ipcRenderer.on('browser-title-update', subscription)
      return () => ipcRenderer.removeListener('browser-title-update', subscription)
    },
    removeListener: (channel) => {
      ipcRenderer.removeAllListeners(channel)
    },
    setSettingsVisibility: (visible) => ipcRenderer.invoke('set-settings-visibility', visible),
    onCheckVisibility: (callback) => {
      const subscription = (_event) => callback()
      ipcRenderer.on('check-browser-visibility', subscription)
      return () => ipcRenderer.removeListener('check-browser-visibility', subscription)
    }
  }
}) 