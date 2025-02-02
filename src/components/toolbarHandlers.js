// 工具列表配置
export const tools = ['chat', 'browser', 'markdown', 'editor']

// 获取工具显示名称
export const getToolDisplayName = (tool) => {
  switch (tool) {
    case 'chat':
      return 'Chat'
    case 'editor':
      return 'Image Editor'
    case 'browser':
      return 'Browser'
    case 'markdown':
      return 'Markdown'
    default:
      return tool
  }
}

// 创建工具切换函数
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