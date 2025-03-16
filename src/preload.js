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

  // 文件读写操作
  readFile: async (filePath, encoding = 'utf8') => {
    try {
      return await fs.readFile(filePath, encoding);
    } catch (error) {
      console.error('读取文件失败:', error);
      throw error;
    }
  },

  writeFile: async (filePath, content, encoding = 'utf8') => {
    try {
      await fs.writeFile(filePath, content, encoding);
      return true;
    } catch (error) {
      console.error('写入文件失败:', error);
      throw error;
    }
  },

  // 创建或更新 timemessages.json 文件
  createTimeMessagesFile: async (folderPath) => {
    try {
      const timeMessagesPath = path.join(folderPath, 'timemessages.json');
      const currentTime = new Date().toISOString();
      const timeData = [{
        folderMtime: currentTime
      }];
      await fs.writeFile(timeMessagesPath, JSON.stringify(timeData, null, 2), 'utf8');
      return currentTime;
    } catch (error) {
      console.error('创建 timemessages.json 失败:', error);
      throw error;
    }
  },

  // 更新 timemessages.json 中的修改时间
  updateFolderModifiedTime: async (folderPath) => {
    try {
      const timeMessagesPath = path.join(folderPath, 'timemessages.json');
      let timeData = [];
      
      // 尝试读取现有文件
      try {
        const data = await fs.readFile(timeMessagesPath, 'utf8');
        timeData = JSON.parse(data);
      } catch (error) {
        // 文件不存在或无法解析，创建新数组
        timeData = [{}];
      }
      
      // 更新时间戳
      const currentTime = new Date().toISOString();
      if (timeData.length > 0) {
        timeData[0].folderMtime = currentTime;
      } else {
        timeData.push({ folderMtime: currentTime });
      }
      
      // 写回文件
      await fs.writeFile(timeMessagesPath, JSON.stringify(timeData, null, 2), 'utf8');
      return currentTime;
    } catch (error) {
      console.error('更新文件夹修改时间失败:', error);
      throw error;
    }
  },
  
  // 读取文件夹的修改时间
  getFolderModifiedTime: async (folderPath) => {
    try {
      const timeMessagesPath = path.join(folderPath, 'timemessages.json');
      
      // 尝试读取文件
      try {
        const data = await fs.readFile(timeMessagesPath, 'utf8');
        const timeData = JSON.parse(data);
        
        if (timeData.length > 0 && timeData[0].folderMtime) {
          return new Date(timeData[0].folderMtime).getTime();
        }
      } catch (error) {
        // 文件不存在或无法读取
        console.warn('读取 timemessages.json 失败，使用文件系统时间:', error);
      }
      
      // 如果无法读取 timemessages.json，回退到使用文件系统的修改时间
      const stats = await fs.stat(folderPath);
      return stats.mtime.getTime();
    } catch (error) {
      console.error('获取文件夹修改时间失败:', error);
      throw error;
    }
  },

  // 路径操作
  path: {
    join: (...args) => path.join(...args),
    dirname: (p) => path.dirname(p),
    basename: (p) => path.basename(p)
  },

  // IPC通信
  ipcRenderer: {
    // 发送消息到主进程
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    
    // 监听从主进程发送的消息
    on: (channel, callback) => {
      ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
    },
    
    // 移除特定通道的所有监听器
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    },
    
    // 监听一次性消息
    once: (channel, callback) => {
      ipcRenderer.once(channel, (event, ...args) => callback(event, ...args));
    }
  }
};

// 将 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electron', electronAPI);

// 处理来自渲染进程的请求，通过IPC发送到主进程
ipcRenderer.on('dashscope-detect', (event, data) => {
  // 转发到主进程
  ipcRenderer.send('dashscope-detect', data);
});

ipcRenderer.on('dashscope-synthesis', (event, data) => {
  // 转发到主进程
  ipcRenderer.send('dashscope-synthesis', data);
});

ipcRenderer.on('dashscope-poll-task', (event, data) => {
  // 转发到主进程
  ipcRenderer.send('dashscope-poll-task', data);
});

// 添加VideoRetalk相关IPC处理
ipcRenderer.on('dashscope-videoretalk', (event, data) => {
  // 转发到主进程
  ipcRenderer.send('dashscope-videoretalk', data);
});

// ... existing code ... 