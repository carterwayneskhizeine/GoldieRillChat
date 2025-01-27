"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");
contextBridge.exposeInMainWorld("electron", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  createChatFolder: (basePath) => ipcRenderer.invoke("create-chat-folder", basePath),
  saveFile: (folderPath, file) => ipcRenderer.invoke("save-file", folderPath, file),
  saveMessageAsTxt: (folderPath, message) => ipcRenderer.invoke("save-message-as-txt", folderPath, message),
  renameMessageFile: (folderPath, oldFileName, newFileName) => ipcRenderer.invoke("rename-message-file", folderPath, oldFileName, newFileName),
  renameFile: (folderPath, oldFileName, newFileName, subDir) => ipcRenderer.invoke("renameFile", folderPath, oldFileName, newFileName, subDir),
  loadMessageTxt: (filePath) => ipcRenderer.invoke("load-message-txt", filePath),
  saveMessages: (folderPath, conversationId, messages) => ipcRenderer.invoke("save-messages", folderPath, conversationId, messages),
  loadMessages: (folderPath, conversationId) => ipcRenderer.invoke("load-messages", folderPath, conversationId),
  moveToRecycle: (folderPath, fileName) => ipcRenderer.invoke("move-to-recycle", folderPath, fileName),
  deleteMessage: (folderPath, message) => ipcRenderer.invoke("delete-message", folderPath, message),
  path: {
    basename: (filePath) => path.basename(filePath),
    dirname: (filePath) => path.dirname(filePath),
    extname: (filePath) => path.extname(filePath),
    join: (...paths) => path.join(...paths)
  }
});
