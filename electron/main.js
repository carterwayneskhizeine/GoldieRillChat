const { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage, BrowserView, Menu, clipboard } = require('electron')
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

// 添加视图存储
let viewMap = new Map()

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

  // 注册本地文件协议
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const filePath = request.url.replace('local-file://', '')
    callback(decodeURI(filePath))
  })

  // 注册资源文件协议
  protocol.registerFileProtocol('app-resource', (request, callback) => {
    const filePath = request.url.replace('app-resource://', '')
    const resourcePath = app.isPackaged
      ? path.join(process.resourcesPath, filePath)
      : path.join(__dirname, '..', 'resources', filePath)
    callback(resourcePath)
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

// Create AI Chat folder
ipcMain.handle('create-aichat-folder', async (event, basePath) => {
  try {
    // 生成文件夹名称
    const timestamp = new Date();
    const folderName = `${timestamp.getFullYear()}${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}_${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`;
    
    // 创建文件夹
    const folderPath = path.join(basePath, 'aichat', folderName);
    await fs.mkdir(folderPath, { recursive: true });
    
    // 创建空的 messages.json
    await fs.writeFile(
      path.join(folderPath, 'messages.json'),
      '[]',
      'utf8'
    );
    
    return {
      id: Date.now().toString(),
      name: folderName,
      path: folderPath,
      timestamp: timestamp.toISOString()
    };
  } catch (error) {
    console.error('Failed to create AI Chat folder:', error);
    throw error;
  }
});

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
    width: 1270,
    height: 920,
    frame: false,
    transparent: false,
    backgroundColor: '#2e2e2e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      additionalArguments: ['--js-flags=--max-old-space-size=4096'],
    },
    icon: iconPath
  })

  let browserView = null

  // 修改浏览器视图的可见性处理
  ipcMain.handle('set-browser-view-visibility', (event, visible) => {
    if (visible) {
      // 如果有活动的标签页，显示它
      if (activeTabId && viewMap.get(activeTabId)) {
        const view = viewMap.get(activeTabId)
        mainWindow.setBrowserView(view)
        updateBrowserViewBounds()
      }
      // 不再自动创建新标签页
    } else {
      mainWindow.setBrowserView(null)
    }
  })

  // 添加通用的新窗口处理函数
  async function createNewTab(url, options = {}) {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        scrollBounce: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        nativeWindowOpen: true
      }
    })

    const id = view.webContents.id
    tabs.set(id, {
      id,
      url: url || 'about:blank',
      title: '新标签页',
      isLoading: false,
      canGoBack: false,
      canGoForward: false
    })

    // 存储视图引用
    viewMap.set(id, view)

    // 设置事件监听
    view.webContents.on('did-start-loading', () => {
      const tab = tabs.get(id)
      if (tab) {
        tab.isLoading = true
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === activeTabId) {
          mainWindow.webContents.send('browser-loading', true)
        }
      }
    })

    view.webContents.on('did-stop-loading', () => {
      const tab = tabs.get(id)
      if (tab) {
        tab.isLoading = false
        tab.canGoBack = view.webContents.canGoBack()
        tab.canGoForward = view.webContents.canGoForward()
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === activeTabId) {
          mainWindow.webContents.send('browser-loading', false)
        }
      }
    })

    view.webContents.on('page-title-updated', (event, title) => {
      const tab = tabs.get(id)
      if (tab) {
        tab.title = title
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === activeTabId) {
          mainWindow.webContents.send('browser-title-update', title)
        }
      }
    })

    view.webContents.on('did-navigate', (event, url) => {
      const tab = tabs.get(id)
      if (tab) {
        tab.url = url
        tab.canGoBack = view.webContents.canGoBack()
        tab.canGoForward = view.webContents.canGoForward()
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === activeTabId) {
          mainWindow.webContents.send('browser-url-update', url)
        }
      }
    })

    // 处理新窗口打开
    view.webContents.setWindowOpenHandler((details) => {
      createNewTab(details.url, {
        userAgent: details.options?.userAgent,
        features: details.features
      })
      return { action: 'deny' }
    })

    // 加载URL
    try {
      if (options.features) {
        await view.webContents.loadURL(url, {
          userAgent: options.userAgent || view.webContents.getUserAgent()
        })
      } else {
        await view.webContents.loadURL(url)
      }

      // 切换到新标签页
      activeTabId = id
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()
      mainWindow.webContents.send('browser-active-tab-update', id)
      mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
    } catch (error) {
      console.error('Failed to load URL:', error)
    }

    // 添加右键菜单处理
    view.webContents.on('context-menu', (event, params) => {
      const menu = Menu.buildFromTemplate([
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          enabled: params.isEditable || params.selectionText.length > 0,
          click: () => {
            if (params.isEditable) {
              view.webContents.copy()
            } else if (params.selectionText) {
              clipboard.writeText(params.selectionText)
            }
          }
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          enabled: params.isEditable,
          click: () => {
            view.webContents.paste()
          }
        }
      ])
      menu.popup()
    })

    return id
  }

  // 处理新标签页请求
  ipcMain.handle('browser-new-tab', async (event, url = 'about:blank') => {
    const view = await createNewTab(url)
    if (view) {
      // 设置为活动标签页
      activeTabId = view.webContents.id
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()
      mainWindow.webContents.send('browser-active-tab-update', activeTabId)
      
      // 如果提供了 URL，加载它
      if (url && url !== 'about:blank') {
        view.webContents.loadURL(url)
      }
      
      return view.webContents.id
    }
    return null
  })

  // 修改新窗口处理函数
  function handleNewWindow(details) {
    const { url, frameName, features } = details
    createNewTab(url, {
      features,
      userAgent: details.options?.userAgent
    })
    return { action: 'deny' }
  }

  // 为每个新创建的视图添加新窗口处理
  function setupNewWindowHandling(view) {
    view.webContents.setWindowOpenHandler(handleNewWindow)
    
    // 处理target="_blank"链接
    view.webContents.on('new-window', (event, url) => {
      event.preventDefault()
      createNewTab(url)
    })
  }

  // 修改关闭标签页处理
  ipcMain.handle('browser-close-tab', (event, tabId) => {
    const view = viewMap.get(tabId)
    if (view) {
      if (activeTabId === tabId) {
        // 找到下一个要激活的标签页
        const tabIds = Array.from(tabs.keys())
        const currentIndex = tabIds.indexOf(tabId)
        const nextId = tabIds[currentIndex - 1] || tabIds[currentIndex + 1]
        
        if (nextId) {
          activeTabId = nextId
          const nextView = viewMap.get(nextId)
          if (nextView) {
            mainWindow.setBrowserView(nextView)
            updateBrowserViewBounds()
            mainWindow.webContents.send('browser-active-tab-update', nextId)
            
            // 同步新活动标签页的状态
            const tab = tabs.get(nextId)
            if (tab) {
              mainWindow.webContents.send('browser-url-update', tab.url)
              mainWindow.webContents.send('browser-title-update', tab.title)
              mainWindow.webContents.send('browser-loading', tab.isLoading)
            }
          }
        } else {
          activeTabId = null
          mainWindow.setBrowserView(null)
        }
      }
      
      // 清理资源
      tabs.delete(tabId)
      viewMap.delete(tabId)
      view.webContents.destroy()
      mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
    }
  })

  // 修改切换标签页处理
  ipcMain.handle('browser-switch-tab', (event, tabId) => {
    const view = viewMap.get(tabId)
    if (view) {
      activeTabId = tabId
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()

      // 同步当前标签页的状态
      const tab = tabs.get(tabId)
      if (tab) {
        mainWindow.webContents.send('browser-url-update', tab.url)
        mainWindow.webContents.send('browser-title-update', tab.title)
        mainWindow.webContents.send('browser-loading', tab.isLoading)
        mainWindow.webContents.send('browser-active-tab-update', tabId)
      }
    }
  })

  // 修改浏览器视图的大小和位置计算
  function updateBrowserViewBounds() {
    const view = mainWindow.getBrowserView()
    if (!view) return

    const bounds = mainWindow.getBounds()
    const contentBounds = mainWindow.getContentBounds()
    const isMaximized = mainWindow.isMaximized()
    
    // 计算顶部工具栏的高度（包括标题栏和控制栏）
    const titleBarHeight = bounds.height - contentBounds.height
    const controlBarHeight = 28 // 浏览器控制栏的高度
    
    // 设置浏览器视图的边界，考虑侧边栏宽度和滚动条空间
    view.setBounds({ 
      x: 10 + sidebarWidth, // 10px 是侧边栏切换条的宽度
      y: titleBarHeight + controlBarHeight - (isMaximized ? 15 : 0), // 全屏时向上增加15px
      width: bounds.width - (10 + sidebarWidth + (isMaximized ? 15 : 0)), // 全屏时减去滚动条宽度
      height: bounds.height - (titleBarHeight + controlBarHeight) // 全屏时减少15px高度
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

  // 修改浏览器导航处理
  ipcMain.handle('browser-navigate', async (event, url) => {
    const view = mainWindow.getBrowserView()
    if (!view) return

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    try {
      await view.webContents.loadURL(url)
      const tab = tabs.get(activeTabId)
      if (tab) {
        tab.url = url
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
      }
    } catch (error) {
      console.error('Navigation failed:', error)
    }
  })

  ipcMain.handle('browser-back', () => {
    const view = mainWindow.getBrowserView()
    if (view && view.webContents.canGoBack()) {
      view.webContents.goBack()
    }
  })

  ipcMain.handle('browser-forward', () => {
    const view = mainWindow.getBrowserView()
    if (view && view.webContents.canGoForward()) {
      view.webContents.goForward()
    }
  })

  ipcMain.handle('browser-refresh', () => {
    const view = mainWindow.getBrowserView()
    if (view) {
      view.webContents.reload()
    }
  })

  // 添加窗口控制处理程序
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window-close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('is-window-maximized', () => {
    return mainWindow?.isMaximized()
  })

  // 监听窗口最大化状态变化
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-state-changed', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-state-changed', false)
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
    // 清理所有标签页
    for (const [id, view] of viewMap) {
      view.webContents.destroy()
    }
    tabs.clear()
    viewMap.clear()
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

// 在其他 ipcMain.handle 声明附近添加
ipcMain.handle('getResourcePath', (event, fileName) => {
  if (app.isPackaged) {
    // 在打包后的应用中，资源文件位于 resources 目录
    return path.join(process.resourcesPath, fileName)
  } else {
    // 在开发环境中，使用项目根目录下的 resources
    return path.join(__dirname, '..', 'resources', fileName)
  }
})

// Add file system operations
ipcMain.handle('mkdir', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error('Failed to create directory:', error);
    throw error;
  }
});

ipcMain.handle('writeFile', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to write file:', error);
    throw error;
  }
});

ipcMain.handle('access', async (event, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    throw error;
  }
});

// 修改消息存储相关的 IPC 处理程序
ipcMain.handle('save-messages', async (event, conversationPath, conversationId, messages) => {
  try {
    // 确保 messages 是数组
    if (!Array.isArray(messages)) {
      throw new Error('消息必须是数组');
    }

    const messagesPath = path.join(conversationPath, 'messages.json');
    await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存消息失败:', error);
    throw error;
  }
});

ipcMain.handle('load-messages', async (event, conversationPath) => {
  try {
    const messagesPath = path.join(conversationPath, 'messages.json');
    
    // 检查文件是否存在
    try {
      await fs.access(messagesPath);
    } catch (error) {
      // 如果文件不存在，创建一个空的消息数组文件
      await fs.writeFile(messagesPath, '[]', 'utf8');
      return [];
    }

    // 读取消息文件
    const content = await fs.readFile(messagesPath, 'utf8');
    
    // 检查文件内容是否为空
    if (!content.trim()) {
      await fs.writeFile(messagesPath, '[]', 'utf8');
      return [];
    }

    try {
      // 尝试解析 JSON
      const messages = JSON.parse(content);
      // 确保返回的是数组
      if (!Array.isArray(messages)) {
        console.error('消息文件格式错误，重置文件');
        await fs.writeFile(messagesPath, '[]', 'utf8');
        return [];
      }
      return messages;
    } catch (parseError) {
      console.error('JSON 解析失败，重置文件:', parseError);
      await fs.writeFile(messagesPath, '[]', 'utf8');
      return [];
    }
  } catch (error) {
    console.error('加载消息失败:', error);
    throw error;
  }
});

// 添加图片生成相关的 IPC 处理
ipcMain.handle('generate-image', async (event, { prompt, seed, conversationPath, apiKey, apiHost, model = 'black-forest-labs/FLUX.1-schnell', image_size = '1024x576' }) => {
  try {
    // 验证必要参数
    if (!prompt) throw new Error('提示词不能为空');
    if (!apiKey) throw new Error('API Key 不能为空');
    if (!apiHost) throw new Error('API Host 不能为空');
    if (!conversationPath) throw new Error('对话路径不能为空');

    // 确保存在图片存储目录
    const imagesDir = path.join(conversationPath, 'images');
    try {
      await fs.access(imagesDir);
    } catch {
      await fs.mkdir(imagesDir, { recursive: true });
    }

    // 调用 SiliconFlow API
    const response = await fetch(`${apiHost}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        image_size,
        seed: seed || Math.floor(Math.random() * 9999999999)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '图片生成失败');
    }

    const data = await response.json();
    if (!data.images?.[0]?.url) {
      throw new Error('未获取到生成的图片 URL');
    }

    // 下载图片
    const imageUrl = data.images[0].url;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('图片下载失败');
    }

    // 读取图片数据
    const imageBuffer = await imageResponse.arrayBuffer();

    // 生成文件名和保存路径
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `image_${timestamp}.png`;
    const filePath = path.join(imagesDir, fileName);

    // 保存图片到本地
    await fs.writeFile(filePath, Buffer.from(imageBuffer));

    // 返回结果
    return {
      url: imageUrl,
      localPath: filePath,
      fileName: fileName,
      timestamp: timestamp,
      seed: seed || Math.floor(Math.random() * 9999999999)
    };

  } catch (error) {
    console.error('图片生成失败:', error);
    throw new Error(`图片生成失败: ${error.message}`);
  }
}); 