const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs').promises

function registerNotesIpc() {
  // 文件操作相关的IPC处理程序
  ipcMain.handle('ensure-directory', async (event, basePath, dirName) => {
    try {
      const dirPath = path.join(basePath, dirName);
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error(`确保目录存在失败 (${dirName}):`, error);
      throw error;
    }
  });

  ipcMain.handle('file-exists', async (event, filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('read-text-file', async (event, filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error(`读取文件失败 (${filePath}):`, error);
      throw error;
    }
  });

  ipcMain.handle('write-text-file', async (event, filePath, content) => {
    try {
      // 确保目录存在
      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });

      // 写入文件
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error(`写入文件失败 (${filePath}):`, error);
      throw error;
    }
  });

  // 笔记相关的IPC处理程序
  ipcMain.handle('initialize-notes', async (event, storagePath) => {
    try {
      // 确保Notes目录存在
      const notesPath = path.join(storagePath, 'Notes');
      await fs.mkdir(notesPath, { recursive: true });

      // 确保10个笔记文件存在
      const notes = [];

      for (let i = 1; i <= 10; i++) {
        const noteFileName = `Note${i}.txt`;
        const noteFilePath = path.join(notesPath, noteFileName);

        // 检查文件是否存在，不存在则创建
        try {
          await fs.access(noteFilePath);
        } catch (error) {
          // 文件不存在，创建空文件
          await fs.writeFile(noteFilePath, '', 'utf8');
        }

        // 读取文件内容
        const content = await fs.readFile(noteFilePath, 'utf8');

        // 添加到笔记列表
        notes.push({
          id: i,
          name: `Note${i}`,
          filePath: `Notes/${noteFileName}`,
          content
        });
      }

      return notes;
    } catch (error) {
      console.error('初始化笔记失败:', error);
      throw error;
    }
  });

  ipcMain.handle('load-note', async (event, filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error(`加载笔记失败 (${filePath}):`, error);
      throw error;
    }
  });

  ipcMain.handle('save-note', async (event, filePath, content) => {
    try {
      // 确保目录存在
      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });

      // 写入文件
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error(`保存笔记失败 (${filePath}):`, error);
      throw error;
    }
  });

  ipcMain.handle('list-notes', async (event, storagePath) => {
    try {
      const notesPath = path.join(storagePath, 'Notes');

      // 确保目录存在
      try {
        await fs.access(notesPath);
      } catch (error) {
        await fs.mkdir(notesPath, { recursive: true });
        return [];
      }

      // 读取目录内容
      const files = await fs.readdir(notesPath);

      // 过滤并排序笔记文件
      const noteFiles = files
        .filter(file => file.startsWith('Note') && file.endsWith('.txt'))
        .sort((a, b) => {
          const numA = parseInt(a.replace('Note', '').replace('.txt', ''));
          const numB = parseInt(b.replace('Note', '').replace('.txt', ''));
          return numA - numB;
        });

      // 构建笔记列表
      const notes = [];

      for (const file of noteFiles) {
        const noteId = parseInt(file.replace('Note', '').replace('.txt', ''));
        const filePath = path.join(notesPath, file);
        const content = await fs.readFile(filePath, 'utf8');

        notes.push({
          id: noteId,
          name: `Note${noteId}`,
          filePath: `Notes/${file}`,
          content
        });
      }

      return notes;
    } catch (error) {
      console.error('列出笔记失败:', error);
      throw error;
    }
  });
}

module.exports = registerNotesIpc
