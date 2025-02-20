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
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-opus-latest',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ],
    needsApiKey: true,
    apiKeyHelp: '在 Anthropic 官网获取 API 密钥: https://console.anthropic.com/account/keys'
  },
  siliconflow: {
    name: 'SiliconFlow',
    apiHost: 'https://api.siliconflow.cn',
    needsApiKey: true,
    apiKeyHelp: '在 SiliconFlow 官网获取 API 密钥: https://siliconflow.cn/',
    models: [
      'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-Coder-7B-Instruct',
      'internlm/internlm2_5-7b-chat',
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'THUDM/glm-4-9b-chat',
      'AIDC-AI/Marco-o1',
      '01-ai/Yi-1.5-9B-Chat-16K'
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    apiHost: 'https://api.deepseek.com/v1',
    needsApiKey: true,
    apiKeyHelp: '在 DeepSeek 官网获取 API 密钥: https://platform.deepseek.com/',
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
      'google/gemini-2.0-flash-thinking-exp:free',
      'deepseek/deepseek-chat:free',
      'google/gemini-2.0-pro-exp-02-05:free',
      'google/palm-2-chat-bison',
      'deepseek/deepseek-r1:free',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o'
    ]
  },
  stepfun: {
    name: '阶跃星辰',
    apiHost: 'https://api.stepfun.com',
    needsApiKey: true,
    apiKeyHelp: '获取 API Key: https://platform.stepfun.com',
    models: [
      'step-2-16k',  // 万亿参数大模型
      'step-1-8k',   // 千亿参数基础版
      'step-1-32k',  // 千亿参数长文本版
      'step-1-128k', // 千亿参数超长文本版
      'step-1-256k', // 千亿参数超长文本增强版
      'step-1v-8k',  // 视觉识别基础版
      'step-1v-32k'  // 视觉识别长文本版
    ]
  }
};

// 默认设置常量
export const DEFAULT_SETTINGS = {
  PROVIDER: 'siliconflow',
  MODEL: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
  API_HOST: 'https://api.siliconflow.cn'
};

// 键盘快捷键常量
export const KEYBOARD_SHORTCUTS = {
  SEND: { key: 'Enter', modifier: 'none' },
  PASTE: { key: 'v', modifier: 'ctrl' },
  HISTORY_UP: { key: 'ArrowUp', modifier: 'none' },
  HISTORY_DOWN: { key: 'ArrowDown', modifier: 'none' }
}; 