"use strict";
const { app, BrowserWindow, ipcMain, dialog, protocol } = require("electron");
const { shell } = require("electron");
const path = require("path");
const fs = require("fs").promises;
let mainWindow = null;
app.whenReady().then(() => {
  protocol.registerFileProtocol("local-file", (request, callback) => {
    const filePath = request.url.replace("local-file://", "");
    callback(decodeURI(filePath));
  });
});
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});
ipcMain.handle("create-chat-folder", async (event, basePath) => {
  try {
    const files = await fs.readdir(basePath);
    const chatFolders = files.filter((f) => f.startsWith("NewChat"));
    let maxNumber = 0;
    chatFolders.forEach((folder) => {
      const match = folder.match(/NewChat(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        maxNumber = Math.max(maxNumber, num);
      }
    });
    const newFolderName = `NewChat${maxNumber + 1}`;
    const newFolderPath = path.join(basePath, newFolderName);
    await fs.mkdir(newFolderPath);
    return {
      path: newFolderPath,
      name: newFolderName
    };
  } catch (error) {
    console.error("Failed to create chat folder:", error);
    throw error;
  }
});
ipcMain.handle("save-file", async (event, folderPath, file) => {
  try {
    const filePath = path.join(folderPath, file.name);
    await fs.writeFile(filePath, Buffer.from(file.data));
    return {
      name: file.name,
      path: filePath
    };
  } catch (error) {
    console.error("Failed to save file:", error);
    throw error;
  }
});
ipcMain.handle("save-messages", async (event, folderPath, conversationId, messages) => {
  try {
    const filePath = path.join(folderPath, `messages.json`);
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Failed to save messages:", error);
    throw error;
  }
});
ipcMain.handle("load-messages", async (event, folderPath, conversationId) => {
  try {
    const filePath = path.join(folderPath, `messages.json`);
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
ipcMain.handle("save-message-as-txt", async (event, folderPath, message) => {
  var _a;
  try {
    const fileName = ((_a = message.txtFile) == null ? void 0 : _a.displayName) ? `${message.txtFile.displayName}.txt` : `message_${message.id}.txt`;
    const filePath = path.join(folderPath, fileName);
    await fs.writeFile(filePath, message.content, "utf8");
    return {
      name: fileName,
      displayName: fileName.replace(".txt", ""),
      path: filePath
    };
  } catch (error) {
    console.error("Failed to save message as txt:", error);
    throw error;
  }
});
ipcMain.handle("load-message-txt", async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content;
  } catch (error) {
    console.error("Failed to load message txt:", error);
    throw error;
  }
});
ipcMain.handle("rename-message-file", async (event, folderPath, oldFileName, newFileName) => {
  try {
    const oldPath = path.join(folderPath, `${oldFileName}.txt`);
    const newPath = path.join(folderPath, `${newFileName}.txt`);
    try {
      await fs.access(newPath);
      const oldContent = await fs.readFile(oldPath, "utf8");
      const newContent = await fs.readFile(newPath, "utf8");
      await fs.writeFile(newPath, `${newContent}

${oldContent}`, "utf8");
      await fs.unlink(oldPath);
      return {
        name: `${newFileName}.txt`,
        displayName: newFileName,
        path: newPath,
        merged: true
      };
    } catch {
      await fs.rename(oldPath, newPath);
      return {
        name: `${newFileName}.txt`,
        displayName: newFileName,
        path: newPath,
        merged: false
      };
    }
  } catch (error) {
    console.error("Failed to rename message file:", error);
    throw error;
  }
});
ipcMain.handle("move-to-recycle", async (event, folderPath, fileName) => {
  try {
    const recycleBinPath = path.join(folderPath, "..", "RecycleBin");
    try {
      await fs.access(recycleBinPath);
    } catch {
      await fs.mkdir(recycleBinPath);
    }
    const timestamp = (/* @__PURE__ */ new Date()).getTime();
    const recyclePath = path.join(recycleBinPath, `${timestamp}_${fileName}`);
    const oldPath = path.join(folderPath, fileName);
    await fs.rename(oldPath, recyclePath);
    return true;
  } catch (error) {
    console.error("Failed to move file to recycle bin:", error);
    throw error;
  }
});
ipcMain.handle("delete-message", async (event, folderPath, message) => {
  try {
    const baseDir = path.dirname(folderPath);
    const recycleBinPath = path.join(baseDir, "RecycleBin");
    try {
      await fs.access(recycleBinPath);
    } catch {
      await fs.mkdir(recycleBinPath);
    }
    if (message.txtFile) {
      const timestamp = Date.now();
      const recyclePath = path.join(recycleBinPath, `${timestamp}_${message.txtFile.name}`);
      try {
        await fs.access(message.txtFile.path);
        await fs.rename(message.txtFile.path, recyclePath);
      } catch (error) {
        console.error("Failed to move txt file:", error);
      }
    }
    if (message.files && message.files.length > 0) {
      for (const file of message.files) {
        const timestamp = Date.now();
        const fileName = path.basename(file.path);
        const recyclePath = path.join(recycleBinPath, `${timestamp}_${fileName}`);
        try {
          await fs.access(file.path);
          await fs.rename(file.path, recyclePath);
        } catch (error) {
          console.error("Failed to move file:", error);
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Failed to delete message:", error);
    throw error;
  }
});
ipcMain.handle("renameFile", async (event, folderPath, oldFileName, newFileName, subDir = "") => {
  try {
    const targetDir = subDir ? path.join(folderPath, subDir) : folderPath;
    const oldPath = path.join(targetDir, oldFileName);
    const newPath = path.join(targetDir, newFileName);
    try {
      await fs.access(newPath);
      throw new Error("文件名已存在");
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.rename(oldPath, newPath);
        return {
          name: newFileName,
          path: newPath
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("Failed to rename file:", error);
    throw error;
  }
});
ipcMain.handle("move-folder-to-recycle", async (event, folderPath) => {
  try {
    const recycleBinPath = path.join(path.dirname(folderPath), "RecycleBin");
    try {
      await fs.access(recycleBinPath);
    } catch {
      await fs.mkdir(recycleBinPath);
    }
    const timestamp = (/* @__PURE__ */ new Date()).getTime();
    const folderName = path.basename(folderPath);
    const recyclePath = path.join(recycleBinPath, `${timestamp}_${folderName}`);
    await fs.rename(folderPath, recyclePath);
    return true;
  } catch (error) {
    console.error("Failed to move folder to recycle bin:", error);
    throw error;
  }
});
ipcMain.handle("rename-chat-folder", async (event, folderPath, newName) => {
  try {
    const parentDir = path.dirname(folderPath);
    const newPath = path.join(parentDir, newName);
    try {
      await fs.access(newPath);
      throw new Error("文件夹名已存在");
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.rename(folderPath, newPath);
        return {
          name: newName,
          path: newPath
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("Failed to rename chat folder:", error);
    throw error;
  }
});
ipcMain.handle("openFileLocation", async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath);
    return true;
  } catch (error) {
    console.error("Failed to open file location:", error);
    throw error;
  }
});
ipcMain.handle("scanFolders", async (event, basePath) => {
  try {
    const items = await fs.readdir(basePath, { withFileTypes: true });
    const folders = items.filter(
      (item) => item.isDirectory() && item.name !== "RecycleBin"
    );
    const processedFolders = await Promise.all(folders.map(async (folder) => {
      const folderPath = path.join(basePath, folder.name);
      const folderContents = await fs.readdir(folderPath, { withFileTypes: true });
      const files = await Promise.all(folderContents.filter((item) => item.isFile()).map(async (file) => {
        const filePath = path.join(folderPath, file.name);
        const stats = await fs.stat(filePath);
        return {
          name: file.name,
          path: filePath,
          type: path.extname(file.name).toLowerCase(),
          size: stats.size,
          timestamp: stats.mtime.toISOString()
        };
      }));
      let messages = [];
      try {
        const messagesPath = path.join(folderPath, "messages.json");
        const messagesContent = await fs.readFile(messagesPath, "utf8");
        messages = JSON.parse(messagesContent);
      } catch (error) {
        messages = [];
        const txtFiles = files.filter((f) => f.type === ".txt");
        for (const txtFile of txtFiles) {
          const content = await fs.readFile(txtFile.path, "utf8");
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content,
            timestamp: txtFile.timestamp,
            txtFile: {
              name: txtFile.name,
              displayName: txtFile.name.replace(".txt", ""),
              path: txtFile.path
            }
          });
        }
        const otherFiles = files.filter((f) => f.type !== ".txt");
        if (otherFiles.length > 0) {
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: "",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            files: otherFiles
          });
        }
        await fs.writeFile(
          path.join(folderPath, "messages.json"),
          JSON.stringify(messages, null, 2),
          "utf8"
        );
      }
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: folder.name,
        path: folderPath,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }));
    return processedFolders;
  } catch (error) {
    console.error("Failed to scan folders:", error);
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
      webSecurity: false,
      preload: path.join(__dirname, "preload.js")
    }
  });
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: local-file:"]
      }
    });
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
