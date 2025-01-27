const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron')
const path = require('path')
const fs = require('fs').promises

let mainWindow = null

// Register file protocol
app.whenReady().then(() => {
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const filePath = request.url.replace('local-file://', '')
    callback(decodeURI(filePath))
  })
})

// Handle folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  
  if (!result.canceled) {
    return result.filePaths[0]
  }
  return null
})

// Create new chat folder
ipcMain.handle('create-chat-folder', async (event, basePath) => {
  try {
    // Get list of existing chat folders
    const files = await fs.readdir(basePath)
    const chatFolders = files.filter(f => f.startsWith('NewChat'))
    
    // Find the next available number
    let maxNumber = 0
    chatFolders.forEach(folder => {
      const match = folder.match(/NewChat(\d+)/)
      if (match) {
        const num = parseInt(match[1])
        maxNumber = Math.max(maxNumber, num)
      }
    })
    
    // Create new folder name
    const newFolderName = `NewChat${maxNumber + 1}`
    const newFolderPath = path.join(basePath, newFolderName)
    
    // Create the folder and files subfolder
    await fs.mkdir(newFolderPath)
    await fs.mkdir(path.join(newFolderPath, 'files'))
    
    return {
      path: newFolderPath,
      name: newFolderName
    }
  } catch (error) {
    console.error('Failed to create chat folder:', error)
    throw error
  }
})

// Save file to chat folder
ipcMain.handle('save-file', async (event, folderPath, file) => {
  try {
    const filesDir = path.join(folderPath, 'files')
    
    // Create files directory if it doesn't exist
    try {
      await fs.access(filesDir)
    } catch {
      await fs.mkdir(filesDir)
    }
    
    const filePath = path.join(filesDir, file.name)
    await fs.writeFile(filePath, Buffer.from(file.data))
    
    return {
      name: file.name,
      path: filePath
    }
  } catch (error) {
    console.error('Failed to save file:', error)
    throw error
  }
})

// Save messages to file
ipcMain.handle('save-messages', async (event, folderPath, conversationId, messages) => {
  try {
    const filePath = path.join(folderPath, `messages.json`)
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf8')
    return true
  } catch (error) {
    console.error('Failed to save messages:', error)
    throw error
  }
})

// Load messages from file
ipcMain.handle('load-messages', async (event, folderPath, conversationId) => {
  try {
    const filePath = path.join(folderPath, `messages.json`)
    const data = await fs.readFile(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    console.error('Failed to load messages:', error)
    throw error
  }
})

// Save message as txt file
ipcMain.handle('save-message-as-txt', async (event, folderPath, message) => {
  try {
    // Use existing filename if it exists, otherwise generate new one
    const fileName = message.txtFile?.displayName 
      ? `${message.txtFile.displayName}.txt`
      : `message_${message.id}.txt`
    
    const filePath = path.join(folderPath, fileName)
    await fs.writeFile(filePath, message.content, 'utf8')
    return {
      name: fileName,
      displayName: fileName.replace('.txt', ''),
      path: filePath
    }
  } catch (error) {
    console.error('Failed to save message as txt:', error)
    throw error
  }
})

// Load message from txt file
ipcMain.handle('load-message-txt', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return content
  } catch (error) {
    console.error('Failed to load message txt:', error)
    throw error
  }
})

// Rename message file
ipcMain.handle('rename-message-file', async (event, folderPath, oldFileName, newFileName) => {
  try {
    const oldPath = path.join(folderPath, `${oldFileName}.txt`)
    const newPath = path.join(folderPath, `${newFileName}.txt`)

    // Check if target file exists (for merging)
    try {
      await fs.access(newPath)
      // If file exists, read both files
      const oldContent = await fs.readFile(oldPath, 'utf8')
      const newContent = await fs.readFile(newPath, 'utf8')
      // Merge contents
      await fs.writeFile(newPath, `${newContent}\n\n${oldContent}`, 'utf8')
      // Delete old file
      await fs.unlink(oldPath)
      return {
        name: `${newFileName}.txt`,
        displayName: newFileName,
        path: newPath,
        merged: true
      }
    } catch {
      // If file doesn't exist, just rename
      await fs.rename(oldPath, newPath)
      return {
        name: `${newFileName}.txt`,
        displayName: newFileName,
        path: newPath,
        merged: false
      }
    }
  } catch (error) {
    console.error('Failed to rename message file:', error)
    throw error
  }
})

// Move file to recycle bin
ipcMain.handle('move-to-recycle', async (event, folderPath, fileName) => {
  try {
    // Create recycle bin folder if it doesn't exist
    const recycleBinPath = path.join(folderPath, '..', 'RecycleBin')
    try {
      await fs.access(recycleBinPath)
    } catch {
      await fs.mkdir(recycleBinPath)
    }

    // Move file to recycle bin with timestamp prefix to avoid name conflicts
    const timestamp = new Date().getTime()
    const recyclePath = path.join(recycleBinPath, `${timestamp}_${fileName}`)
    
    const oldPath = path.join(folderPath, fileName)
    await fs.rename(oldPath, recyclePath)
    
    return true
  } catch (error) {
    console.error('Failed to move file to recycle bin:', error)
    throw error
  }
})

// Delete message
ipcMain.handle('delete-message', async (event, folderPath, message) => {
  try {
    // Create recycle bin folder if it doesn't exist
    const recycleBinPath = path.join(folderPath, '..', 'RecycleBin')
    try {
      await fs.access(recycleBinPath)
    } catch {
      await fs.mkdir(recycleBinPath)
    }

    // Move text file to recycle bin if exists
    if (message.txtFile) {
      const timestamp = new Date().getTime()
      const recyclePath = path.join(recycleBinPath, `${timestamp}_${message.txtFile.name}`)
      const oldPath = path.join(folderPath, message.txtFile.name)
      await fs.rename(oldPath, recyclePath)
    }

    // Move image files to recycle bin if exists
    if (message.files && message.files.length > 0) {
      for (const file of message.files) {
        const timestamp = new Date().getTime()
        const oldPath = file.path
        const fileName = path.basename(file.path)
        const recyclePath = path.join(recycleBinPath, `${timestamp}_${fileName}`)
        await fs.rename(oldPath, recyclePath)
      }
    }

    return true
  } catch (error) {
    console.error('Failed to delete message:', error)
    throw error
  }
})

// Rename file (for both text and image files)
ipcMain.handle('renameFile', async (event, folderPath, oldFileName, newFileName, subDir = '') => {
  try {
    const targetDir = subDir ? path.join(folderPath, subDir) : folderPath
    const oldPath = path.join(targetDir, oldFileName)
    const newPath = path.join(targetDir, newFileName)

    // Check if target file exists
    try {
      await fs.access(newPath)
      throw new Error('文件名已存在')
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, proceed with rename
        await fs.rename(oldPath, newPath)
        return {
          name: newFileName,
          path: newPath
        }
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to rename file:', error)
    throw error
  }
})

// Move folder to recycle bin
ipcMain.handle('move-folder-to-recycle', async (event, folderPath) => {
  try {
    // Create recycle bin folder if it doesn't exist
    const recycleBinPath = path.join(path.dirname(folderPath), 'RecycleBin')
    try {
      await fs.access(recycleBinPath)
    } catch {
      await fs.mkdir(recycleBinPath)
    }

    // Move folder to recycle bin with timestamp prefix
    const timestamp = new Date().getTime()
    const folderName = path.basename(folderPath)
    const recyclePath = path.join(recycleBinPath, `${timestamp}_${folderName}`)
    
    await fs.rename(folderPath, recyclePath)
    return true
  } catch (error) {
    console.error('Failed to move folder to recycle bin:', error)
    throw error
  }
})

// Rename chat folder
ipcMain.handle('rename-chat-folder', async (event, folderPath, newName) => {
  try {
    const parentDir = path.dirname(folderPath)
    const newPath = path.join(parentDir, newName)

    // Check if target folder exists
    try {
      await fs.access(newPath)
      throw new Error('文件夹名已存在')
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Folder doesn't exist, proceed with rename
        await fs.rename(folderPath, newPath)
        return {
          name: newName,
          path: newPath
        }
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to rename chat folder:', error)
    throw error
  }
})

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Set CSP header
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: local-file:"]
      }
    })
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open the DevTools in development.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

module.exports = {
  createWindow
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
}) 