// 工具列表配置
export const tools = ['chat', 'browser', 'monaco', 'aichat', 'editor']

// 工具显示名称映射
export const toolDisplayNames = {
  chat: 'Chat',
  editor: 'Image Editor',
  browser: 'Browser',
  monaco: 'Monaco Editor',
  aichat: 'AI Chat'
}

// 模型提供商配置
export const MODEL_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    apiHost: 'https://api.openai.com/v1',
    models: ['gpt-3.5-turbo', 'gpt-4']
  },
  openrouter: {
    name: 'OpenRouter',
    apiHost: 'https://openrouter.ai/api/v1',
    models: [
      'openai/gpt-3.5-turbo',
      'openai/gpt-4',
      'anthropic/claude-2',
      'google/palm-2-chat-bison',
      'meta-llama/llama-2-70b-chat',
      'meta-llama/llama-2-13b-chat',
      'mistral-ai/mistral-7b-instruct'
    ]
  },
  claude: {
    name: 'Claude API',
    models: ['claude-2.1', 'claude-instant-1.2'],
    needsApiKey: true,
    apiHost: 'https://api.anthropic.com'
  },
  siliconflow: {
    name: 'SiliconFlow API',
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-14B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'ChatGLM/ChatGLM3-6B',
      'ChatGLM/ChatGLM2-6B',
      'ChatGLM/ChatGLM-6B'
    ],
    needsApiKey: true,
    apiHost: 'https://api.siliconflow.cn'
  }
};

// 获取模型列表的函数
export async function fetchModels(provider, apiKey, apiHost) {
  try {
    switch (provider) {
      case 'openai': {
        const response = await fetch(`${apiHost}/v1/models`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.data.filter(model => model.id.includes('gpt')).map(model => model.id);
      }
      
      case 'claude': {
        const response = await fetch(`${apiHost}/v1/models`, {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.models.map(model => model.name);
      }
      
      case 'siliconflow': {
        const response = await fetch(`${apiHost}/v1/models`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.data.map(model => model.id);
      }

      case 'openrouter': {
        const response = await fetch(`${apiHost}/models`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'GoldieRillChat'
          }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.data.map(model => model.id);
      }
      
      default:
        return MODEL_PROVIDERS[provider]?.models || [];
    }
  } catch (error) {
    console.error(`获取${provider}模型列表失败:`, error);
    // 如果API调用失败，返回预定义的模型列表作为后备
    return MODEL_PROVIDERS[provider]?.models || [];
  }
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