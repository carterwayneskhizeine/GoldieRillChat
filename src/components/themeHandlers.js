/**
 * 切换主题
 * @param {string} currentTheme - 当前主题
 * @param {Array<string>} themes - 可用主题列表
 * @param {Function} setCurrentTheme - 设置当前主题的函数
 */
export const toggleTheme = (currentTheme, themes, setCurrentTheme) => {
  const currentIndex = themes.indexOf(currentTheme)
  const nextIndex = (currentIndex + 1) % themes.length
  setCurrentTheme(themes[nextIndex])
}

// 导出可用的主题列表
export const themes = [
  "dark", "synthwave", "halloween", "forest", "pastel", 
  "black", "luxury", "dracula", "business", "coffee", 
  "emerald", "corporate", "retro", "aqua", "wireframe", 
  "night", "dim", "sunset"
] 