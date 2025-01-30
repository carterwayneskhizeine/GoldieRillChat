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

    // 标签页管理
    newTab: (url) => ipcRenderer.invoke('browser-new-tab', url),
    closeTab: (tabId) => ipcRenderer.invoke('browser-close-tab', tabId),
    switchTab: (tabId) => ipcRenderer.invoke('browser-switch-tab', tabId),

    // 事件监听
    onLoading: (callback) => {
      ipcRenderer.on('browser-loading', (_, loading) => callback(loading))
      return () => ipcRenderer.removeListener('browser-loading', callback)
    },
    onUrlUpdate: (callback) => {
      ipcRenderer.on('browser-url-update', (_, url) => callback(url))
      return () => ipcRenderer.removeListener('browser-url-update', callback)
    },
    onTitleUpdate: (callback) => {
      ipcRenderer.on('browser-title-update', (_, title) => callback(title))
      return () => ipcRenderer.removeListener('browser-title-update', callback)
    },
    onTabsUpdate: (callback) => {
      ipcRenderer.on('browser-tabs-update', (_, tabs) => callback(tabs))
      return () => ipcRenderer.removeListener('browser-tabs-update', callback)
    },
    onActiveTabUpdate: (callback) => {
      ipcRenderer.on('browser-active-tab-update', (_, tabId) => callback(tabId))
      return () => ipcRenderer.removeListener('browser-active-tab-update', callback)
    },
    removeListener: (channel) => {
      ipcRenderer.removeAllListeners(channel)
    }
  },

  // 添加窗口控制接口
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
    onMaximizedStateChanged: (callback) => {
      ipcRenderer.on('window-maximized-state-changed', (_, isMaximized) => callback(isMaximized))
      return () => {
        ipcRenderer.removeListener('window-maximized-state-changed', callback)
      }
    }
  }
}) 