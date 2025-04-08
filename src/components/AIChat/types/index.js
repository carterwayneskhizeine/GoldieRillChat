/**
 * @typedef {Object} Message
 * @property {string} id - 消息的唯一标识符
 * @property {string} content - 消息内容
 * @property {'user' | 'assistant'} type - 消息类型
 * @property {Date} timestamp - 消息时间戳
 * @property {string} [model] - AI 模型名称（仅用于 assistant 类型）
 * @property {Array<MessageHistory>} [history] - 消息历史记录
 * @property {number} [currentHistoryIndex] - 当前历史记录索引
 * @property {string} [currentContent] - 当前内容
 * @property {boolean} [error] - 是否发生错误
 * @property {Object} [usage] - Token 使用情况
 * @property {number} [usage.total_tokens] - 总 Token 数
 */

/**
 * @typedef {Object} MessageHistory
 * @property {string} content - 历史消息内容
 * @property {Date} timestamp - 历史消息时间戳
 * @property {string} model - 使用的模型
 * @property {number} tokens - Token 数量
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id - 会话的唯一标识符
 * @property {string} name - 会话名称
 * @property {string} path - 会话文件路径
 * @property {Date} timestamp - 创建时间
 * @property {Array<Message>} messages - 消息列表
 */

/**
 * @typedef {Object} ModelProvider
 * @property {string} name - 提供商名称
 * @property {string} apiHost - API 地址
 * @property {Array<string>} models - 可用模型列表
 * @property {boolean} needsApiKey - 是否需要 API 密钥
 * @property {string} [apiKeyHelp] - API 密钥帮助信息
 */

/**
 * @typedef {Object} FileAttachment
 * @property {string} name - 文件名
 * @property {string} path - 文件路径
 * @property {string} type - 文件类型
 * @property {number} size - 文件大小
 */

// 导出类型，虽然在 JavaScript 中不会真正使用，但可以作为文档
export const Types = {
  Message: /** @type {Message} */ ({}),
  MessageHistory: /** @type {MessageHistory} */ ({}),
  Conversation: /** @type {Conversation} */ ({}),
  ModelProvider: /** @type {ModelProvider} */ ({}),
  FileAttachment: /** @type {FileAttachment} */ ({})
}; 