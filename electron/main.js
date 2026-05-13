const { app, BrowserWindow, ipcMain, nativeImage, Menu, Tray, globalShortcut } = require('electron')
const { shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const clipboard = require('electron').clipboard

// Shared state
const state = {
  mainWindow: null,
  tabs: new Map(),
  viewMap: new Map(),
  activeTabId: null,
  sidebarWidth: 0,
  tray: null,
  browserWindow: null,
}

// Resolve paths to electron/ source directory (works in both dev and packaged modes)
const electronDir = path.join(__dirname, '..', 'electron')

let STORAGE_KEYS
try { STORAGE_KEYS = require('../src/components/AIChat/constants').STORAGE_KEYS } catch { STORAGE_KEYS = { DASHSCOPE_API_KEY: 'dashscope_api_key' } }

// Set app ID
if (process.platform === 'win32') app.setAppUserModelId('com.goldie.chat')
app.isQuitting = false

// --- Utility functions ---

function getIconPath() {
  let iconPath
  if (process.platform === 'linux') {
    iconPath = process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'resources/GoldieRillIcon.png')
      : path.join(process.resourcesPath, 'GoldieRillIcon.png')
    if (!fsSync.existsSync(iconPath)) iconPath = path.join(__dirname, '../resources/GoldieRillIcon.png')
  } else {
    iconPath = process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'resources/favicon.ico')
      : path.join(process.resourcesPath, 'favicon.ico')
    if (!fsSync.existsSync(iconPath)) iconPath = path.join(__dirname, '../resources/favicon.ico')
  }
  return iconPath
}

async function ensureIconAvailable() {
  if (process.env.NODE_ENV === 'development') {
    const targetDir = path.join(__dirname, '../resources')
    await fs.mkdir(targetDir, { recursive: true })
    for (const file of ['favicon.ico', 'GoldieRillicon.icns', 'GoldieRillIcon.png']) {
      try { await fs.copyFile(path.join(process.cwd(), 'resources', file), path.join(targetDir, file)) } catch {}
    }
  }
}

// --- Create tray ---
function createTray() {
  const iconPath = getIconPath()
  if (!fsSync.existsSync(iconPath)) return
  const tray = new Tray(iconPath)
  if (process.platform === 'linux') tray.setImage(iconPath)
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示', click: () => { if (state.mainWindow) { if (state.mainWindow.isMinimized()) state.mainWindow.restore(); state.mainWindow.show() } } },
    { label: '退出', click: () => {
      app.isQuitting = true
      if (state.mainWindow) { state.mainWindow.removeAllListeners('close'); state.mainWindow.close() }
      if (state.tray) { state.tray.destroy(); state.tray = null }
      app.quit()
    }}
  ])
  tray.setToolTip('GoldieRillChat')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { if (state.mainWindow) { if (state.mainWindow.isMinimized()) state.mainWindow.restore(); if (!state.mainWindow.isVisible()) state.mainWindow.show(); state.mainWindow.focus() } })
  state.tray = tray
}

// --- Create window ---
function createWindow() {
  const iconPath = getIconPath()
  state.mainWindow = new BrowserWindow({
    width: 1270, height: 920, frame: false, transparent: false,
    backgroundColor: '#2e2e2e', icon: iconPath,
    webPreferences: {
      nodeIntegration: true, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      additionalArguments: ['--js-flags=--max-old-space-size=4096'],
    },
    title: 'Goldie Rill Chat'
  })

  // Windows taskbar icon fix
  if (process.platform === 'win32') {
    state.mainWindow.on('ready-to-show', () => {
      state.mainWindow.setOverlayIcon(nativeImage.createEmpty(), '')
      state.mainWindow.setOverlayIcon(null, '')
    })
  }

  // Setup browser view management (tabs, navigation, window controls)
  const setupBrowserView = require(path.join(electronDir, 'browserView'))
  setupBrowserView(state.mainWindow, state)

  // Close behavior: hide to tray instead of quit
  state.mainWindow.on('close', (event) => {
    if (!app.isQuitting) { event.preventDefault(); state.mainWindow.hide(); return false }
    return true
  })

  state.mainWindow.on('closed', () => {
    for (const [, view] of state.viewMap) view.webContents.destroy()
    state.tabs.clear()
    state.viewMap.clear()
    state.mainWindow = null
  })

  // Load app
  if (process.env.VITE_DEV_SERVER_URL) {
    state.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    state.mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Main window context menu
  state.mainWindow.webContents.on('context-menu', (event, params) => {
    const menuTemplate = []
    params.webContents = state.mainWindow.webContents
    if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      params.dictionarySuggestions.forEach(suggestion => {
        menuTemplate.push({ label: suggestion, click: () => { if (params.misspelledWord && params.webContents) params.webContents.replaceMisspelling(suggestion) } })
      })
      menuTemplate.push({ type: 'separator' })
    }
    if (params.selectionText) {
      menuTemplate.push(
        { label: '复制', accelerator: 'CmdOrCtrl+C', click: () => clipboard.writeText(params.selectionText) },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', enabled: params.isEditable, click: () => { if (params.webContents) params.webContents.cut() } },
        { label: `使用谷歌搜索 "${params.selectionText.substring(0, 20)}${params.selectionText.length > 20 ? '...' : ''}"`, click: () => state.mainWindow.webContents.send('show-link-dialog', `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`) },
        { type: 'separator' }
      )
    }
    if (params.isEditable) menuTemplate.push({ label: '粘贴', accelerator: 'CmdOrCtrl+V', click: () => { if (params.webContents) params.webContents.paste() } })
    if (params.mediaType === 'image') {
      menuTemplate.push({ type: 'separator' }, { label: '复制图片', click: () => { if (params.webContents) params.webContents.copyImageAt(params.x, params.y) } }, { label: '复制图片地址', click: () => { if (params.srcURL) clipboard.writeText(params.srcURL) } })
    }
    if (params.linkURL) {
      menuTemplate.push({ type: 'separator' }, { label: '复制链接地址', click: () => clipboard.writeText(params.linkURL) }, { label: '在外部浏览器中打开链接', click: () => shell.openExternal(params.linkURL) })
    }
    menuTemplate.push({ type: 'separator' }, { label: '全选', accelerator: 'CmdOrCtrl+A', click: () => { if (params.webContents) params.webContents.selectAll() } })
    if (process.env.NODE_ENV === 'development') {
      menuTemplate.push({ type: 'separator' }, { label: '检查元素', click: () => { if (params.webContents) params.webContents.inspectElement(params.x, params.y) } })
    }
    Menu.buildFromTemplate(menuTemplate).popup()
  })

  if (process.env.NODE_ENV === 'development') state.mainWindow.webContents.openDevTools()
  createTray()
}

// --- App lifecycle ---
app.whenReady().then(async () => {
  await ensureIconAvailable()

  // Register protocols
  require(path.join(electronDir, 'protocols')).registerProtocols()

  // Register all IPC modules
  require(path.join(electronDir, 'ipc', 'file'))(() => state.mainWindow)
  require(path.join(electronDir, 'ipc', 'fs'))(() => state.mainWindow)
  require(path.join(electronDir, 'ipc', 'conversation'))()
  require(path.join(electronDir, 'ipc', 'media'))()
  require(path.join(electronDir, 'ipc', 'bookmarks'))(() => state.mainWindow)
  require(path.join(electronDir, 'ipc', 'notes'))()
  require(path.join(electronDir, 'ipc', 'liveportrait'))()
  require(path.join(electronDir, 'shaderPresets'))()
  require(path.join(electronDir, 'ipc', 'openclaw'))(() => state.mainWindow)
  require(path.join(electronDir, 'ipc', 'hermes'))(() => state.mainWindow)

  // Dev shortcut
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) focusedWindow.webContents.toggleDevTools()
  })

  createWindow()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
app.on('will-quit', () => { globalShortcut.unregisterAll() })

module.exports = { createWindow }
