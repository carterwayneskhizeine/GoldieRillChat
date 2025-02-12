/**
 * 消息类型定义
 * @typedef {Object} Message
 * @property {string} id - 消息的唯一标识符
 * @property {string} content - 消息内容
 * @property {'user' | 'assistant'} type - 消息类型
 * @property {string} timestamp - 消息时间戳 (ISO 8601格式)
 * @property {Object} [txtFile] - 文本文件信息
 * @property {string} txtFile.name - 文件名
 * @property {string} txtFile.displayName - 显示名称
 * @property {string} txtFile.path - 文件路径
 */

/**
 * AI助手消息特有属性
 * @typedef {Object} AssistantMessageExtra
 * @property {string} [model] - 使用的AI模型
 * @property {boolean} [generating] - 是否正在生成
 * @property {boolean} [error] - 是否发生错误
 * @property {Object} [usage] - Token使用情况
 * @property {number} usage.total_tokens - 总Token数
 * @property {string} [reasoning_content] - 推理过程内容
 * @property {Array<MessageHistory>} [history] - 消息历史记录
 * @property {number} [currentHistoryIndex] - 当前历史记录索引
 */

/**
 * 消息历史记录
 * @typedef {Object} MessageHistory
 * @property {string} content - 历史消息内容
 * @property {string} timestamp - 历史消息时间戳
 * @property {string} model - 使用的模型
 * @property {number} tokens - Token数量
 * @property {string} [reasoning_content] - 推理过程内容
 */

/**
 * 文件附件
 * @typedef {Object} FileAttachment
 * @property {string} name - 文件名
 * @property {string} path - 文件路径
 * @property {string} type - 文件类型
 * @property {number} size - 文件大小
 */

export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant'
};

export const MessageState = {
  IDLE: 'idle',
  THINKING: 'thinking',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  ERROR: 'error'
}; 