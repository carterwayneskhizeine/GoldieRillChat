import { useEffect } from 'react'

// 主题配置
export const themes = [
  "rill",
  "dark", "synthwave", "halloween", "forest", "pastel", "black", "luxury", "dracula", 
  "business", "coffee", "emerald", "corporate", "retro", "aqua", "wireframe", 
  "night", "dim", "sunset"
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