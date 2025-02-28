/**
 * 选择存储文件夹
 * @param {Function} setStoragePath - 设置存储路径的函数
 * @param {Object} currentConversation - 当前对话
 * @param {Array} messages - 消息列表
 * @param {Object} window - 窗口对象，用于访问electron API
 * @param {Function} setConversations - 设置对话列表的函数
 * @param {Function} setCurrentConversation - 设置当前对话的函数
 */
import toastManager from '../utils/toastManager';

export const handleSelectFolder = async (setStoragePath, currentConversation, messages, window, setConversations = null, setCurrentConversation = null) => {
  try {
    const result = await window.electron.selectFolder()
    if (result) {
      // 设置新的存储路径
      setStoragePath(result)
      localStorage.setItem('storagePath', result)
      
      // 清空本地存储中的旧对话列表
      localStorage.setItem('aichat_conversations', JSON.stringify([]))
      
      // 立即更新应用中的对话列表（如果提供了设置函数）
      if (setConversations) {
        setConversations([])
      }
      
      // 清除当前选中的对话（如果提供了设置函数）
      if (setCurrentConversation) {
        setCurrentConversation(null)
        localStorage.setItem('aichat_current_conversation', '')
      }
      
      // 保存当前消息到新位置
      if (currentConversation) {
        await window.electron.saveMessages(
          result,
          currentConversation.id,
          messages
        )
      }
      
      // 扫描新文件夹
      try {
        const folders = await window.electron.scanFolders(result)
        // 更新本地存储
        localStorage.setItem('aichat_conversations', JSON.stringify(folders))
        
        // 更新应用状态（如果提供了设置函数）
        if (setConversations) {
          setConversations(folders)
        }
        
        // 通知用户
        toastManager.success('存储位置已更改为新文件夹，对话列表已更新')
      } catch (scanError) {
        console.error('扫描新文件夹失败:', scanError)
        toastManager.error('扫描新文件夹失败: ' + scanError.message)
      }
    }
  } catch (error) {
    console.error('Failed to select folder:', error)
    toastManager.error('选择文件夹失败: ' + error.message)
  }
} 