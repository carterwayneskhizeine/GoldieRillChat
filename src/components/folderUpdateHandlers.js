/**
 * 更新文件夹列表
 * @param {string} storagePath - 存储路径
 * @param {Function} setConversations - 设置对话列表的函数
 * @param {Object} window - 窗口对象，用于访问electron API
 */
export const handleUpdateFolders = async (storagePath, setConversations, window) => {
  if (!storagePath) {
    alert('请先在设置中选择存储文件夹')
    return
  }

  try {
    const folders = await window.electron.scanFolders(storagePath)
    setConversations(folders)
    // 保存到本地存储
    localStorage.setItem('conversations', JSON.stringify(folders))
    alert('更新文件夹成功')
  } catch (error) {
    console.error('Failed to update folders:', error)
    alert('更新文件夹失败')
  }
} 