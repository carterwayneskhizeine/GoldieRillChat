const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  createChatFolder: (basePath) => ipcRenderer.invoke('create-chat-folder', basePath),
  saveFile: (folderPath, file) => ipcRenderer.invoke('save-file', folderPath, file),
  saveMessages: (folderPath, conversationId, messages) => 
    ipcRenderer.invoke('save-messages', folderPath, conversationId, messages),
  loadMessages: (folderPath, conversationId) => 
    ipcRenderer.invoke('load-messages', folderPath, conversationId)
}) 