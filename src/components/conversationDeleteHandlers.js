/**
 * 删除对话
 * @param {string} conversationId - 对话ID
 * @param {Array} conversations - 对话列表
 * @param {Object} currentConversation - 当前对话
 * @param {Function} setConversations - 设置对话列表的函数
 * @param {Function} setCurrentConversation - 设置当前对话的函数
 * @param {Function} setMessages - 设置消息列表的函数
 * @param {Object} window - 窗口对象，用于访问electron API
 */
import toastManager from '../utils/toastManager';

export const handleConversationDelete = async (
  conversationId,
  conversations,
  currentConversation,
  setConversations,
  setCurrentConversation,
  setMessages,
  window
) => {
  try {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    // 无论文件夹是否存在，都更新状态和存储
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);
    localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
    
    // 如果删除的是当前会话，则清空当前会话
    if (currentConversation && currentConversation.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
      localStorage.setItem('aichat_current_conversation', '');
    }
    
    try {
      // 检查文件夹是否存在
      await window.electron.access(conversation.path);
      
      // 文件夹存在，则移动到回收站
      await window.electron.moveFolderToRecycle(conversation.path);
      toastManager.success('对话已删除');
    } catch (fileError) {
      // 文件夹不存在，只记录日志，不阻止删除操作继续
      console.warn(`删除对话时文件夹不存在: ${conversation.path}`, fileError);
      toastManager.warning('对话已从列表中移除，但文件夹已不存在');
    }
    
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    toastManager.error('删除对话失败: ' + error.message);
  }
}; 

// 为了保持向后兼容性，提供原始函数名的别名
export const deleteConversation = handleConversationDelete; 