/**
 * 更新文件夹列表
 * @param {string} storagePath - 存储路径
 * @param {Function} setConversations - 设置对话列表的函数
 * @param {Object} window - 窗口对象，用于访问electron API
 * @param {boolean} showAlert - 是否显示提示，默认为true
 * @returns {Promise<Array>} 更新后的对话列表
 */
export const handleUpdateFolders = async (storagePath, setConversations, window, showAlert = true) => {
  if (!storagePath) {
    if (showAlert) alert('请先在设置中选择存储文件夹');
    return [];
  }

  try {
    // 获取当前对话列表
    const currentConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    
    // 扫描文件夹获取所有对话
    const folders = await window.electron.scanFolders(storagePath);
    
    // 合并对话列表，避免丢失数据
    const mergedConversations = mergeConversations(currentConversations, folders);
    
    // 更新应用状态
    setConversations(mergedConversations);
    
    // 保存到本地存储
    localStorage.setItem('conversations', JSON.stringify(mergedConversations));
    
    if (showAlert) alert('更新文件夹成功');
    
    return mergedConversations;
  } catch (error) {
    console.error('Failed to update folders:', error);
    if (showAlert) alert('更新文件夹失败: ' + error.message);
    return [];
  }
};

/**
 * 合并对话列表，避免重复
 * @param {Array} existing - 现有对话列表
 * @param {Array} scanned - 新扫描的对话列表
 * @returns {Array} 合并后的对话列表
 */
export const mergeConversations = (existing, scanned) => {
  if (!existing || existing.length === 0) return scanned;
  if (!scanned || scanned.length === 0) return existing;
  
  // 使用Map存储合并结果，以路径为键避免重复
  const mergedMap = new Map();
  
  // 添加现有对话
  existing.forEach(conv => {
    if (conv.path) {
      mergedMap.set(conv.path, conv);
    }
  });
  
  // 添加或更新扫描到的对话
  scanned.forEach(conv => {
    if (conv.path) {
      // 如果已存在路径相同的对话，保留原始ID和名称，但更新路径和时间戳
      if (mergedMap.has(conv.path)) {
        const existingConv = mergedMap.get(conv.path);
        mergedMap.set(conv.path, {
          ...conv,
          id: existingConv.id,
          name: existingConv.name
        });
      } else {
        mergedMap.set(conv.path, conv);
      }
    }
  });
  
  // 转换回数组并按时间戳排序
  return Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}; 