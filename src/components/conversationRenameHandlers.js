/**
 * 重命名对话文件夹
 * @param {Object} conversation - 要重命名的对话
 * @param {string} newName - 新的文件夹名称
 * @param {Array} conversations - 对话列表
 * @param {Object} currentConversation - 当前对话
 * @param {Function} setConversations - 设置对话列表的函数
 * @param {Function} setCurrentConversation - 设置当前对话的函数
 * @param {Function} setEditingFolderName - 设置正在编辑的文件夹名称的函数
 * @param {Function} setFolderNameInput - 设置文件夹名称输入的函数
 * @param {Object} window - 窗口对象，用于访问electron API
 */
export const renameChatFolder = async (
  conversation, 
  newName, 
  conversations,
  currentConversation,
  setConversations, 
  setCurrentConversation,
  setEditingFolderName,
  setFolderNameInput,
  window
) => {
  try {
    // 保存旧路径，用于更新消息路径
    const oldPath = conversation.path;
    
    const result = await window.electron.renameChatFolder(conversation.path, newName)
    
    // Update conversations state
    const updatedConversations = conversations.map(conv => 
      conv.id === conversation.id 
        ? { ...conv, name: result.name, path: result.path }
        : conv
    )
    
    setConversations(updatedConversations)
    if (currentConversation?.id === conversation.id) {
      setCurrentConversation({ ...currentConversation, name: result.name, path: result.path })
    }
    
    // Update storage
    localStorage.setItem('conversations', JSON.stringify(updatedConversations))
    
    // 更新消息中的路径信息
    try {
      console.log('更新消息路径:', oldPath, '->', result.path);
      await window.electron.updateMessagesPath(oldPath, result.path);
    } catch (pathError) {
      console.error('更新消息路径失败:', pathError);
      // 不中断重命名流程，仅记录错误
    }
  } catch (error) {
    console.error('Failed to rename chat folder:', error)
    alert('重命名失败')
  }
  
  setEditingFolderName(null)
  setFolderNameInput('')
} 