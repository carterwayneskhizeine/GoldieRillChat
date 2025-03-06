/**
 * 更新消息内容
 * @param {string} messageId - 消息ID
 * @param {string} newContent - 新的消息内容
 * @param {object} message - 原始消息对象
 * @param {array} messages - 所有消息数组
 * @param {object} currentConversation - 当前对话信息
 * @param {Object} electronApi - Electron API 接口
 * @returns {Promise<array>} 更新后的消息数组
 */
export const updateMessage = async (
  messageId, 
  newContent, 
  message, 
  messages, 
  currentConversation,
  electronApi
) => {
  if (!message) return messages;

  // Update message in state
  const updatedMessage = { ...message, content: newContent }
  
  if (currentConversation) {
    try {
      // Update txt file
      const txtFile = await electronApi.saveMessageAsTxt(currentConversation.path, updatedMessage)
      updatedMessage.txtFile = txtFile

      // Update messages.json
      const updatedMessages = messages.map(msg => 
        msg.id === messageId ? updatedMessage : msg
      )
      
      await electronApi.saveMessages(
        currentConversation.path,
        currentConversation.id,
        updatedMessages
      )

      return updatedMessages;
    } catch (error) {
      console.error('Failed to update message files:', error)
      throw new Error('保存修改失败')
    }
  }

  return messages;
}

/**
 * 发送新消息
 * @param {string} messageInput - 消息内容
 * @param {Array} selectedFiles - 选中的文件列表
 * @param {Array} messages - 当前消息列表
 * @param {Object} currentConversation - 当前对话信息
 * @param {Object} electronApi - Electron API 接口
 * @returns {Promise<Object>} 新消息信息和更新后的消息列表
 */
export const sendMessage = async (
  messageInput,
  selectedFiles,
  messages,
  currentConversation,
  electronApi
) => {
  if (!messageInput.trim() && selectedFiles.length === 0) {
    throw new Error('消息内容和文件不能同时为空')
  }

  const newMessage = {
    id: Date.now().toString(),
    content: messageInput,
    type: 'user',
    timestamp: new Date().toISOString(),
    files: selectedFiles,
  }

  // Save message as txt file
  if (messageInput.trim() && currentConversation) {
    try {
      const txtFile = await electronApi.saveMessageAsTxt(currentConversation.path, newMessage)
      newMessage.txtFile = txtFile
    } catch (error) {
      console.error('Failed to save message as txt:', error)
      throw new Error('保存消息文件失败')
    }
  }

  const updatedMessages = [...messages, newMessage]
  
  // Save to storage
  if (currentConversation) {
    await electronApi.saveMessages(
      currentConversation.path,
      currentConversation.id,
      updatedMessages
    )
  }

  return {
    newMessage,
    updatedMessages
  }
}

/**
 * 删除消息
 * @param {string} messageId - 消息ID
 * @param {Array} messages - 当前消息列表
 * @param {Object} currentConversation - 当前对话信息
 * @param {Object} electronApi - Electron API 接口
 * @returns {Promise<Array>} 更新后的消息列表
 */
export const deleteMessage = async (
  messageId,
  messages,
  currentConversation,
  electronApi
) => {
  const message = messages.find(msg => msg.id === messageId)
  if (!message) return messages

  try {
    if (currentConversation) {
      // Move message file to recycle bin
      await electronApi.deleteMessage(currentConversation.path, message)
      
      // Update messages state and storage
      const updatedMessages = messages.filter(msg => msg.id !== messageId)
      await electronApi.saveMessages(
        currentConversation.path,
        currentConversation.id,
        updatedMessages
      )
      
      return updatedMessages
    }
  } catch (error) {
    console.error('Failed to delete message:', error)
    throw new Error('删除消息失败')
  }

  return messages
}

/**
 * 进入消息编辑模式
 * @param {Object} message - 要编辑的消息
 * @returns {Object} 编辑模式信息
 */
export const enterEditMode = (message) => {
  return {
    editingMessage: message,
    messageInput: message.content
  }
}

/**
 * 退出消息编辑模式
 * @returns {Object} 重置的编辑模式信息
 */
export const exitEditMode = () => {
  return {
    editingMessage: null,
    messageInput: ''
  }
}

/**
 * 加载对话消息
 * @param {Object} currentConversation - 当前对话信息
 * @param {Object} electronApi - Electron API 接口
 * @returns {Promise<Array>} 消息列表
 */
export const loadMessages = async (currentConversation, electronApi) => {
  try {
    if (!currentConversation?.path) return [];
    
    const messages = await electronApi.loadMessages(currentConversation.path);
    
    // 增强型数据验证
    const validMessages = messages.filter(msg => {
      // 必须包含的字段检查
      const requiredFields = ['id', 'type', 'content', 'timestamp'];
      const hasAllFields = requiredFields.every(field => field in msg);
      
      // 类型有效性检查
      const validTypes = ['user', 'assistant'];
      const hasValidType = validTypes.includes(msg.type);
      
      if (!hasAllFields || !hasValidType) {
        console.warn('发现无效消息结构:', msg.id);
        return false;
      }
      return true;
    });

    // 增强型重复检测
    const uniqueMessages = [];
    const seenIds = new Set();
    const contentMap = new Map();

    for (const msg of validMessages) {
      // 基于ID的主键检查
      if (seenIds.has(msg.id)) {
        console.warn('发现重复ID消息:', msg.id);
        continue;
      }
      seenIds.add(msg.id);

      // 基于内容和时间的二次检查
      const contentKey = `${msg.type}-${msg.content.substring(0, 100)}`; // 截取前100字符
      const existing = contentMap.get(contentKey);
      
      if (existing) {
        // 时间差在5秒内的视为重复
        const timeDiff = Math.abs(new Date(msg.timestamp) - new Date(existing.timestamp));
        if (timeDiff < 5000) {
          console.warn(`发现时间相近的重复内容消息: ${msg.id} vs ${existing.id}`);
          continue;
        }
      }
      
      contentMap.set(contentKey, msg);
      uniqueMessages.push(msg);
    }

    // 自动修复并保存
    if (uniqueMessages.length !== messages.length) {
      console.log(`修复 ${messages.length - uniqueMessages.length} 条问题消息`);
      await electronApi.saveMessages(
        currentConversation.path,
        currentConversation.id,
        uniqueMessages
      );
    }
    
    return uniqueMessages;
  } catch (error) {
    console.error('消息加载失败:', error);
    return [];
  }
} 