/**
 * 删除对话
 * @param {string} conversationId - 要删除的对话ID
 * @param {Array} conversations - 对话列表
 * @param {Object} currentConversation - 当前对话
 * @param {Function} setConversations - 设置对话列表的函数
 * @param {Function} setCurrentConversation - 设置当前对话的函数
 * @param {Function} setMessages - 设置消息列表的函数
 * @param {Object} window - 窗口对象，用于访问electron API
 */
export const deleteConversation = async (
  conversationId,
  conversations,
  currentConversation,
  setConversations,
  setCurrentConversation,
  setMessages,
  window
) => {
  const conversation = conversations.find(c => c.id === conversationId)
  if (!conversation) return

  try {
    // Move conversation folder to recycle bin
    await window.electron.moveFolderToRecycle(conversation.path)
    
    // Update state
    setConversations(prev => prev.filter(c => c.id !== conversationId))
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null)
      setMessages([])
    }
    
    // Update storage
    localStorage.setItem('conversations', JSON.stringify(
      conversations.filter(c => c.id !== conversationId)
    ))
  } catch (error) {
    console.error('Failed to delete conversation:', error)
    alert('删除对话失败')
  }
} 