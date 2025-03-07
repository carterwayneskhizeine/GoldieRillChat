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
      // 首先验证会话文件夹路径是否存在
      try {
        await electronApi.access(currentConversation.path)
      } catch (pathError) {
        console.error('文件夹路径不存在:', pathError)
        throw new Error(`对话文件夹不存在: ${currentConversation.path}`)
      }
      
      // 从localStorage获取最新的会话信息，确保使用正确的路径
      let updatedPath = currentConversation.path
      try {
        const savedConversations = JSON.parse(localStorage.getItem('aichat_conversations') || '[]')
        const updatedConversation = savedConversations.find(c => c.id === currentConversation.id)
        if (updatedConversation && updatedConversation.path !== currentConversation.path) {
          console.log('检测到会话路径已更新:', {
            oldPath: currentConversation.path,
            newPath: updatedConversation.path
          })
          updatedPath = updatedConversation.path
          // 验证新路径是否存在
          await electronApi.access(updatedPath)
        }
      } catch (storageError) {
        console.warn('读取localStorage失败，使用当前路径:', storageError)
      }
      
      // Move message file to recycle bin
      await electronApi.deleteMessage(updatedPath, message)
      
      // Update messages state and storage
      const updatedMessages = messages.filter(msg => msg.id !== messageId)
      await electronApi.saveMessages(
        updatedPath,
        currentConversation.id,
        updatedMessages
      )
      
      return updatedMessages
    }
  } catch (error) {
    console.error('删除消息失败:', error)
    throw new Error('删除消息失败: ' + error.message)
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
  if (!currentConversation) {
    return [];
  }

  try {
    // 检查文件夹路径是否存在，并获取最新路径
    let updatedPath = currentConversation.path;
    
    // 首先验证会话文件夹路径是否存在
    try {
      await electronApi.access(currentConversation.path);
    } catch (pathError) {
      // 检查localStorage是否有更新的路径
      try {
        const savedConversations = JSON.parse(localStorage.getItem('aichat_conversations') || '[]');
        const updatedConversation = savedConversations.find(c => c.id === currentConversation.id);
        if (updatedConversation && updatedConversation.path !== currentConversation.path) {
          console.log('加载消息时检测到会话路径已更新:', {
            oldPath: currentConversation.path,
            newPath: updatedConversation.path
          });
          updatedPath = updatedConversation.path;
          // 验证新路径是否存在
          await electronApi.access(updatedPath);
        } else {
          // 如果localStorage也没有更新的路径，则抛出原始错误
          throw pathError;
        }
      } catch (storageError) {
        console.error('文件夹路径不存在且无法从localStorage恢复:', pathError);
        throw new Error(`对话文件夹不存在: ${currentConversation.path}`);
      }
    }
    
    // 使用正确的路径加载消息
    let messages = await electronApi.loadMessages(updatedPath, currentConversation.id);
    
    // 处理空数组或无效数据
    if (!messages || !Array.isArray(messages)) {
      messages = [];
    }
    
    // 去除重复消息（相同ID）
    const uniqueMessageIds = new Set();
    const uniqueMessages = [];
    
    for (const message of messages) {
      if (!message.id) continue;
      
      if (!uniqueMessageIds.has(message.id)) {
        uniqueMessageIds.add(message.id);
        uniqueMessages.push(message);
      }
    }
    
    // 自动修复并保存
    if (uniqueMessages.length !== messages.length) {
      console.log(`修复 ${messages.length - uniqueMessages.length} 条问题消息`);
      await electronApi.saveMessages(
        updatedPath,
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