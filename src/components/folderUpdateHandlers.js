import toastManager from '../utils/toastManager';

// 添加简单的路径处理函数，替代Node.js的path模块
const pathUtils = {
  basename: (filepath) => {
    // 处理不同操作系统的路径分隔符
    const parts = filepath.split(/[\/\\]/);
    return parts[parts.length - 1];
  },
  
  join: (...parts) => {
    // 简单的路径拼接，处理不同操作系统的路径分隔符
    return parts
      .filter(part => part !== '')
      .join('/')
      .replace(/\/+/g, '/'); // 规范化多个连续的斜杠为单个斜杠
  },
  
  extname: (filename) => {
    // 获取文件扩展名
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }
};

/**
 * 标准化文件路径，使路径格式一致，便于比较
 * @param {string} filePath - 文件路径
 * @returns {string} 标准化后的路径
 */
function normalizePath(filePath) {
  if (!filePath) return '';
  
  // 将所有反斜杠转换为正斜杠
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // 转为小写（Windows系统不区分大小写）
  return normalizedPath.toLowerCase();
}

/**
 * 扫描对话文件夹中的所有文件，包括txt、图片和其他文件
 * @param {Object} window - 窗口对象，用于访问electron API
 * @param {string} conversationPath - 对话文件夹路径
 * @returns {Promise<Array>} 扫描到的文件列表
 */
async function scanConversationFiles(window, conversationPath) {
  // 初始化文件数组
  const allFiles = [];
  
  try {
    // 扫描主文件夹中的文件
    const mainFiles = await window.electron.readDir(conversationPath);
    
    // 处理主文件夹中的文件
    for (const file of mainFiles) {
      // 跳过文件夹和messages.json
      if (file.isDirectory || file.name === 'messages.json' || file.name === 'timemessages.json') {
        continue;
      }
      
      const filePath = pathUtils.join(conversationPath, file.name);
      const fileStats = await window.electron.getFileStats(filePath);
      
      allFiles.push({
        name: file.name,
        path: filePath,
        type: pathUtils.extname(file.name).toLowerCase(),
        size: fileStats.size,
        timestamp: fileStats.modified
      });
    }
    
    // 检查是否存在images子文件夹
    const imagesPath = pathUtils.join(conversationPath, 'images');
    try {
      await window.electron.access(imagesPath);
      
      // 扫描images子文件夹
      const imageFiles = await window.electron.readDir(imagesPath);
      
      // 处理images文件夹中的图片
      for (const file of imageFiles) {
        // 跳过文件夹
        if (file.isDirectory) {
          continue;
        }
        
        const filePath = pathUtils.join(imagesPath, file.name);
        const fileStats = await window.electron.getFileStats(filePath);
        
        allFiles.push({
          name: file.name,
          path: filePath,
          type: pathUtils.extname(file.name).toLowerCase(),
          size: fileStats.size,
          timestamp: fileStats.modified
        });
      }
    } catch (error) {
      // images文件夹不存在，不处理
      console.log('Images文件夹不存在:', imagesPath);
    }
    
    return allFiles;
  } catch (error) {
    console.error('扫描文件失败:', error);
    return [];
  }
}

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
    
    // 新增：自动扫描并添加新文件到messages.json
    console.log('开始扫描并添加新文件到messages.json...');
    let updatedCount = 0;
    
    // 检查所有当前路径下的会话
    const updatePromises = mergedConversations
      .filter(conv => conv.path && conv.path.startsWith(storagePath))
      .map(async (conv) => {
        try {
          const updated = await updateConversationMessages(window, conv.path);
          if (updated) {
            updatedCount++;
          }
          return updated;
        } catch (error) {
          console.error(`处理会话 ${conv.path} 时出错:`, error);
          return false;
        }
      });
    
    await Promise.all(updatePromises);
    
    // 更新应用状态
    setConversations(mergedConversations);
    
    // 保存到本地存储
    localStorage.setItem('aichat_conversations', JSON.stringify(mergedConversations));
    
    if (showAlert) {
      if (hasInvalidConversations) {
        toastManager.warning('更新文件夹成功。注意：一些对话文件夹已不存在并被移除。');
      } else if (updatedCount > 0) {
        toastManager.success(`更新文件夹成功，已在 ${updatedCount} 个会话中添加新文件`);
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
      const basename = pathUtils.basename(conv.path); // 获取路径的最后一部分
      pathBaseNameMap.set(basename, conv);
      
      let modifiedTime;
      try {
        // 尝试从 timemessages.json 获取修改时间
        if (typeof window.electron.getFolderModifiedTime === 'function') {
          modifiedTime = await window.electron.getFolderModifiedTime(conv.path);
        } else {
          // 回退方案：尝试手动读取 timemessages.json 文件
          try {
            const timeMessagesPath = pathUtils.join(conv.path, 'timemessages.json');
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
            const timeMessagesPath = pathUtils.join(conv.path, 'timemessages.json');
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
      const folderName = pathUtils.basename(conv.path);
      
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

/**
 * 识别未在messages.json中记录的新文件
 * @param {Array} existingMessages - 现有的消息数组
 * @param {Array} scannedFiles - 扫描到的文件数组
 * @returns {Array} 新文件数组
 */
function identifyNewFiles(existingMessages, scannedFiles) {
  if (!scannedFiles || scannedFiles.length === 0) {
    return [];
  }
  
  // 创建一个Set存储所有现有消息中记录的文件路径（标准化后）
  const existingFilePaths = new Set();
  
  // 创建一个Map存储文件名到路径的映射，用于检测同名文件
  const fileNameMap = new Map();
  
  // 将现有消息中的文件路径添加到Set中
  existingMessages.forEach(message => {
    // 处理txtFile
    if (message.txtFile && message.txtFile.path) {
      const normalizedPath = normalizePath(message.txtFile.path);
      existingFilePaths.add(normalizedPath);
      
      // 添加文件名映射
      const fileName = pathUtils.basename(message.txtFile.path);
      if (!fileNameMap.has(fileName.toLowerCase())) {
        fileNameMap.set(fileName.toLowerCase(), []);
      }
      fileNameMap.get(fileName.toLowerCase()).push(normalizedPath);
    }
    
    // 处理files数组
    if (message.files && Array.isArray(message.files)) {
      message.files.forEach(file => {
        if (file.path) {
          const normalizedPath = normalizePath(file.path);
          existingFilePaths.add(normalizedPath);
          
          // 添加文件名映射
          const fileName = pathUtils.basename(file.path);
          if (!fileNameMap.has(fileName.toLowerCase())) {
            fileNameMap.set(fileName.toLowerCase(), []);
          }
          fileNameMap.get(fileName.toLowerCase()).push(normalizedPath);
        }
      });
    }
  });
  
  console.log(`现有消息中包含 ${existingFilePaths.size} 个文件`);
  
  // 过滤出不在现有消息中的文件
  const newFiles = scannedFiles.filter(file => {
    // 标准化路径进行比较
    const normalizedPath = normalizePath(file.path);
    
    // 如果路径已存在，则跳过
    if (existingFilePaths.has(normalizedPath)) {
      return false;
    }
    
    // 检查是否是同名文件但路径不同（可能是文件移动）
    const fileName = pathUtils.basename(file.path).toLowerCase();
    if (fileNameMap.has(fileName)) {
      // 记录日志，帮助调试
      console.log(`发现同名文件: ${fileName}, 现有路径: ${fileNameMap.get(fileName).join(', ')}, 新路径: ${normalizedPath}`);
      
      // 如果是images目录下的图片文件，特殊处理
      const isInImagesDir = normalizedPath.includes('/images/');
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
      
      if (isInImagesDir && isImage) {
        // 检查是否有同名文件在非images目录
        const existingNonImageDirPaths = fileNameMap.get(fileName).filter(p => !p.includes('/images/'));
        if (existingNonImageDirPaths.length > 0) {
          console.log(`跳过images目录下的同名图片文件: ${fileName}`);
          return false; // 跳过此文件
        }
      }
    }
    
    return true;
  });
  
  console.log(`发现 ${newFiles.length} 个新文件需要添加到messages.json`);
  return newFiles;
}

/**
 * 将新文件转换为消息对象
 * @param {Array} newFiles - 新文件数组
 * @returns {Array} 新消息对象数组
 */
function convertFilesToMessages(newFiles) {
  if (!newFiles || newFiles.length === 0) {
    return [];
  }
  
  // 按文件类型分组
  const filesByType = new Map();
  
  newFiles.forEach(file => {
    const ext = file.type.toLowerCase();
    // 如果是txt文件，每个文件创建一个单独的消息
    if (ext === '.txt') {
      if (!filesByType.has('txt')) {
        filesByType.set('txt', []);
      }
      filesByType.get('txt').push([file]); // 每个txt文件是一个单独的数组
    } 
    // 图片和其他文件可以合并成一条消息
    else {
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      const type = isImage ? 'image' : 'other';
      
      if (!filesByType.has(type)) {
        filesByType.set(type, []);
      }
      
      // 将所有同类型的文件放在一个数组中
      const lastGroup = filesByType.get(type)[filesByType.get(type).length - 1];
      if (!lastGroup || lastGroup.length >= 5) { // 每组最多5个文件
        filesByType.get(type).push([file]);
      } else {
        lastGroup.push(file);
      }
    }
  });
  
  // 创建消息对象
  const newMessages = [];
  
  // 处理txt文件 - 特殊处理为TypeN类型（不设置type字段）
  if (filesByType.has('txt')) {
    filesByType.get('txt').forEach(fileGroup => {
      const txtFile = fileGroup[0]; // 只有一个文件
      
      // 读取文件名，尝试提取有用信息
      const fileName = txtFile.name;
      const displayName = fileName.replace('.txt', '');
      
      // 使用文件内容或文件名作为消息内容
      const messageContent = txtFile.content ? txtFile.content : `${fileName}`;
      
      // 创建消息对象，不设置type字段（即TypeN类型）
      newMessages.push({
        id: `auto_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        content: messageContent,
        timestamp: txtFile.timestamp,
        txtFile: {
          name: txtFile.name,
          displayName: displayName,
          path: txtFile.path
        }
      });
      
      console.log(`添加TypeN类型的TXT文件消息: ${txtFile.name}`);
    });
  }
  
  // 处理图片文件 - 使用user类型
  if (filesByType.has('image')) {
    filesByType.get('image').forEach(fileGroup => {
      newMessages.push({
        id: `auto_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        content: `Images: ${fileGroup.map(f => f.name).join(', ')}`,
        timestamp: new Date().toISOString(),
        type: 'user', // 明确设置type为user
        files: fileGroup.map(file => ({
          name: file.name,
          path: file.path,
          type: file.type,
          size: file.size
        }))
      });
    });
  }
  
  // 处理其他文件 - 使用user类型
  if (filesByType.has('other')) {
    filesByType.get('other').forEach(fileGroup => {
      newMessages.push({
        id: `auto_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        content: `Files: ${fileGroup.map(f => f.name).join(', ')}`,
        timestamp: new Date().toISOString(),
        type: 'user', // 明确设置type为user
        files: fileGroup.map(file => ({
          name: file.name,
          path: file.path,
          type: file.type,
          size: file.size
        }))
      });
    });
  }
  
  return newMessages;
}

/**
 * 读取txt文件内容
 * @param {Object} window - 窗口对象，用于访问electron API
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 文件内容
 */
async function readTxtFileContent(window, filePath) {
  try {
    // 尝试读取文件内容
    const content = await window.electron.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error(`读取文件失败 ${filePath}:`, error);
    return `[无法读取文件内容: ${error.message}]`;
  }
}

/**
 * 更新会话的messages.json文件，添加新文件
 * @param {Object} window - 窗口对象，用于访问electron API
 * @param {string} conversationPath - 对话文件夹路径
 * @returns {Promise<boolean>} 是否成功更新
 */
async function updateConversationMessages(window, conversationPath) {
  try {
    console.log(`正在处理会话文件夹: ${conversationPath}`);
    
    // 1. 加载现有的messages.json
    let existingMessages = [];
    try {
      existingMessages = await window.electron.loadMessages(conversationPath);
      console.log(`已加载现有消息 ${existingMessages.length} 条`);
      
      // 打印现有消息中文件的数量，帮助调试
      let txtFileCount = 0;
      let attachmentFilesCount = 0;
      
      existingMessages.forEach(msg => {
        if (msg.txtFile && msg.txtFile.path) txtFileCount++;
        if (msg.files && Array.isArray(msg.files)) attachmentFilesCount += msg.files.length;
      });
      
      console.log(`现有消息中包含 ${txtFileCount} 个文本文件和 ${attachmentFilesCount} 个附件文件`);
    } catch (error) {
      console.warn(`无法加载messages.json, 创建新文件: ${error.message}`);
      existingMessages = [];
    }
    
    // 2. 扫描文件夹中的所有文件
    const scannedFiles = await scanConversationFiles(window, conversationPath);
    console.log(`扫描到 ${scannedFiles.length} 个文件`);
    
    // 打印扫描到的文件类型统计
    const fileTypeStats = {};
    scannedFiles.forEach(file => {
      const ext = file.type.toLowerCase();
      fileTypeStats[ext] = (fileTypeStats[ext] || 0) + 1;
    });
    console.log('文件类型统计:', fileTypeStats);
    
    // 3. 识别新文件
    const newFiles = identifyNewFiles(existingMessages, scannedFiles);
    
    // 如果没有新文件，直接返回
    if (newFiles.length === 0) {
      console.log(`没有发现新文件，跳过更新`);
      return false;
    }
    
    // 打印新增文件的类型统计
    const newFileTypeStats = {};
    newFiles.forEach(file => {
      const ext = file.type.toLowerCase();
      newFileTypeStats[ext] = (newFileTypeStats[ext] || 0) + 1;
    });
    console.log('新增文件类型统计:', newFileTypeStats);
    
    // 4. 为.txt文件读取内容
    for (const file of newFiles) {
      if (file.type.toLowerCase() === '.txt') {
        try {
          // 读取文件内容
          const content = await readTxtFileContent(window, file.path);
          file.content = content;
          console.log(`已读取文件内容: ${file.name} (${content.length} 字符)`);
        } catch (error) {
          console.error(`读取文件内容失败: ${file.path}`, error);
          file.content = null;
        }
      }
    }
    
    // 5. 转换新文件为消息对象
    const newMessages = convertFilesToMessages(newFiles);
    console.log(`创建了 ${newMessages.length} 条新消息`);
    
    // 6. 合并并保存更新后的消息
    const updatedMessages = [...existingMessages, ...newMessages];
    console.log(`消息总数从 ${existingMessages.length} 增加到 ${updatedMessages.length}`);
    
    // 确保没有重复的ID
    const idSet = new Set();
    let duplicateCount = 0;
    
    // 检测和修复重复ID
    for (let i = 0; i < updatedMessages.length; i++) {
      const msg = updatedMessages[i];
      if (idSet.has(msg.id)) {
        duplicateCount++;
        // 生成新ID
        const newId = `${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}`;
        console.warn(`发现重复ID: ${msg.id}，替换为: ${newId}`);
        updatedMessages[i] = { ...msg, id: newId };
      } else {
        idSet.add(msg.id);
      }
    }
    
    if (duplicateCount > 0) {
      console.log(`修复了 ${duplicateCount} 个重复ID`);
    }
    
    // 保存到messages.json
    await window.electron.saveMessages(
      conversationPath,
      'auto', // 此处使用自动ID，因为我们只关心路径
      updatedMessages
    );
    
    console.log(`成功更新会话 ${conversationPath} 的messages.json文件`);
    return true;
  } catch (error) {
    console.error(`更新会话消息失败: ${error.message}`, error);
    return false;
  }
} 