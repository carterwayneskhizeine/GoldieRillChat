/**
 * 选择存储文件夹
 * @param {Function} setStoragePath - 设置存储路径的函数
 * @param {Object} currentConversation - 当前对话
 * @param {Array} messages - 消息列表
 * @param {Object} window - 窗口对象，用于访问electron API
 */
export const handleSelectFolder = async (setStoragePath, currentConversation, messages, window) => {
  try {
    const result = await window.electron.selectFolder()
    if (result) {
      setStoragePath(result)
      localStorage.setItem('storagePath', result)
      // Save current messages to the new location
      if (currentConversation) {
        await window.electron.saveMessages(
          result,
          currentConversation.id,
          messages
        )
      }
    }
  } catch (error) {
    console.error('Failed to select folder:', error)
  }
} 