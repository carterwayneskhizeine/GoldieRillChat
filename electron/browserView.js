const { ipcMain, BrowserView, Menu, clipboard, shell } = require('electron')

module.exports = function setupBrowserView(mainWindow, state) {
  const { tabs, viewMap } = state

  function updateBrowserViewBounds() {
    const view = mainWindow.getBrowserView()
    if (!view) return
    const bounds = mainWindow.getBounds()
    const contentBounds = mainWindow.getContentBounds()
    const isMaximized = mainWindow.isMaximized()
    const titleBarHeight = bounds.height - contentBounds.height
    const controlBarHeight = 42
    view.setBounds({
      x: 10 + state.sidebarWidth,
      y: titleBarHeight + controlBarHeight - (isMaximized ? 15 : 0),
      width: bounds.width - (10 + state.sidebarWidth + (isMaximized ? 15 : 0)),
      height: bounds.height - (titleBarHeight + controlBarHeight)
    })
    view.setAutoResize({ width: true, height: true, horizontal: true, vertical: true })
  }

  ipcMain.handle('set-browser-view-visibility', (event, visible) => {
    if (visible) {
      if (state.activeTabId && viewMap.get(state.activeTabId)) {
        const view = viewMap.get(state.activeTabId)
        mainWindow.setBrowserView(view)
        updateBrowserViewBounds()
      }
    } else {
      mainWindow.setBrowserView(null)
    }
  })

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
    tabs.set(id, { id, url: url || 'about:blank', title: '新标签页', isLoading: false, canGoBack: false, canGoForward: false })
    viewMap.set(id, view)

    view.webContents.on('did-start-loading', () => {
      const tab = tabs.get(id)
      if (tab) {
        tab.isLoading = true
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === state.activeTabId) mainWindow.webContents.send('browser-loading', true)
      }
    })

    view.webContents.on('did-stop-loading', () => {
      const tab = tabs.get(id)
      if (tab) {
        tab.isLoading = false
        tab.canGoBack = view.webContents.canGoBack()
        tab.canGoForward = view.webContents.canGoForward()
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === state.activeTabId) mainWindow.webContents.send('browser-loading', false)
      }
    })

    view.webContents.on('page-title-updated', (event, title) => {
      const tab = tabs.get(id)
      if (tab) {
        tab.title = title
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === state.activeTabId) mainWindow.webContents.send('browser-title-update', title)
      }
    })

    view.webContents.on('did-navigate', (event, url) => {
      const tab = tabs.get(id)
      if (tab) {
        tab.url = url
        tab.canGoBack = view.webContents.canGoBack()
        tab.canGoForward = view.webContents.canGoForward()
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === state.activeTabId) mainWindow.webContents.send('browser-url-update', url)
      }
    })

    view.webContents.setWindowOpenHandler((details) => {
      createNewTab(details.url, { userAgent: details.options?.userAgent, features: details.features })
      return { action: 'deny' }
    })

    try {
      if (options.features) {
        await view.webContents.loadURL(url, { userAgent: options.userAgent || view.webContents.getUserAgent() })
      } else {
        await view.webContents.loadURL(url)
      }
      state.activeTabId = id
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()
      mainWindow.webContents.send('browser-active-tab-update', id)
      mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
    } catch (error) {
      console.error('Failed to load URL:', error)
    }

    view.webContents.on('context-menu', (event, params) => {
      const menuTemplate = []
      params.webContents = view.webContents
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
          { label: `使用谷歌搜索 "${params.selectionText.substring(0, 20)}${params.selectionText.length > 20 ? '...' : ''}"`, click: () => view.webContents.loadURL(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`) },
          { type: 'separator' }
        )
      }
      if (params.isEditable) {
        menuTemplate.push({ label: '粘贴', accelerator: 'CmdOrCtrl+V', click: () => { if (params.webContents) params.webContents.paste() } })
      }
      if (params.mediaType === 'image') {
        menuTemplate.push({ type: 'separator' }, { label: '复制图片', click: () => { if (params.webContents) params.webContents.copyImageAt(params.x, params.y) } }, { label: '复制图片地址', click: () => { if (params.srcURL) clipboard.writeText(params.srcURL) } })
      }
      if (params.linkURL) {
        menuTemplate.push({ type: 'separator' }, { label: '复制链接地址', click: () => clipboard.writeText(params.linkURL) }, { label: '在新标签页中打开链接', click: () => createNewTab(params.linkURL) }, { label: '在外部浏览器中打开链接', click: () => shell.openExternal(params.linkURL) })
      }
      menuTemplate.push({ type: 'separator' }, { label: '全选', accelerator: 'CmdOrCtrl+A', click: () => { if (params.webContents) params.webContents.selectAll() } })
      if (process.env.NODE_ENV === 'development') {
        menuTemplate.push({ type: 'separator' }, { label: '检查元素', click: () => { if (params.webContents) params.webContents.inspectElement(params.x, params.y) } })
      }
      Menu.buildFromTemplate(menuTemplate).popup()
    })

    return view
  }

  ipcMain.handle('browser-new-tab', async (event, url = 'about:blank') => {
    const view = await createNewTab(url)
    if (view) {
      state.activeTabId = view.webContents.id
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()
      mainWindow.webContents.send('browser-active-tab-update', state.activeTabId)
      if (url && url !== 'about:blank') view.webContents.loadURL(url)
      return view.webContents.id
    }
    return null
  })

  ipcMain.handle('browser-close-tab', (event, tabId) => {
    const view = viewMap.get(tabId)
    if (view) {
      if (state.activeTabId === tabId) {
        const tabIds = Array.from(tabs.keys())
        const currentIndex = tabIds.indexOf(tabId)
        const nextId = tabIds[currentIndex - 1] || tabIds[currentIndex + 1]
        if (nextId) {
          state.activeTabId = nextId
          const nextView = viewMap.get(nextId)
          if (nextView) {
            mainWindow.setBrowserView(nextView)
            updateBrowserViewBounds()
            mainWindow.webContents.send('browser-active-tab-update', nextId)
            const tab = tabs.get(nextId)
            if (tab) {
              mainWindow.webContents.send('browser-url-update', tab.url)
              mainWindow.webContents.send('browser-title-update', tab.title)
              mainWindow.webContents.send('browser-loading', tab.isLoading)
            }
          }
        } else {
          state.activeTabId = null
          mainWindow.setBrowserView(null)
        }
      }
      tabs.delete(tabId)
      viewMap.delete(tabId)
      view.webContents.destroy()
      mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
    }
  })

  ipcMain.handle('browser-switch-tab', (event, tabId) => {
    const view = viewMap.get(tabId)
    if (view) {
      state.activeTabId = tabId
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()
      const tab = tabs.get(tabId)
      if (tab) {
        mainWindow.webContents.send('browser-url-update', tab.url)
        mainWindow.webContents.send('browser-title-update', tab.title)
        mainWindow.webContents.send('browser-loading', tab.isLoading)
        mainWindow.webContents.send('browser-active-tab-update', tabId)
      }
    }
  })

  mainWindow.on('resize', () => {
    if (mainWindow.getBrowserView()) updateBrowserViewBounds()
  })

  ipcMain.handle('update-sidebar-width', (event, width) => {
    state.sidebarWidth = width
    if (mainWindow && mainWindow.getBrowserView()) updateBrowserViewBounds()
  })

  ipcMain.handle('browser-navigate', async (event, url) => {
    const view = mainWindow.getBrowserView()
    if (!view) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    try {
      await view.webContents.loadURL(url)
      const tab = tabs.get(state.activeTabId)
      if (tab) { tab.url = url; mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values())) }
    } catch (error) { console.error('Navigation failed:', error) }
  })

  ipcMain.handle('browser-back', () => { const view = mainWindow.getBrowserView(); if (view && view.webContents.canGoBack()) view.webContents.goBack() })
  ipcMain.handle('browser-forward', () => { const view = mainWindow.getBrowserView(); if (view && view.webContents.canGoForward()) view.webContents.goForward() })
  ipcMain.handle('browser-refresh', () => { const view = mainWindow.getBrowserView(); if (view) view.webContents.reload() })

  ipcMain.handle('window-minimize', () => mainWindow?.minimize())
  ipcMain.handle('window-maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
  ipcMain.handle('window-close', () => { if (mainWindow) mainWindow.hide() })
  ipcMain.handle('is-window-maximized', () => mainWindow?.isMaximized())

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window-maximized-state-changed', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window-maximized-state-changed', false))

  // Translation-related IPC handlers
  ipcMain.handle('get-page-content', async () => {
    try {
      if (!state.activeTabId) return { success: false, error: '没有活动的浏览器窗口' }
      const view = viewMap.get(state.activeTabId)
      if (!view) return { success: false, error: '找不到活动的标签页视图' }
      const htmlContent = await view.webContents.executeJavaScript('document.documentElement.outerHTML')
      return { success: true, content: htmlContent }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('translate-webpage', async (event, targetLang) => {
    try {
      if (!state.activeTabId) return { success: false, error: '没有活动的浏览器窗口' }
      const view = viewMap.get(state.activeTabId)
      if (!view) return { success: false, error: '找不到活动的标签页视图' }
      const htmlContent = await view.webContents.executeJavaScript('document.documentElement.outerHTML')
      return { success: true, content: htmlContent }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('apply-translated-content', async (event, translatedContent) => {
    try {
      if (!state.activeTabId) return { success: false, error: '没有活动的浏览器窗口' }
      const view = viewMap.get(state.activeTabId)
      if (!view) return { success: false, error: '找不到活动的标签页视图' }
      await view.webContents.executeJavaScript(`
        (function() {
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          document.open();
          document.write(${JSON.stringify(translatedContent)});
          document.close();
          window.scrollTo(scrollX, scrollY);
          return true;
        })()
      `)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('translate-elements', async (event, selectors, targetLang) => {
    try {
      if (!state.activeTabId) return { success: false, error: '没有活动的浏览器窗口' }
      const view = viewMap.get(state.activeTabId)
      if (!view) return { success: false, error: '找不到活动的标签页视图' }
      const elementsData = await view.webContents.executeJavaScript(`
        (function() {
          const elements = document.querySelectorAll('${selectors}');
          return Array.from(elements).map(el => {
            return { id: el.id || null, text: el.innerText, path: el.id ? '#' + el.id : null };
          });
        })()
      `)
      return { success: true, elements: elementsData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  return { createNewTab, updateBrowserViewBounds }
}
