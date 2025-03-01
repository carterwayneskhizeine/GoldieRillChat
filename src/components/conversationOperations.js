/**
 * 加载所有对话历史
 * @returns {Promise<Array>} 对话列表
 */
export const loadConversations = async () => {
  try {
    // 从 localStorage 加载对话历史
    const savedConversations = JSON.parse(localStorage.getItem('conversations') || '[]')
    
    // 过滤掉Notes文件夹相关的对话
    const filteredConversations = savedConversations.filter(conv => {
      if (!conv.path) return true;
      // 检查路径中是否包含/Notes/或\Notes\
      return !conv.path.includes('/Notes/') && !conv.path.includes('\\Notes\\') && 
             !conv.path.endsWith('/Notes') && !conv.path.endsWith('\\Notes');
    });
    
    // 如果过滤掉了一些对话，更新localStorage
    if (filteredConversations.length !== savedConversations.length) {
      console.log('已过滤掉Notes文件夹的对话:', 
                 savedConversations.length - filteredConversations.length);
      localStorage.setItem('conversations', JSON.stringify(filteredConversations));
    }
    
    return filteredConversations
  } catch (error) {
    console.error('Failed to load conversations:', error)
    throw new Error('加载对话历史失败')
  }
}

/**
 * 创建新的对话
 * @param {string} storagePath - 存储路径
 * @param {Array} conversations - 当前对话列表
 * @param {Object} electronApi - Electron API 接口
 * @returns {Promise<Object>} 新创建的对话信息
 */
export const createNewConversation = async (storagePath, conversations, electronApi) => {
  if (!storagePath) {
    throw new Error('请先在设置中选择存储文件夹')
  }

  try {
    const result = await electronApi.createChatFolder(storagePath)
    
    const newConversation = {
      id: Date.now().toString(),
      name: result.name,
      timestamp: new Date().toISOString(),
      path: result.path
    }
    
    // Save to storage
    const updatedConversations = [...conversations, newConversation]
    localStorage.setItem('conversations', JSON.stringify(updatedConversations))
    
    return {
      newConversation,
      updatedConversations
    }
  } catch (error) {
    console.error('Failed to create new conversation:', error)
    throw new Error('创建新对话失败')
  }
}

/**
 * 加载特定对话的消息
 * @param {string} conversationId - 对话ID
 * @param {Array} conversations - 当前对话列表
 * @param {Object} electronApi - Electron API 接口
 * @returns {Promise<Object>} 加载的对话信息和消息
 */
export const loadConversation = async (conversationId, conversations, electronApi) => {
  const conversation = conversations.find(c => c.id === conversationId)
  if (!conversation) {
    throw new Error('对话不存在')
  }

  try {
    const loadedMessages = await electronApi.loadMessages(conversation.path, conversationId)
    return {
      conversation,
      messages: loadedMessages || []
    }
  } catch (error) {
    console.error('Failed to load messages:', error)
    throw new Error('加载消息失败')
  }
} 