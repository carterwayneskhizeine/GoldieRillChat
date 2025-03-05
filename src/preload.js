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