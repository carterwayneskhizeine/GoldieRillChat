// 存储键名常量
export const STORAGE_KEYS = {
  API_KEY_PREFIX: 'aichat_api_key',
  API_HOST: 'aichat_api_host',
  SELECTED_PROVIDER: 'aichat_provider',
  SELECTED_MODEL: 'aichat_model',
  MESSAGES: 'aichat_messages',
  CURRENT_CONVERSATION: 'aichat_current_conversation'
};

// 显示阶段常量
export const DISPLAY_STAGES = {
  REASONING: 'reasoning',      // 正在接收推理过程
  TYPING_REASONING: 'typing_reasoning', // 打印推理过程
  TYPING_RESULT: 'typing_result',    // 打印结果
  COMPLETED: 'completed'      // 显示最终的Markdown格式
};

// 消息状态常量
export const MESSAGE_STATES = {
  IDLE: 'idle',
  THINKING: 'thinking',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// 动画状态常量
export const ANIMATION_STATES = {
  FADE_IN: 'fade_in',
  FADE_OUT: 'fade_out',
  NONE: 'none'
};

// 消息类型常量
export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant'
};

// 模型提供商配置
export const MODEL_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    apiHost: 'https://api.openai.com/v1',
    models: [
      'gpt-4',
      'gpt-3.5-turbo'
    ],
    needsApiKey: true,
    apiKeyHelp: '在 OpenAI 官网获取 API 密钥: https://platform.openai.com/api-keys'
  },
  claude: {
    name: 'Claude',
    apiHost: 'https://api.anthropic.com',
    models: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ],
    needsApiKey: true,
    apiKeyHelp: '在 Anthropic 官网获取 API 密钥: https://console.anthropic.com/account/keys'
  },
  siliconflow: {
    name: 'SiliconFlow API',
    apiHost: 'https://api.siliconflow.cn',
    needsApiKey: true,
    apiKeyHelp: '在 SiliconFlow 官网获取 API 密钥: https://api.siliconflow.cn',
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-14B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'ChatGLM/ChatGLM3-6B',
      'ChatGLM/ChatGLM2-6B',
      'ChatGLM/ChatGLM-6B'
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    apiHost: 'https://api.deepseek.com/v1',
    needsApiKey: true,
    apiKeyHelp: '在 DeepSeek 官网获取 API 密钥: https://platform.deepseek.ai/settings',
    models: [
      'deepseek-chat',
      'deepseek-reasoner'
    ]
  },
  openrouter: {
    name: 'OpenRouter',
    apiHost: 'https://openrouter.ai/api/v1',
    needsApiKey: true,
    apiKeyHelp: '在 OpenRouter 官网获取 API 密钥: https://openrouter.ai/keys',
    models: [
      'openai/gpt-3.5-turbo',
      'openai/gpt-4',
      'anthropic/claude-2',
      'google/palm-2-chat-bison',
      'meta-llama/llama-2-70b-chat',
      'meta-llama/llama-2-13b-chat',
      'mistral-ai/mistral-7b-instruct'
    ]
  }
};

// 默认设置常量
export const DEFAULT_SETTINGS = {
  PROVIDER: 'openai',
  MODEL: 'gpt-3.5-turbo',
  API_HOST: 'https://api.openai.com/v1'
};

// 键盘快捷键常量
export const KEYBOARD_SHORTCUTS = {
  SEND: { key: 'Enter', modifier: 'none' },
  PASTE: { key: 'v', modifier: 'ctrl' },
  HISTORY_UP: { key: 'ArrowUp', modifier: 'none' },
  HISTORY_DOWN: { key: 'ArrowDown', modifier: 'none' }
}; 