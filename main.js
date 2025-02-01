const { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage, BrowserView, session } = require('electron')
const { shell } = require('electron')
const path = require('path')
const fs = require('fs').promises

// 添加浏览器相关变量
let mainWindow = null
let browserView = null
let sidebarWidth = 0

// 设置应用 ID
if (process.platform === 'win32') {
  app.setAppUserModelId('com.goldie.chat')
}

// 禁用安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// Register file protocol
app.whenReady().then(() => {
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      additionalArguments: ['--js-flags=--max-old-space-size=4096'],
    }
  })

  // 设置 CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: local-file: app-resource:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: local-file: app-resource:;"
        ]
      }
    })
  })

  // 创建浏览器视图
  function createBrowserView() {
    // 创建一个新的 session
    const partition = `persist:view-${Date.now()}`
    const browserSession = session.fromPartition(partition)

    // 配置 session
    browserSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = {
        ...details.requestHeaders,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Access-Control-Allow-Origin': '*'
      }
      callback({ requestHeaders: headers })
    })

    // 移除所有安全限制
    browserSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders }
      
      // 删除所有安全相关的头
      Object.keys(headers).forEach(key => {
        if (key.toLowerCase().includes('security') || 
            key.toLowerCase().includes('policy') || 
            key.toLowerCase().includes('frame') || 
            key.toLowerCase().includes('content-type-options')) {
          delete headers[key]
        }
      })
      
      // 添加允许跨域的头
      headers['Access-Control-Allow-Origin'] = ['*']
      headers['Access-Control-Allow-Methods'] = ['*']
      headers['Access-Control-Allow-Headers'] = ['*']
      
      callback({ 
        responseHeaders: {
          ...headers,
          'Content-Security-Policy': ["default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"]
        }
      })
    })

    browserView = new BrowserView({
      webPreferences: {
        session: browserSession,
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: true,
        webviewTag: true,
        images: true,
        javascript: true,
        plugins: true,
        experimentalFeatures: true,
        sandbox: false,
        webgl: true,
        enableWebSQL: true,
        navigateOnDragDrop: true,
        defaultEncoding: 'UTF-8',
        backgroundThrottling: false,
        spellcheck: false,
        safeDialogs: true,
        disableDialogs: false,
        partition: partition
      }
    })

    mainWindow.setBrowserView(browserView)
    updateBrowserViewBounds()

    // 添加开发者工具快捷键
    browserView.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'i') {
        browserView.webContents.toggleDevTools()
      }
    })

    // 默认打开开发者工具
    if (process.env.NODE_ENV === 'development') {
      browserView.webContents.openDevTools({ mode: 'detach' })
    }

    // 处理新窗口打开
    browserView.webContents.setWindowOpenHandler(({ url }) => {
      browserView.webContents.loadURL(url)
      return { action: 'deny' }
    })

    // 允许所有权限
    browserView.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true)
    })

    // 允许所有证书
    browserView.webContents.session.setCertificateVerifyProc((request, callback) => {
      callback(0)
    })
  }

  // 更新浏览器视图的大小和位置
  function updateBrowserViewBounds() {
    if (!browserView) return
    const bounds = mainWindow.getBounds()
    browserView.setBounds({
      x: sidebarWidth,
      y: 30,
      width: bounds.width - sidebarWidth,
      height: bounds.height - 30
    })
    browserView.setAutoResize({ width: true, height: true })
  }

  // 监听窗口大小变化
  mainWindow.on('resize', () => {
    updateBrowserViewBounds()
  })

  // 处理浏览器视图的可见性
  ipcMain.handle('set-browser-view-visibility', (event, visible) => {
    if (visible) {
      if (!browserView) {
        createBrowserView()
      }
      mainWindow.setBrowserView(browserView)
      updateBrowserViewBounds()
    } else {
      mainWindow.setBrowserView(null)
    }
  })

  // 处理浏览器导航
  ipcMain.handle('browser-navigate', async (event, url) => {
    if (!browserView) {
      createBrowserView()
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    try {
      await browserView.webContents.loadURL(url, {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHeaders: 'pragma: no-cache\n'
      })
    } catch (error) {
      console.error('Navigation failed:', error)
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

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 添加 IPC 处理程序
  ipcMain.handle('openExternal', (event, url) => {
    shell.openExternal(url)
  })

  // 更新侧边栏宽度
  ipcMain.handle('update-sidebar-width', (event, width) => {
    sidebarWidth = width
    updateBrowserViewBounds()
  })

  return mainWindow
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
}) 