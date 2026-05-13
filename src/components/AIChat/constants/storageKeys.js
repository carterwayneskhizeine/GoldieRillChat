// 定义本地存储的键名
export const STORAGE_KEYS = {
  API_KEY: 'aichat_api_key',
  API_HOST: 'aichat_api_host',
  PROVIDER: 'aichat_provider',
  MODEL: 'aichat_model',
  MESSAGES: 'aichat_messages',
  CURRENT_CONVERSATION: 'aichat_current_conversation',
  SYSTEM_PROMPT: 'aichat_system_prompt',
  SYSTEM_PROMPT_ENABLED: 'aichat_system_prompt_enabled',
  SYSTEM_PROMPT_TEMPLATES: 'aichat_system_prompt_templates'
};

// AI 后端类型
export const BACKEND_TYPES = {
  DIRECT: 'direct',       // 现有直连模式 (OpenAI / Claude / DeepSeek 等)
  OPENCLAW: 'openclaw',   // OpenClaw WebSocket 网关
  HERMES: 'hermes',       // Hermes Agent HTTP SSE
}

export const BACKEND_STORAGE_KEY = 'aichat_backend'

// 内容块类型
export const CONTENT_BLOCK_TYPES = {
  TEXT: 'text',
  THINKING: 'thinking',
  TOOL_CALL: 'toolCall',
  TOOL_RESULT: 'toolResult',
}