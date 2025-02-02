import { useEffect } from 'react'

// 浏览器状态初始化函数
export const initializeBrowserState = () => {
  return {
    browserTabs: [],
    activeTabId: null,
    currentUrl: '',
    isLoading: false,
    pageTitle: '新标签页'
  }
}

// 浏览器事件监听函数
export const useBrowserEvents = ({
  activeTool,
  sidebarOpen,
  sidebarMode,
  browserTabs,
  activeTabId,
  setBrowserTabs,
  setActiveTabId,
  setCurrentUrl,
  setIsLoading,
  setPageTitle
}) => {
  useEffect(() => {
    if (activeTool === 'browser') {
      // 显示浏览器视图
      window.electron.browser.setVisibility(true)
      // 更新浏览器视图位置（考虑当前侧边栏状态和模式）
      const sidebarWidth = sidebarOpen ? (sidebarMode === 'chat' ? 400 : 200) : 0
      window.electron.browser.updateSidebarWidth(sidebarWidth)

      // 只在没有任何标签页时创建新标签页
      if (browserTabs.length === 0 && !activeTabId) {
        window.electron.browser.newTab('https://www.google.com')
      }

      // 监听标签页更新
      const tabsUnsubscribe = window.electron.browser.onTabsUpdate((tabs) => {
        setBrowserTabs(Object.values(tabs))
      })

      // 监听活动标签页更新
      const activeTabUnsubscribe = window.electron.browser.onActiveTabUpdate((tabId) => {
        setActiveTabId(tabId)
        const tab = browserTabs.find(t => t.id === tabId)
        if (tab) {
          setCurrentUrl(tab.url)
          setPageTitle(tab.title)
        }
      })

      // 监听 URL 更新
      const urlUnsubscribe = window.electron.browser.onUrlUpdate((url) => {
        setCurrentUrl(url)
      })

      // 监听加载状态
      const loadingUnsubscribe = window.electron.browser.onLoading((loading) => {
        setIsLoading(loading)
      })

      // 监听标题更新
      const titleUnsubscribe = window.electron.browser.onTitleUpdate((title) => {
        setPageTitle(title)
      })

      // 清理函数
      return () => {
        window.electron.browser.setVisibility(false)
        tabsUnsubscribe()
        activeTabUnsubscribe()
        urlUnsubscribe()
        loadingUnsubscribe()
        titleUnsubscribe()
      }
    }
  }, [activeTool, sidebarOpen, browserTabs.length, activeTabId, sidebarMode])
}

// 侧边栏状态监听函数
export const useSidebarEffect = ({
  activeTool,
  sidebarOpen,
  sidebarMode
}) => {
  useEffect(() => {
    if (activeTool === 'browser') {
      // 通知主进程侧边栏状态变化
      const sidebarWidth = sidebarOpen ? (sidebarMode === 'chat' ? 400 : 200) : 0
      window.electron.browser.updateSidebarWidth(sidebarWidth)
    }
  }, [sidebarOpen, sidebarMode, activeTool])
} 