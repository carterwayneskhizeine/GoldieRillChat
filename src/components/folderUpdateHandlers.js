import toastManager from '../utils/toastManager';

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
    if (showAlert) toastManager.error('请先在设置中选择存储文件夹');
    return [];
  }

  try {
    // 获取当前对话列表
    const currentConversations = JSON.parse(localStorage.getItem('aichat_conversations') || '[]');
    
    // 从当前会话列表中过滤掉Notes文件夹的会话
    const filteredCurrentConversations = currentConversations.filter(conv => {
      if (!conv.path) return true;
      // 检查路径中是否包含/Notes/或\Notes\
      return !conv.path.includes('/Notes/') && !conv.path.includes('\\Notes\\') && 
             !conv.path.endsWith('/Notes') && !conv.path.endsWith('\\Notes');
    });
    
    // 如果过滤后的数组长度和原数组不同，说明有Notes文件夹的会话被过滤掉了
    if (filteredCurrentConversations.length !== currentConversations.length) {
      console.log('已过滤掉Notes文件夹的会话:', 
                 currentConversations.length - filteredCurrentConversations.length);
    }
    
    // 扫描文件夹获取所有对话
    const folders = await window.electron.scanFolders(storagePath);
    
    // 验证当前对话列表中的对话文件夹是否存在
    let validConversations = [...filteredCurrentConversations];
    let hasInvalidConversations = false;
    
    // 使用Promise.all进行并行验证
    const validationPromises = validConversations.map(async (conv) => {
      if (!conv.path) return false;
      
      try {
        await window.electron.access(conv.path);
        return true;
      } catch (err) {
        console.warn(`对话文件夹不存在: ${conv.path}`);
        hasInvalidConversations = true;
        return false;
      }
    });
    
    const validationResults = await Promise.all(validationPromises);
    
    // 过滤出有效的对话
    validConversations = validConversations.filter((_, index) => validationResults[index]);
    
    // 合并对话列表，但只保留当前存储路径的对话
    const mergedConversations = await mergeConversationsWithPath(validConversations, folders, storagePath);
    
    // 更新应用状态
    setConversations(mergedConversations);
    
    // 保存到本地存储
    localStorage.setItem('aichat_conversations', JSON.stringify(mergedConversations));
    
    if (showAlert) {
      if (hasInvalidConversations) {
        toastManager.warning('更新文件夹成功。注意：一些对话文件夹已不存在并被移除。');
      } else {
        toastManager.success('更新文件夹成功');
      }
    }
    
    return mergedConversations;
  } catch (error) {
    console.error('Failed to update folders:', error);
    if (showAlert) toastManager.error('更新文件夹失败: ' + error.message);
    return [];
  }
};

/**
 * 合并对话列表，只保留指定路径的对话
 * @param {Array} existing - 现有对话列表
 * @param {Array} scanned - 新扫描的对话列表
 * @param {string} currentPath - 当前存储路径
 * @returns {Array} 合并后的对话列表
 */
export const mergeConversationsWithPath = async (existing, scanned, currentPath) => {
  // 只保留以当前存储路径开头的对话
  const filteredExisting = existing.filter(conv => 
    conv.path && conv.path.startsWith(currentPath)
  );
  
  // 使用Map存储合并结果，以路径为键避免重复
  const mergedMap = new Map();
  
  // 添加过滤后的现有对话
  for (const conv of filteredExisting) {
    if (conv.path) {
      try {
        // 先尝试从 messages.json 获取 folderMtime
        const messageData = await window.electron.loadMessages(conv.path, conv.id);
        if (messageData && messageData.folderMtime) {
          conv.modifiedTime = messageData.folderMtime;
        } else {
          // 如果不存在 folderMtime，则使用文件系统的修改时间
          const modifiedTime = await window.electron.getFileModifiedTime(conv.path);
          conv.modifiedTime = modifiedTime;
          
          // 创建或更新 folderMtime
          await window.electron.updateFolderMtime(conv.path);
        }
      } catch (error) {
        console.warn(`获取文件夹修改时间失败: ${conv.path}`, error);
        conv.modifiedTime = new Date(conv.timestamp).getTime();
      }
      mergedMap.set(conv.path, conv);
    }
  }
  
  // 添加或更新扫描到的对话
  for (const conv of scanned) {
    if (conv.path) {
      try {
        // 先尝试从 messages.json 获取 folderMtime
        const messageData = await window.electron.loadMessages(conv.path, conv.id || Date.now().toString());
        if (messageData && messageData.folderMtime) {
          conv.modifiedTime = messageData.folderMtime;
        } else {
          // 如果不存在 folderMtime，则使用文件系统的修改时间
          const modifiedTime = await window.electron.getFileModifiedTime(conv.path);
          conv.modifiedTime = modifiedTime;
          
          // 创建或更新 folderMtime
          await window.electron.updateFolderMtime(conv.path);
        }
      } catch (error) {
        console.warn(`获取文件夹修改时间失败: ${conv.path}`, error);
        conv.modifiedTime = new Date(conv.timestamp).getTime();
      }
      
      // 如果已存在路径相同的对话，保留原始ID和名称，但更新路径和时间戳
      if (mergedMap.has(conv.path)) {
        const existingConv = mergedMap.get(conv.path);
        mergedMap.set(conv.path, {
          ...conv,
          id: existingConv.id,
          name: existingConv.name,
          modifiedTime: conv.modifiedTime
        });
      } else {
        mergedMap.set(conv.path, conv);
      }
    }
  }
  
  // 转换回数组并按修改时间排序
  return Array.from(mergedMap.values())
    .sort((a, b) => b.modifiedTime - a.modifiedTime);
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
  
  // 由于没有传入currentPath，我们只能根据scanned中的路径来判断
  // 获取所有扫描对话的路径前缀，取最长相同前缀
  const pathPrefix = getCommonPathPrefix(scanned);
  return mergeConversationsWithPath(existing, scanned, pathPrefix);
};

/**
 * 获取对话列表中的公共路径前缀
 * @param {Array} conversations - 对话列表
 * @returns {string} 公共路径前缀
 */
function getCommonPathPrefix(conversations) {
  if (!conversations || conversations.length === 0) return '';
  
  // 获取所有有效路径
  const paths = conversations
    .filter(conv => conv.path)
    .map(conv => conv.path);
  
  if (paths.length === 0) return '';
  if (paths.length === 1) return paths[0].substring(0, paths[0].lastIndexOf('/') + 1);
  
  // 获取第一个路径的所有前缀
  const firstPath = paths[0];
  let prefix = '';
  let commonPrefix = '';
  
  // 查找公共前缀
  for (let i = 0; i < firstPath.length; i++) {
    prefix = firstPath.substring(0, i + 1);
    let isCommon = true;
    
    for (let j = 1; j < paths.length; j++) {
      if (!paths[j].startsWith(prefix)) {
        isCommon = false;
        break;
      }
    }
    
    if (isCommon) {
      commonPrefix = prefix;
    } else {
      break;
    }
  }
  
  // 确保前缀以目录分隔符结尾
  const lastSlashIndex = commonPrefix.lastIndexOf('/');
  if (lastSlashIndex > 0) {
    return commonPrefix.substring(0, lastSlashIndex + 1);
  }
  
  return commonPrefix;
} 