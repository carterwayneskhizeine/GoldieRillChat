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
  
  // 创建一个映射表，用于跟踪被重命名的文件夹
  // 键为旧路径的basename，值为Conv对象
  const pathBaseNameMap = new Map();
  
  // 添加过滤后的现有对话到映射表
  for (const conv of filteredExisting) {
    if (conv.path) {
      // 保存路径basename到原始对话的映射
      const basename = conv.path.split(/[\\/]/).pop(); // 获取路径的最后一部分
      pathBaseNameMap.set(basename, conv);
      
      let modifiedTime;
      try {
        // 尝试从 timemessages.json 获取修改时间
        if (typeof window.electron.getFolderModifiedTime === 'function') {
          modifiedTime = await window.electron.getFolderModifiedTime(conv.path);
        } else {
          // 回退方案：尝试手动读取 timemessages.json 文件
          try {
            const timeMessagesPath = window.electron.path.join(conv.path, 'timemessages.json');
            const data = await window.electron.readFile(timeMessagesPath, 'utf8');
            const timeData = JSON.parse(data);
            if (timeData.length > 0 && timeData[0].folderMtime) {
              modifiedTime = new Date(timeData[0].folderMtime).getTime();
            } else {
              throw new Error('无效的时间数据');
            }
          } catch (readError) {
            // 如果无法读取 timemessages.json，回退到系统文件修改时间
            const stats = await window.electron.getFileModifiedTime(conv.path);
            modifiedTime = stats;
          }
        }
      } catch (error) {
        console.warn(`获取文件夹修改时间失败: ${conv.path}`, error);
        modifiedTime = new Date(conv.timestamp).getTime();
      }
      conv.modifiedTime = modifiedTime;
      mergedMap.set(conv.path, conv);
    }
  }
  
  // 添加或更新扫描到的对话
  for (const conv of scanned) {
    if (conv.path) {
      let modifiedTime;
      try {
        // 尝试从 timemessages.json 获取修改时间
        if (typeof window.electron.getFolderModifiedTime === 'function') {
          modifiedTime = await window.electron.getFolderModifiedTime(conv.path);
        } else {
          // 回退方案：尝试手动读取 timemessages.json 文件
          try {
            const timeMessagesPath = window.electron.path.join(conv.path, 'timemessages.json');
            const data = await window.electron.readFile(timeMessagesPath, 'utf8');
            const timeData = JSON.parse(data);
            if (timeData.length > 0 && timeData[0].folderMtime) {
              modifiedTime = new Date(timeData[0].folderMtime).getTime();
            } else {
              throw new Error('无效的时间数据');
            }
          } catch (readError) {
            // 如果无法读取 timemessages.json，回退到系统文件修改时间
            const stats = await window.electron.getFileModifiedTime(conv.path);
            modifiedTime = stats;
          }
        }
      } catch (error) {
        console.warn(`获取文件夹修改时间失败: ${conv.path}`, error);
        modifiedTime = new Date(conv.timestamp).getTime();
      }
      conv.modifiedTime = modifiedTime;
      
      // 获取文件夹名称
      const folderName = conv.path.split(/[\\/]/).pop();
      
      // 检查是否已存在路径相同的对话
      if (mergedMap.has(conv.path)) {
        const existingConv = mergedMap.get(conv.path);
        mergedMap.set(conv.path, {
          ...conv,
          id: existingConv.id,
          name: existingConv.name,
          modifiedTime: modifiedTime
        });
      } 
      // 检查是否是重命名的文件夹
      else if (pathBaseNameMap.has(folderName)) {
        // 如果是已存在的文件夹（使用文件夹名称匹配）但路径变了，表示重命名了父目录
        console.warn('检测到可能的文件夹重命名：', folderName);
        // 不添加新记录，而是更新现有记录的路径
      }
      else {
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