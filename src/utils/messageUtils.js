import { MessageType } from '../types/message';

/**
 * 格式化消息时间戳
 * @param {string|Date} timestamp - 时间戳
 * @returns {string} - 格式化后的时间字符串
 */
export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear().toString().slice(-2);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${day}${month}${year}_${hours}${minutes}${seconds}`;
};

/**
 * 生成消息文件名
 * @param {Object} message - 消息对象
 * @param {string} [model] - AI模型名称
 * @param {number} [tokens] - Token数量
 * @returns {string} - 生成的文件名
 */
export const generateMessageFileName = (message, model, tokens) => {
  const timeStr = formatMessageTime(message.timestamp);
  const parts = [timeStr];
  
  if (model) {
    parts.push(`模型: ${model}`);
  }
  
  if (tokens) {
    parts.push(`Token: ${tokens}`);
  }
  
  return parts.join(' • ');
};

/**
 * 估算消息的Token数量
 * @param {string} content - 消息内容
 * @returns {number} - 估算的Token数量
 */
export const estimateTokens = (content) => {
  // 一个粗略的估算: 平均每4个字符算1个token
  return Math.ceil(content.length / 4);
};

/**
 * 检查消息是否需要折叠
 * @param {Object} message - 消息对象
 * @returns {boolean} - 是否需要折叠
 */
export const shouldCollapseMessage = (message) => {
  if (!message.content) return false;
  return message.content.split('\n').length > 6 || message.content.length > 300;
};

/**
 * 获取消息的显示状态
 * @param {Object} message - 消息对象
 * @returns {string} - 显示状态描述
 */
export const getMessageDisplayState = (message) => {
  if (message.error) return 'error';
  if (message.generating) return 'generating';
  if (message.type === MessageType.ASSISTANT && message.reasoning_content) return 'reasoning';
  return 'normal';
};

/**
 * 创建消息的文本表示
 * @param {Object} message - 消息对象
 * @returns {string} - 消息的文本表示
 */
export const createMessageText = (message) => {
  const parts = [];
  
  // 添加推理过程
  if (message.reasoning_content) {
    parts.push('推理过程:\n' + message.reasoning_content + '\n');
  }
  
  // 添加回答内容
  if (message.content) {
    if (parts.length > 0) {
      parts.push('回答:\n');
    }
    parts.push(message.content);
  }
  
  return parts.join('\n');
}; 