import { useEffect } from 'react'

/**
 * 切换主题
 * @param {string} currentTheme - 当前主题
 * @param {Array<string>} themes - 可用主题列表
 * @param {Function} setCurrentTheme - 设置当前主题的函数
 */
export const toggleTheme = async (currentTheme, themes, setCurrentTheme) => {
  // 切换主题
  const currentIndex = themes.indexOf(currentTheme)
  const nextTheme = themes[(currentIndex + 1) % themes.length]
  setCurrentTheme(nextTheme)

  // 获取存储路径并更新文件夹
  try {
    const storagePath = localStorage.getItem('storagePath')
    if (storagePath) {
      await window.electron.scanFolders(storagePath).then(folders => {
        if (folders && folders.length > 0) {
          const conversationsToSave = folders.map(folder => ({
            id: folder.id,
            name: folder.name,
            path: folder.path,
            timestamp: folder.timestamp
          }))
          localStorage.setItem('aichat_conversations', JSON.stringify(conversationsToSave))
        }
      })
    }
  } catch (error) {
    console.error('更新文件夹失败:', error)
  }
}

// 主题配置
export const themes = [
  "dark", "black", "forest", "luxury", "business", "coffee", "aqua", 
  "night", "dim", "sunset", "bg-theme"
]

// 主题初始化函数
export const initializeTheme = () => {
  return localStorage.getItem('theme') || 'dark'
}

// 主题持久化Hook
export const useThemeEffect = (currentTheme) => {
  useEffect(() => {
    // 应用主题到文档
    document.documentElement.setAttribute('data-theme', currentTheme)
    // 保存到本地存储
    localStorage.setItem('theme', currentTheme)
  }, [currentTheme])
} 