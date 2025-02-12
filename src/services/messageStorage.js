// 消息类型定义
const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant'
};

/**
 * 消息存储服务
 */
class MessageStorage {
  constructor(window) {
    this.window = window;
  }

  /**
   * 保存消息到存储
   * @param {string} conversationPath - 会话路径
   * @param {Array} messages - 消息数组
   */
  async saveMessages(conversationPath, messages) {
    try {
      const messagesPath = this.window.electron.path.join(conversationPath, 'messages.json');
      await this.window.electron.writeFile(messagesPath, JSON.stringify(messages, null, 2));
    } catch (error) {
      console.error('保存消息失败:', error);
      throw new Error(`保存消息失败: ${error.message}`);
    }
  }

  /**
   * 从存储加载消息
   * @param {string} conversationPath - 会话路径
   * @returns {Array} - 消息数组
   */
  async loadMessages(conversationPath) {
    try {
      const messagesPath = this.window.electron.path.join(conversationPath, 'messages.json');
      
      // 检查文件是否存在
      try {
        await this.window.electron.access(messagesPath);
      } catch (error) {
        // 如果文件不存在,创建空的消息数组
        await this.saveMessages(conversationPath, []);
        return [];
      }

      // 读取消息
      const content = await this.window.electron.readFile(messagesPath);
      return content ? JSON.parse(content) : [];
    } catch (error) {
      console.error('加载消息失败:', error);
      throw new Error(`加载消息失败: ${error.message}`);
    }
  }

  /**
   * 添加新消息
   * @param {string} conversationPath - 会话路径
   * @param {Object} message - 消息对象
   * @param {Array} currentMessages - 当前消息数组
   * @returns {Array} - 更新后的消息数组
   */
  async addMessage(conversationPath, message, currentMessages) {
    try {
      const messages = [...currentMessages, message];
      await this.saveMessages(conversationPath, messages);
      return messages;
    } catch (error) {
      console.error('添加消息失败:', error);
      throw new Error(`添加消息失败: ${error.message}`);
    }
  }

  /**
   * 更新消息
   * @param {string} conversationPath - 会话路径
   * @param {string} messageId - 消息ID
   * @param {Object} updates - 更新内容
   * @param {Array} currentMessages - 当前消息数组
   * @returns {Array} - 更新后的消息数组
   */
  async updateMessage(conversationPath, messageId, updates, currentMessages) {
    try {
      const messages = currentMessages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      await this.saveMessages(conversationPath, messages);
      return messages;
    } catch (error) {
      console.error('更新消息失败:', error);
      throw new Error(`更新消息失败: ${error.message}`);
    }
  }

  /**
   * 删除消息
   * @param {string} conversationPath - 会话路径
   * @param {string} messageId - 消息ID
   * @param {Array} currentMessages - 当前消息数组
   * @returns {Array} - 更新后的消息数组
   */
  async deleteMessage(conversationPath, messageId, currentMessages) {
    try {
      const messages = currentMessages.filter(msg => msg.id !== messageId);
      await this.saveMessages(conversationPath, messages);
      return messages;
    } catch (error) {
      console.error('删除消息失败:', error);
      throw new Error(`删除消息失败: ${error.message}`);
    }
  }

  /**
   * 创建用户消息
   * @param {string} content - 消息内容
   * @param {Object} options - 其他选项
   * @returns {Object} - 消息对象
   */
  createUserMessage(content, options = {}) {
    return {
      id: Date.now().toString(),
      type: MessageType.USER,
      content,
      timestamp: new Date().toISOString(),
      ...options
    };
  }

  /**
   * 创建助手消息
   * @param {string} content - 消息内容
   * @param {Object} options - 其他选项
   * @returns {Object} - 消息对象
   */
  createAssistantMessage(content, options = {}) {
    return {
      id: Date.now().toString(),
      type: MessageType.ASSISTANT,
      content,
      timestamp: new Date().toISOString(),
      generating: false,
      error: false,
      history: [],
      currentHistoryIndex: 0,
      reasoning_content: '',
      ...options
    };
  }

  /**
   * 添加消息历史记录
   * @param {Object} message - 消息对象
   * @param {Object} historyItem - 历史记录项
   * @returns {Object} - 更新后的消息对象
   */
  addMessageHistory(message, historyItem) {
    const history = [...(message.history || [])];
    history.push({
      content: historyItem.content,
      timestamp: new Date().toISOString(),
      model: historyItem.model,
      tokens: historyItem.tokens,
      reasoning_content: historyItem.reasoning_content
    });

    return {
      ...message,
      history,
      currentHistoryIndex: history.length
    };
  }
}

export default MessageStorage;
export { MessageType }; 