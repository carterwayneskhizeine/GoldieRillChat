// 工具列表配置
export const tools = ['chat', 'browser', 'markdown', 'editor']

// 工具显示名称映射
export const toolDisplayNames = {
  chat: 'Chat',
  editor: 'Image Editor',
  browser: 'Browser',
  markdown: 'Markdown'
}

// 获取工具显示名称的函数
export const getToolDisplayName = (tool) => {
  return toolDisplayNames[tool] || tool
}

// 工具切换函数工厂
export const createToolSwitcher = (setActiveTool) => {
  return (direction) => {
    setActiveTool(currentTool => {
      const currentIndex = tools.indexOf(currentTool)
      if (direction === 'next') {
        return tools[(currentIndex + 1) % tools.length]
      } else {
        return tools[(currentIndex - 1 + tools.length) % tools.length]
      }
    })
  }
} 