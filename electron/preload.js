const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveMessages: (folderPath, conversationId, messages) => 
    ipcRenderer.invoke('save-messages', folderPath, conversationId, messages),
  loadMessages: (folderPath, conversationId) => 
    ipcRenderer.invoke('load-messages', folderPath, conversationId)
}) 