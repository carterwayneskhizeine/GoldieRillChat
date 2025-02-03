/**
 * 聊天服务模块 - 处理所有与对话和消息相关的操作
 */

/**
 * 创建新对话
 */
export const createNewConversation = async (storagePath, conversations, electron) => {
  if (!storagePath) {
    throw new Error('请先在设置中选择存储文件夹')
  }

  try {
    const result = await electron.createChatFolder(storagePath)
    
    const newConversation = {
      id: Date.now().toString(),
      name: result.name,
      timestamp: new Date().toISOString(),
      path: result.path
    }
    
    // 更新对话列表
    const updatedConversations = [...conversations, newConversation]
    
    // 保存到localStorage
    localStorage.setItem('conversations', JSON.stringify(updatedConversations))
    
    return {
      updatedConversations,
      newConversation
    }
  } catch (error) {
    throw new Error(`创建新对话失败: ${error.message}`)
  }
}

/**
 * 加载指定对话
 */
export const loadConversation = async (conversationId, conversations, electron) => {
  try {
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation) {
      throw new Error('对话不存在')
    }

    const messages = await electron.loadMessages(conversation.path, conversationId)
    return { conversation, messages }
  } catch (error) {
    throw new Error(`加载对话失败: ${error.message}`)
  }
}

/**
 * 发送新消息
 */
export const sendMessage = async (messageInput, selectedFiles, messages, currentConversation, electron) => {
  if (!currentConversation) {
    throw new Error('没有选中的对话')
  }

  try {
    const newMessage = {
      id: Date.now().toString(),
      content: messageInput,
      timestamp: new Date().toISOString(),
      files: selectedFiles
    }

    const updatedMessages = [...messages, newMessage]
    
    // 保存消息到存储
    await electron.saveMessages(
      currentConversation.path,
      currentConversation.id,
      updatedMessages
    )

    return { updatedMessages }
  } catch (error) {
    throw new Error(`发送消息失败: ${error.message}`)
  }
}

/**
 * 删除消息
 */
export const deleteMessage = async (messageId, messages, currentConversation, electron) => {
  try {
    const updatedMessages = messages.filter(msg => msg.id !== messageId)
    
    // 保存更新后的消息列表
    await electron.saveMessages(
      currentConversation.path,
      currentConversation.id,
      updatedMessages
    )

    return updatedMessages
  } catch (error) {
    throw new Error(`删除消息失败: ${error.message}`)
  }
}

/**
 * 更新消息内容
 */
export const updateMessage = async (messageId, newContent, message, messages, currentConversation, electron) => {
  try {
    const updatedMessage = {
      ...message,
      content: newContent
    }

    const updatedMessages = messages.map(msg =>
      msg.id === messageId ? updatedMessage : msg
    )

    // 保存更新后的消息
    await electron.saveMessages(
      currentConversation.path,
      currentConversation.id,
      updatedMessages
    )

    return updatedMessages
  } catch (error) {
    throw new Error(`更新消息失败: ${error.message}`)
  }
}

/**
 * 重命名消息文件
 */
export const renameMessageFile = async (message, newFileName, messages, currentConversation, electron) => {
  if (!currentConversation || !message.txtFile) {
    throw new Error('无效的对话或消息文件')
  }
  
  try {
    // 查找是否存在同名文件
    const existingMessage = messages.find(msg => 
      msg.txtFile && msg.txtFile.displayName === newFileName
    )

    const result = await electron.renameMessageFile(
      currentConversation.path,
      message.txtFile.displayName,
      newFileName
    )

    if (result.merged && existingMessage) {
      // 合并消息内容
      const mergedMessage = {
        ...existingMessage,
        content: `${existingMessage.content}\n\n${message.content}`,
        txtFile: result
      }

      // 更新消息数组
      const updatedMessages = messages
        .map(msg => msg.id === existingMessage.id ? mergedMessage : msg)
        .filter(msg => msg.id !== message.id)

      // 保存到存储
      await electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        updatedMessages
      )

      return { updatedMessages, merged: true }
    } else {
      // 仅重命名
      const updatedMessage = {
        ...message,
        txtFile: result
      }

      const updatedMessages = messages.map(msg => 
        msg.id === message.id ? updatedMessage : msg
      )

      await electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        updatedMessages
      )

      return { updatedMessages, merged: false }
    }
  } catch (error) {
    throw new Error(`重命名文件失败: ${error.message}`)
  }
} 