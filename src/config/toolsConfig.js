// 工具列表配置
export const tools = ['threejs-shaders', 'browser', 'aichat', 'chat', 'monaco', 'embedding', 'goldie-talk']

// 工具显示名称映射
export const toolDisplayNames = {
  browser: 'Browser',
  aichat: 'AI Chat',
  chat: 'Chat',
  monaco: 'Monaco Editor',
  editor: 'Image Editor',
  'threejs-shaders': 'ThreeJS Shaders',
  embedding: 'Embedding',
  'goldie-talk': 'Goldie Talk'
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


// 工具列表配置
//export const tools = ['threejs-shaders', 'browser', 'aichat', 'chat', 'monaco', 'embedding', 'liveportrait']

// 工具显示名称映射
//export const toolDisplayNames = {
//  browser: 'Browser',
//  aichat: 'AI Chat',
//  chat: 'Chat',
//  monaco: 'Monaco Editor',
//  editor: 'Image Editor',
//  'threejs-shaders': 'ThreeJS Shaders',
//  embedding: 'Embedding',
//  liveportrait: '灵动人像'
//}