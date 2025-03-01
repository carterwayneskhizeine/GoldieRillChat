const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')
const fs = require('fs').promises

contextBridge.exposeInMainWorld('electron', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  createChatFolder: (basePath) => ipcRenderer.invoke('create-chat-folder', basePath),
  createAIChatFolder: (folderPath) => ipcRenderer.invoke('create-aichat-folder', folderPath),
  saveFile: (folderPath, file) => ipcRenderer.invoke('save-file', folderPath, file),
  saveMessageAsTxt: (folderPath, message) => ipcRenderer.invoke('save-message-as-txt', folderPath, message),
  renameMessageFile: (folderPath, oldFileName, newFileName) => 
    ipcRenderer.invoke('rename-message-file', folderPath, oldFileName, newFileName),
  renameFile: (folderPath, oldFileName, newFileName, subDir) =>
    ipcRenderer.invoke('renameFile', folderPath, oldFileName, newFileName, subDir),
  renameChatFolder: (folderPath, newName) =>
    ipcRenderer.invoke('rename-chat-folder', folderPath, newName),
  loadMessageTxt: (filePath) => ipcRenderer.invoke('load-message-txt', filePath),
  saveMessages: (conversationPath, conversationId, messages) => 
    ipcRenderer.invoke('save-messages', conversationPath, conversationId, messages),
  loadMessages: (conversationPath) => 
    ipcRenderer.invoke('load-messages', conversationPath),
  moveToRecycle: (folderPath, fileName) =>
    ipcRenderer.invoke('move-to-recycle', folderPath, fileName),
  moveFolderToRecycle: (folderPath) =>
    ipcRenderer.invoke('move-folder-to-recycle', folderPath),
  deleteMessage: (folderPath, message) =>
    ipcRenderer.invoke('delete-message', folderPath, message),
  openFileLocation: (filePath) => ipcRenderer.invoke('openFileLocation', filePath),
  scanFolders: (basePath) => ipcRenderer.invoke('scanFolders', basePath),
  mkdir: (dirPath) => ipcRenderer.invoke('mkdir', dirPath),
  access: (filePath) => ipcRenderer.invoke('access', filePath),
  
  // 添加书签文件相关处理函数
  selectBookmarkFile: () => ipcRenderer.invoke('select-bookmark-file'),
  readFile: async (filePath) => {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error('读取文件失败:', error);
      throw error;
    }
  },
  
  // 解析书签HTML文件
  parseBookmarksFile: (fileContent) => {
    try {
      // 检查输入
      if (!fileContent || typeof fileContent !== 'string') {
        throw new Error('无效的书签文件内容');
      }

      // 创建一个解析HTML的DOM对象
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, 'text/html');
      
      // 检查解析结果
      if (!doc || !doc.querySelector) {
        throw new Error('HTML解析失败');
      }
      
      const bookmarks = [];
      const folders = [];
      
      // 生成唯一ID
      const generateId = () => Math.random().toString(36).substring(2, 9);
      
      // 创建文件夹ID映射
      const folderMap = new Map();
      
      // 解析所有文件夹（DT > H3元素）
      const folderElements = doc.querySelectorAll('DT > H3');
      
      // 检查是否找到任何文件夹
      if (folderElements.length === 0) {
        console.warn('未找到书签文件夹结构');
      }
      
      folderElements.forEach((folderEl) => {
        const parentDT = folderEl.parentElement;
        if (!parentDT) return;
        
        const folderId = generateId();
        folderMap.set(parentDT, folderId);
        
        // 获取父文件夹ID
        let parentId = undefined;
        let parentDTElement = parentDT.parentElement?.parentElement;
        if (parentDTElement && parentDTElement.tagName === 'DT') {
          parentId = folderMap.get(parentDTElement);
        }
        
        // 创建文件夹对象
        folders.push({
          id: folderId,
          name: folderEl.textContent || '未命名文件夹',
          addDate: Number(folderEl.getAttribute('ADD_DATE') || Date.now()),
          lastModified: Number(folderEl.getAttribute('LAST_MODIFIED') || Date.now()),
          parentId
        });
        
        // 解析文件夹内的书签（A元素）
        try {
          const bookmarkElements = parentDT.querySelectorAll(':scope > DL > DT > A');
          
          // 如果找不到书签，尝试其他选择器
          if (bookmarkElements.length === 0) {
            const altBookmarkElements = parentDT.querySelectorAll('DL DT A');
            altBookmarkElements.forEach((bookmarkEl) => {
              if (bookmarkEl.closest('DT')?.parentElement?.closest('DL')?.parentElement === parentDT) {
                bookmarks.push({
                  id: generateId(),
                  title: bookmarkEl.textContent || '未命名书签',
                  url: bookmarkEl.getAttribute('HREF') || '',
                  icon: bookmarkEl.getAttribute('ICON') || null,
                  addDate: Number(bookmarkEl.getAttribute('ADD_DATE') || Date.now()),
                  folder: folderId
                });
              }
            });
          } else {
            // 使用原始选择器
            bookmarkElements.forEach((bookmarkEl) => {
              bookmarks.push({
                id: generateId(),
                title: bookmarkEl.textContent || '未命名书签',
                url: bookmarkEl.getAttribute('HREF') || '',
                icon: bookmarkEl.getAttribute('ICON') || null,
                addDate: Number(bookmarkEl.getAttribute('ADD_DATE') || Date.now()),
                folder: folderId
              });
            });
          }
        } catch (innerError) {
          console.error('解析书签条目失败:', innerError);
          // 继续处理其他文件夹
        }
      });
      
      // 如果没有找到任何书签，抛出错误
      if (bookmarks.length === 0) {
        throw new Error('未找到任何书签');
      }
      
      return { bookmarks, folders };
    } catch (error) {
      console.error('解析书签文件失败:', error);
      throw new Error(`无法解析书签文件: ${error.message}`);
    }
  },
  
  path: {
    basename: (filePath) => path.basename(filePath),
    dirname: (filePath) => path.dirname(filePath),
    extname: (filePath) => path.extname(filePath),
    join: (...paths) => path.join(...paths)
  },

  // 浏览器相关的方法
  browser: {
    setVisibility: (visible) => ipcRenderer.invoke('set-browser-view-visibility', visible),
    updateSidebarWidth: (width) => ipcRenderer.invoke('update-sidebar-width', width),
    navigate: (url) => ipcRenderer.invoke('browser-navigate', url),
    back: () => ipcRenderer.invoke('browser-back'),
    forward: () => ipcRenderer.invoke('browser-forward'),
    refresh: () => ipcRenderer.invoke('browser-refresh'),

    // 标签页管理
    newTab: (url) => ipcRenderer.invoke('browser-new-tab', url),
    closeTab: (tabId) => ipcRenderer.invoke('browser-close-tab', tabId),
    switchTab: (tabId) => ipcRenderer.invoke('browser-switch-tab', tabId),

    // 事件监听
    onLoading: (callback) => {
      ipcRenderer.on('browser-loading', (_, loading) => callback(loading))
      return () => ipcRenderer.removeListener('browser-loading', callback)
    },
    onUrlUpdate: (callback) => {
      ipcRenderer.on('browser-url-update', (_, url) => callback(url))
      return () => ipcRenderer.removeListener('browser-url-update', callback)
    },
    onTitleUpdate: (callback) => {
      ipcRenderer.on('browser-title-update', (_, title) => callback(title))
      return () => ipcRenderer.removeListener('browser-title-update', callback)
    },
    onTabsUpdate: (callback) => {
      ipcRenderer.on('browser-tabs-update', (_, tabs) => callback(tabs))
      return () => ipcRenderer.removeListener('browser-tabs-update', callback)
    },
    onActiveTabUpdate: (callback) => {
      ipcRenderer.on('browser-active-tab-update', (_, tabId) => callback(tabId))
      return () => ipcRenderer.removeListener('browser-active-tab-update', callback)
    },
    removeListener: (channel) => {
      ipcRenderer.removeAllListeners(channel)
    }
  },

  // 添加窗口控制接口
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
    onMaximizedStateChanged: (callback) => {
      ipcRenderer.on('window-maximized-state-changed', (_, isMaximized) => callback(isMaximized))
      return () => {
        ipcRenderer.removeListener('window-maximized-state-changed', callback)
      }
    }
  },

  // 获取配置文件路径
  getPath: (name) => {
    if (name === 'tailwindConfig') {
      return path.join(__dirname, '../tailwind.config.cjs');
    }
    return '';
  },
  
  // 读取文件内容
  readFile: async (filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error('读取文件失败:', error);
      throw error;
    }
  },
  
  // 读取二进制文件内容
  readBinaryFile: async (filePath) => {
    try {
      const content = await fs.readFile(filePath);
      return content;
    } catch (error) {
      console.error('读取二进制文件失败:', error);
      throw error;
    }
  },
  
  // 写入文件内容
  writeFile: async (filePath, content) => {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('写入文件失败:', error);
      throw error;
    }
  },

  // 加载图片到编辑器
  loadImageToEditor: (imagePath) => {
    const img = new Image();
    img.onload = () => {
      if (window.editorState) {
        window.editorState = {
          ...window.editorState,
          image: img,
          scale: 1,
          rotation: 0,
          flipH: false,
          flipV: false,
          offsetX: 0,
          offsetY: 0
        };
      }
      if (window.setImageSize) {
        window.setImageSize({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      }
    };
    img.src = `local-file://${imagePath}`;
  },

  // 删除文件
  removeFile: async (filePath) => {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('删除文件失败:', error);
      throw error;
    }
  },

  // 添加 aichat 对象
  aichat: {
    createNewConversation: async (basePath) => {
      try {
        return await ipcRenderer.invoke('create-aichat-folder', basePath);
      } catch (error) {
        console.error('创建新对话失败:', error);
        throw error;
      }
    }
  },

  // 添加 AI 图片生成相关功能
  generateImage: ({ prompt, model, image_size, conversationPath, apiKey, apiHost }) => 
    ipcRenderer.invoke('generate-image', { prompt, model, image_size, conversationPath, apiKey, apiHost }),

  // 添加音频文件处理
  saveAudioFile: async ({ conversationPath, fileName, data }) => {
    try {
      // 创建音频文件夹
      const audioDir = path.join(conversationPath, 'audio');
      await fs.mkdir(audioDir, { recursive: true });

      // 保存音频文件
      const filePath = path.join(audioDir, fileName);
      await fs.writeFile(filePath, Buffer.from(data));

      return {
        fileName,
        path: filePath,
        displayName: fileName
      };
    } catch (error) {
      console.error('保存音频文件失败:', error);
      throw error;
    }
  },

  // 在contextBridge.exposeInMainWorld的对象中添加书签相关API
  bookmarks: {
    // 添加书签
    addBookmark: (bookmark) => ipcRenderer.invoke('bookmarks-add', bookmark),
    
    // 移除书签
    removeBookmark: (bookmarkId) => ipcRenderer.invoke('bookmarks-remove', bookmarkId),
    
    // 获取所有书签
    getAllBookmarks: () => ipcRenderer.invoke('bookmarks-get-all'),
    
    // 获取书签 (与getAllBookmarks相同，提供一个更简洁的别名)
    getBookmarks: () => ipcRenderer.invoke('bookmarks-get-all'),
    
    // 获取所有书签文件夹
    getFolders: () => ipcRenderer.invoke('bookmarks-get-folders'),
    
    // 删除书签
    deleteBookmark: (id) => ipcRenderer.invoke('bookmarks-delete', id),
    
    // 切换书签面板显示状态
    toggleBookmarksPanel: (isVisible) => ipcRenderer.invoke('bookmarks-toggle-panel', isVisible),
    
    // 监听书签面板状态变化
    onBookmarksPanelToggle: (callback) => {
      ipcRenderer.on('bookmarks-panel-toggle', (_, isVisible) => callback(isVisible))
      return () => ipcRenderer.removeListener('bookmarks-panel-toggle', callback)
    },
    
    // 导入书签和文件夹
    importBookmarks: (bookmarks, folders) => ipcRenderer.invoke('bookmarks-import', { bookmarks, folders }),

    // 添加解析并导入书签函数
    parseAndImportBookmarks: (fileContent) => ipcRenderer.invoke('parse-and-import-bookmarks', fileContent)
  },

  // 文件操作
  ensureDirectory: (basePath, dirName) => ipcRenderer.invoke('ensure-directory', basePath, dirName),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('write-text-file', filePath, content),
  
  // 笔记相关方法
  notes: {
    initialize: (storagePath) => ipcRenderer.invoke('initialize-notes', storagePath),
    load: (filePath) => ipcRenderer.invoke('load-note', filePath),
    save: (filePath, content) => ipcRenderer.invoke('save-note', filePath, content),
    list: (storagePath) => ipcRenderer.invoke('list-notes', storagePath),
  },

  // 着色器预设相关函数
  shaderPresets: {
    // 初始化着色器预设
    initShaderPresets: () => ipcRenderer.invoke('init-shader-presets'),
    
    // 获取所有着色器预设
    getAllPresets: () => ipcRenderer.invoke('get-all-shader-presets'),
    
    // 加载指定的着色器预设
    loadPreset: (presetId) => ipcRenderer.invoke('load-shader-preset', presetId),
    
    // 保存着色器预设
    savePreset: (presetId, vertexShader, fragmentShader) => 
      ipcRenderer.invoke('save-shader-preset', presetId, vertexShader, fragmentShader),
      
    // 重置指定的预设（只对Shaders1有效）
    resetDefaultPreset: () => ipcRenderer.invoke('reset-default-shader-preset')
  },
})

// 添加视频生成相关的 API
contextBridge.exposeInMainWorld('video', {
  generate: (params) => ipcRenderer.invoke('generate-video', params),
  getStatus: (params) => ipcRenderer.invoke('get-video-status', params),
  download: (params) => ipcRenderer.invoke('download-video', params)
}); 