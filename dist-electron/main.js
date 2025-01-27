"use strict";
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
let mainWindow = null;
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});
ipcMain.handle("save-messages", async (event, folderPath, conversationId, messages) => {
  try {
    const filePath = path.join(folderPath, `${conversationId}.json`);
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Failed to save messages:", error);
    throw error;
  }
});
ipcMain.handle("load-messages", async (event, folderPath, conversationId) => {
  try {
    const filePath = path.join(folderPath, `${conversationId}.json`);
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    console.error("Failed to load messages:", error);
    throw error;
  }
});
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
module.exports = {
  createWindow
};
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
