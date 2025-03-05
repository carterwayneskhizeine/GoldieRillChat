const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// 创建一个统一的 API 对象
const electronAPI = {
  // 文件系统操作
  getFileStats: async (filePath) => {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      console.error('获取文件状态失败:', error);
      throw error;
    }
  },

  getFileModifiedTime: async (filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime.getTime();
    } catch (error) {
      console.error('获取文件修改时间失败:', error);
      throw error;
    }
  },

  // 保存消息到 messages.json 文件并更新修改时间
  saveMessages: async (conversationPath, conversationId, messages) => {
    try {
      // 确保存在消息数组
      if (!Array.isArray(messages)) {
        throw new Error('消息必须是数组');
      }

      // 检查是否存在 folderMtime 字段，如果不存在则添加
      let messageData = { messages: messages };
      
      // 更新文件夹修改时间为当前时间
      messageData.folderMtime = Date.now();
      
      const messagesFilePath = path.join(conversationPath, 'messages.json');
      await fs.writeFile(messagesFilePath, JSON.stringify(messageData, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('保存消息失败:', error);
      throw error;
    }
  },

  // 加载消息并获取文件夹修改时间
  loadMessages: async (conversationPath, conversationId) => {
    try {
      const messagesFilePath = path.join(conversationPath, 'messages.json');
      
      // 检查文件是否存在
      try {
        await fs.access(messagesFilePath);
      } catch (error) {
        // 文件不存在，创建带有 folderMtime 的文件
        const initialData = {
          folderMtime: Date.now(),
          messages: []
        };
        await fs.writeFile(messagesFilePath, JSON.stringify(initialData, null, 2), 'utf8');
        return { folderMtime: initialData.folderMtime, messages: [] };
      }
      
      // 读取消息文件
      const content = await fs.readFile(messagesFilePath, 'utf8');
      
      try {
        // 尝试解析为带有 folderMtime 的格式
        const data = JSON.parse(content);
        
        // 检查是否是老格式的 messages.json (直接是消息数组)
        if (Array.isArray(data)) {
          // 转换为新格式
          const newData = {
            folderMtime: Date.now(), // 使用当前时间
            messages: data
          };
          
          // 保存为新格式
          await fs.writeFile(messagesFilePath, JSON.stringify(newData, null, 2), 'utf8');
          return newData;
        }
        
        // 检查是否已经是新格式 (有 folderMtime 和 messages 字段)
        if (data.messages && Array.isArray(data.messages)) {
          // 已经是新格式
          return data;
        } else if (!data.folderMtime) {
          // 有消息但没有 folderMtime 字段
          data.folderMtime = Date.now();
          
          // 保存更新后的数据
          await fs.writeFile(messagesFilePath, JSON.stringify(data, null, 2), 'utf8');
        }
        
        return data;
      } catch (error) {
        console.error('解析消息文件失败:', error);
        // 如果解析失败，返回空数组和当前时间
        return { folderMtime: Date.now(), messages: [] };
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      throw error;
    }
  },

  // 更新文件夹修改时间
  updateFolderMtime: async (conversationPath) => {
    try {
      const messagesFilePath = path.join(conversationPath, 'messages.json');
      
      // 检查文件是否存在
      try {
        await fs.access(messagesFilePath);
      } catch (error) {
        // 文件不存在，创建新文件
        const initialData = {
          folderMtime: Date.now(),
          messages: []
        };
        await fs.writeFile(messagesFilePath, JSON.stringify(initialData, null, 2), 'utf8');
        return initialData.folderMtime;
      }
      
      // 读取当前文件内容
      const content = await fs.readFile(messagesFilePath, 'utf8');
      let data;
      
      try {
        data = JSON.parse(content);
        
        // 处理老格式的 messages.json
        if (Array.isArray(data)) {
          data = {
            folderMtime: Date.now(),
            messages: data
          };
        } else if (!data.folderMtime) {
          // 添加 folderMtime 字段
          data.folderMtime = Date.now();
        } else {
          // 更新 folderMtime 字段
          data.folderMtime = Date.now();
        }
        
        // 保存更新后的数据
        await fs.writeFile(messagesFilePath, JSON.stringify(data, null, 2), 'utf8');
        return data.folderMtime;
      } catch (error) {
        console.error('解析或更新消息文件失败:', error);
        // 如果解析失败，创建新的数据结构
        const newData = {
          folderMtime: Date.now(),
          messages: []
        };
        await fs.writeFile(messagesFilePath, JSON.stringify(newData, null, 2), 'utf8');
        return newData.folderMtime;
      }
    } catch (error) {
      console.error('更新文件夹修改时间失败:', error);
      throw error;
    }
  },

  // 文件夹操作
  mkdir: async (path) => {
    try {
      await fs.mkdir(path, { recursive: true });
    } catch (error) {
      console.error('创建文件夹失败:', error);
      throw error;
    }
  },

  // 路径操作
  path: {
    join: (...args) => path.join(...args),
    dirname: (p) => path.dirname(p),
    basename: (p) => path.basename(p)
  },

  // ... 其他现有的 API 函数 ...
};

// 将 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electron', electronAPI);

// ... existing code ... 