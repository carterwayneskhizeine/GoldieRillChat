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