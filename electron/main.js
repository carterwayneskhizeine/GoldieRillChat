const { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage, BrowserView } = require('electron')
const { shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const BrowserLikeWindow = require('electron-as-browser')

let mainWindow = null
let browserWindow = null

// 添加侧边栏状态变量
let sidebarWidth = 0

// 添加标签页管理相关变量
let tabs = new Map()
let activeTabId = null

// 设置应用 ID 和图标
if (process.platform === 'win32') {
  app.setAppUserModelId('com.goldie.chat')
}

// 获取图标路径
function getIconPath() {
  const iconPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../resources/GoldieRillicon.ico')
    : path.join(process.resourcesPath, 'GoldieRillicon.ico')
  
  // 添加日志输出
  console.log('Icon path:', iconPath)
  console.log('Icon exists:', require('fs').existsSync(iconPath))
  
  return iconPath
}

// Register file protocol
app.whenReady().then(() => {
  // 设置应用程序图标
  const iconPath = getIconPath()
  try {
    const icon = nativeImage.createFromPath(iconPath)
    app.setIcon(icon)
    console.log('Icon set successfully')
  } catch (error) {
    console.error('Failed to set app icon:', error)
  }

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
    
    // Create the folder
    await fs.mkdir(newFolderPath)
    
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
    const filePath = path.join(folderPath, file.name)
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
    // 创建 RecycleBin 文件夹（在基础目录下）
    const baseDir = path.dirname(folderPath)
    const recycleBinPath = path.join(baseDir, 'RecycleBin')
    try {
      await fs.access(recycleBinPath)
    } catch {
      await fs.mkdir(recycleBinPath)
    }

    // 移动文本文件到回收站（如果存在）
    if (message.txtFile) {
      const timestamp = Date.now()
      const recyclePath = path.join(recycleBinPath, `${timestamp}_${message.txtFile.name}`)
      try {
        await fs.access(message.txtFile.path)
        await fs.rename(message.txtFile.path, recyclePath)
      } catch (error) {
        console.error('Failed to move txt file:', error)
      }
    }

    // 移动附件文件到回收站（如果存在）
    if (message.files && message.files.length > 0) {
      for (const file of message.files) {
        const timestamp = Date.now()
        const fileName = path.basename(file.path)
        const recyclePath = path.join(recycleBinPath, `${timestamp}_${fileName}`)
        try {
          await fs.access(file.path)
          await fs.rename(file.path, recyclePath)
        } catch (error) {
          console.error('Failed to move file:', error)
        }
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

// Add open file location method
ipcMain.handle('openFileLocation', async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath)
    return true
  } catch (error) {
    console.error('Failed to open file location:', error)
    throw error
  }
})

// 添加扫描文件夹的方法
ipcMain.handle('scanFolders', async (event, basePath) => {
  try {
    // 获取基础目录下的所有文件和文件夹
    const items = await fs.readdir(basePath, { withFileTypes: true })
    
    // 只处理文件夹，排除 RecycleBin
    const folders = items.filter(item => 
      item.isDirectory() && item.name !== 'RecycleBin'
    )
    
    // 处理每个文件夹
    const processedFolders = await Promise.all(folders.map(async folder => {
      const folderPath = path.join(basePath, folder.name)
      const folderContents = await fs.readdir(folderPath, { withFileTypes: true })
      
      // 获取文件夹中的所有文件
      const files = await Promise.all(folderContents
        .filter(item => item.isFile())
        .map(async file => {
          const filePath = path.join(folderPath, file.name)
          const stats = await fs.stat(filePath)
          
          return {
            name: file.name,
            path: filePath,
            type: path.extname(file.name).toLowerCase(),
            size: stats.size,
            timestamp: stats.mtime.toISOString()
          }
        }))
      
      // 读取 messages.json 如果存在
      let messages = []
      try {
        const messagesPath = path.join(folderPath, 'messages.json')
        const messagesContent = await fs.readFile(messagesPath, 'utf8')
        messages = JSON.parse(messagesContent)

        // 获取已存在文件的路径列表
        const existingFilePaths = new Set()
        messages.forEach(msg => {
          if (msg.txtFile) {
            existingFilePaths.add(msg.txtFile.path)
          }
          if (msg.files) {
            msg.files.forEach(file => existingFilePaths.add(file.path))
          }
        })

        // 处理新的文本文件
        const newTxtFiles = files.filter(f => 
          f.type === '.txt' && !existingFilePaths.has(f.path)
        )
        for (const txtFile of newTxtFiles) {
          const content = await fs.readFile(txtFile.path, 'utf8')
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: content,
            timestamp: txtFile.timestamp,
            txtFile: {
              name: txtFile.name,
              displayName: txtFile.name.replace('.txt', ''),
              path: txtFile.path
            }
          })
        }

        // 处理新的媒体文件
        const newMediaFiles = files.filter(f => 
          f.type !== '.txt' && 
          f.type !== '.json' && 
          !existingFilePaths.has(f.path)
        )
        newMediaFiles.forEach(file => {
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: '',
            timestamp: file.timestamp,
            files: [file]
          })
        })

        // 如果有新文件，重新排序并保存
        if (newTxtFiles.length > 0 || newMediaFiles.length > 0) {
          messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          await fs.writeFile(
            path.join(folderPath, 'messages.json'),
            JSON.stringify(messages, null, 2),
            'utf8'
          )
        }
      } catch (error) {
        // 如果 messages.json 不存在，创建新的消息数组
        messages = []
        
        // 处理文本文件
        const txtFiles = files.filter(f => f.type === '.txt')
        for (const txtFile of txtFiles) {
          const content = await fs.readFile(txtFile.path, 'utf8')
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: content,
            timestamp: txtFile.timestamp,
            txtFile: {
              name: txtFile.name,
              displayName: txtFile.name.replace('.txt', ''),
              path: txtFile.path
            }
          })
        }
        
        // 处理媒体文件和其他文件
        const mediaFiles = files.filter(f => f.type !== '.txt' && f.type !== '.json')
        if (mediaFiles.length > 0) {
          // 为每个文件创建独立的消息
          mediaFiles.forEach(file => {
            messages.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              content: '',
              timestamp: file.timestamp,
              files: [file]
            })
          })
        }
        
        // 按时间戳排序消息
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        
        // 保存新的 messages.json
        await fs.writeFile(
          path.join(folderPath, 'messages.json'),
          JSON.stringify(messages, null, 2),
          'utf8'
        )
      }
      
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: folder.name,
        path: folderPath,
        timestamp: new Date().toISOString()
      }
    }))
    
    return processedFolders
  } catch (error) {
    console.error('Failed to scan folders:', error)
    throw error
  }
})

// Create the browser window
function createWindow() {
  const iconPath = getIconPath()
  console.log('Creating window with icon path:', iconPath)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: iconPath
  })

  let browserView = null

  // 修改浏览器视图的可见性处理
  ipcMain.handle('set-browser-view-visibility', (event, visible) => {
    if (visible) {
      if (!browserView) {
        // 创建浏览器视图
        browserView = new BrowserView({
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            scrollBounce: true // 启用弹性滚动
          }
        })

        // 设置事件监听
        browserView.webContents.on('did-start-loading', () => {
          mainWindow.webContents.send('browser-loading', true)
        })

        browserView.webContents.on('did-stop-loading', () => {
          mainWindow.webContents.send('browser-loading', false)
        })

        browserView.webContents.on('did-navigate', (event, url) => {
          mainWindow.webContents.send('browser-url-update', url)
        })

        browserView.webContents.on('page-title-updated', (event, title) => {
          mainWindow.webContents.send('browser-title-update', title)
        })

        // 加载初始页面
        browserView.webContents.loadURL('https://www.google.com')
      }

      mainWindow.setBrowserView(browserView)
      updateBrowserViewBounds()
    } else {
      mainWindow.setBrowserView(null)
    }
  })

  // 添加标签页相关的 IPC 处理
  ipcMain.handle('browser-new-tab', async (event, url = 'https://www.google.com') => {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })

    const id = view.webContents.id
    tabs.set(id, {
      id,
      url,
      title: '新标签页',
      isLoading: false,
      canGoBack: false,
      canGoForward: false
    })

    view.webContents.loadURL(url)

    // 设置事件监听
    view.webContents.on('did-start-loading', () => {
      const tab = tabs.get(id)
      if (tab) {
        tab.isLoading = true
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
      }
    })

    view.webContents.on('did-stop-loading', () => {
      const tab = tabs.get(id)
      if (tab) {
        tab.isLoading = false
        tab.canGoBack = view.webContents.canGoBack()
        tab.canGoForward = view.webContents.canGoForward()
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
      }
    })

    view.webContents.on('page-title-updated', (event, title) => {
      const tab = tabs.get(id)
      if (tab) {
        tab.title = title
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
      }
    })

    view.webContents.on('did-navigate', (event, url) => {
      const tab = tabs.get(id)
      if (tab) {
        tab.url = url
        tab.canGoBack = view.webContents.canGoBack()
        tab.canGoForward = view.webContents.canGoForward()
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
      }
    })

    // 切换到新标签页
    activeTabId = id
    mainWindow.setBrowserView(view)
    updateBrowserViewBounds()
    mainWindow.webContents.send('browser-active-tab-update', id)
    mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))

    return id
  })

  ipcMain.handle('browser-close-tab', (event, tabId) => {
    const view = BrowserView.fromWebContents(BrowserView.getAllWebContents().find(wc => wc.id === tabId))
    if (view) {
      if (activeTabId === tabId) {
        // 找到下一个要激活的标签页
        const tabIds = Array.from(tabs.keys())
        const currentIndex = tabIds.indexOf(tabId)
        const nextId = tabIds[currentIndex - 1] || tabIds[currentIndex + 1]
        
        if (nextId) {
          activeTabId = nextId
          const nextView = BrowserView.fromWebContents(BrowserView.getAllWebContents().find(wc => wc.id === nextId))
          mainWindow.setBrowserView(nextView)
          updateBrowserViewBounds()
          mainWindow.webContents.send('browser-active-tab-update', nextId)
        } else {
          activeTabId = null
          mainWindow.setBrowserView(null)
        }
      }
      
      tabs.delete(tabId)
      view.webContents.destroy()
      mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
    }
  })

  ipcMain.handle('browser-switch-tab', (event, tabId) => {
    const view = BrowserView.fromWebContents(BrowserView.getAllWebContents().find(wc => wc.id === tabId))
    if (view) {
      activeTabId = tabId
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()
      mainWindow.webContents.send('browser-active-tab-update', tabId)
    }
  })

  // 修改浏览器视图的大小和位置计算
  function updateBrowserViewBounds() {
    const view = mainWindow.getBrowserView()
    if (!view) return

    const bounds = mainWindow.getBounds()
    const contentBounds = mainWindow.getContentBounds()
    
    // 计算顶部工具栏的高度（包括标题栏和控制栏）
    const titleBarHeight = bounds.height - contentBounds.height
    const controlBarHeight = 55 // 浏览器控制栏和标题栏的总高度
    
    // 设置浏览器视图的边界，考虑侧边栏宽度和滚动条空间
    view.setBounds({ 
      x: 10 + sidebarWidth, // 10px 是侧边栏切换条的宽度
      y: titleBarHeight + controlBarHeight,
      width: bounds.width - (10 + sidebarWidth + 15), // 减去侧边栏宽度、切换条宽度和滚动条宽度(15px)
      height: bounds.height - (titleBarHeight + controlBarHeight + 60) // 减去底部滚动条高度(15px)
    })

    // 设置自动调整大小选项
    view.setAutoResize({
      width: true,
      height: true,
      horizontal: true,
      vertical: true
    })
  }

  // 监听窗口大小变化
  mainWindow.on('resize', () => {
    if (mainWindow.getBrowserView()) {
      updateBrowserViewBounds()
    }
  })

  // 修改侧边栏状态
  ipcMain.handle('update-sidebar-width', (event, width) => {
    sidebarWidth = width
    if (mainWindow && mainWindow.getBrowserView()) {
      updateBrowserViewBounds()
    }
  })

  // 处理浏览器相关的 IPC 消息
  ipcMain.handle('browser-navigate', async (event, url) => {
    if (!browserView) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    browserView.webContents.loadURL(url)
  })

  ipcMain.handle('browser-back', () => {
    if (browserView && browserView.webContents.canGoBack()) {
      browserView.webContents.goBack()
    }
  })

  ipcMain.handle('browser-forward', () => {
    if (browserView && browserView.webContents.canGoForward()) {
      browserView.webContents.goForward()
    }
  })

  ipcMain.handle('browser-refresh', () => {
    if (browserView) {
      browserView.webContents.reload()
    }
  })

  // 加载主应用
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open the DevTools in development.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // 主窗口关闭时清理资源
  mainWindow.on('closed', () => {
    browserView = null
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