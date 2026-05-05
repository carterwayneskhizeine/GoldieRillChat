const { ipcMain, BrowserWindow, dialog, app } = require('electron')
const path = require('path')
const fsSync = require('fs')

function registerBookmarksIpc(getMainWindow) {
  let bookmarks = []
  let bookmarkFolders = []
  let bookmarksPanelVisible = false

  // 加载书签数据
  function loadBookmarks() {
    try {
      const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json');
      if (fsSync.existsSync(bookmarksPath)) {
        const data = fsSync.readFileSync(bookmarksPath, 'utf-8');
        const parsedData = JSON.parse(data);
        bookmarks = parsedData.bookmarks || [];
        bookmarkFolders = parsedData.folders || [];
      }
    } catch (error) {
      console.error('加载书签失败:', error);
      bookmarks = [];
      bookmarkFolders = [];
    }
  }

  // 保存书签数据到文件
  function saveBookmarks() {
    try {
      const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json');
      const data = {
        bookmarks: bookmarks || [],
        folders: bookmarkFolders || []
      };
      fsSync.writeFileSync(bookmarksPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存书签失败:', error);
    }
  }

  // 处理书签相关IPC消息
  ipcMain.handle('bookmarks-add', async (event, bookmark) => {
    // 添加新书签
    bookmarks.push(bookmark);
    // 保存到文件或数据库
    saveBookmarks();
    return true;
  });

  ipcMain.handle('bookmarks-remove', async (event, bookmarkId) => {
    // 移除书签
    bookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    // 保存到文件或数据库
    saveBookmarks();
    return true;
  });

  ipcMain.handle('bookmarks-get-all', async () => {
    // 返回所有书签
    return bookmarks;
  });

  ipcMain.handle('bookmarks-toggle-panel', async (event, isVisible) => {
    // 切换书签面板显示状态
    bookmarksPanelVisible = isVisible;
    // 通知所有窗口
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('bookmarks-panel-toggle', bookmarksPanelVisible);
    });
    return bookmarksPanelVisible;
  });

  // 添加书签删除处理程序
  ipcMain.handle('bookmarks-delete', async (_, bookmarkId) => {
    try {
      // 过滤出不包含要删除书签的数组
      bookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);

      // 保存更新后的书签数据
      saveBookmarks();

      return { success: true };
    } catch (error) {
      console.error('删除书签失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 添加选择书签文件的IPC处理
  ipcMain.handle('select-bookmark-file', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: '选择书签文件',
      filters: [
        { name: 'HTML文件', extensions: ['html', 'htm'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // 添加导入书签的IPC处理
  ipcMain.handle('bookmarks-import', async (event, { bookmarks: newBookmarks, folders: newFolders }) => {
    try {
      if (!Array.isArray(newBookmarks) || !Array.isArray(newFolders)) {
        throw new Error('书签数据格式不正确');
      }

      // 合并现有书签和新书签
      const allBookmarks = [...bookmarks, ...newBookmarks];

      // 去重 - 根据URL去重
      const uniqueUrls = new Set();
      bookmarks = allBookmarks.filter(bookmark => {
        if (uniqueUrls.has(bookmark.url)) {
          return false;
        }
        uniqueUrls.add(bookmark.url);
        return true;
      });

      // 保存书签数据
      saveBookmarks();

      return { success: true, count: newBookmarks.length };
    } catch (error) {
      console.error('导入书签失败:', error);
      throw error;
    }
  });

  // 添加解析和导入书签的IPC处理
  ipcMain.handle('parse-and-import-bookmarks', async (event, fileContent) => {
    try {
      // 检查输入
      if (!fileContent || typeof fileContent !== 'string') {
        throw new Error('无效的书签文件内容');
      }

      // 创建一个文件夹结构
      let folders = [];
      let newBookmarks = [];
      let bookmarkCount = 0;
      let folderCount = 0;

      // 解析文件夹结构 - 使用正则表达式更准确地提取文件夹结构
      // 首先匹配所有的文件夹定义行 <DT><H3 ... >文件夹名</H3>
      const folderRegex = /<DT><H3[^>]*>([^<]+)<\/H3>/g;
      let folderMatch;
      let folderIdMap = new Map(); // 用于保存文件夹路径到ID的映射

      // 默认根文件夹
      const rootFolderId = `folder_root_${Date.now()}`;
      folders.push({
        id: rootFolderId,
        name: '导入的书签',
        addDate: Date.now(),
        parentId: null
      });
      folderIdMap.set('ROOT', rootFolderId);

      // 使用更复杂的解析方法
      // 先将文件内容分割成行
      const lines = fileContent.split('\n');

      // 跟踪当前的文件夹路径
      let currentPath = ['ROOT'];
      let indentLevel = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检测文件夹开始
        if (line.match(/<DT><H3/)) {
          // 提取文件夹名称和添加日期
          const folderNameMatch = line.match(/<DT><H3[^>]*>([^<]+)<\/H3>/);
          const addDateMatch = line.match(/ADD_DATE="(\d+)"/);

          if (folderNameMatch) {
            const folderName = folderNameMatch[1];
            const addDate = addDateMatch ? parseInt(addDateMatch[1]) : Date.now();

            // 确定缩进级别变化
            const newIndentLevel = (line.match(/^\s*/)[0].length / 4); // 假设每级缩进是4个空格

            // 如果缩进减少，回到上一级
            if (newIndentLevel < indentLevel) {
              const diff = indentLevel - newIndentLevel;
              for (let j = 0; j < diff + 1; j++) {
                currentPath.pop();
              }
            }

            indentLevel = newIndentLevel;

            // 创建文件夹ID并保存到映射中
            const folderId = `folder_${folderCount++}_${Date.now()}`;
            const parentId = folderIdMap.get(currentPath[currentPath.length - 1]);

            // 将当前文件夹添加到路径
            currentPath.push(folderName);
            folderIdMap.set(folderName, folderId);

            // 添加到文件夹列表
            folders.push({
              id: folderId,
              name: folderName,
              addDate: addDate,
              parentId: parentId
            });
          }
        }
        // 检测文件夹结束
        else if (line === '</DL><p>') {
          // 当文件夹结束时，移出当前路径
          if (currentPath.length > 1) { // 保持至少ROOT
            currentPath.pop();
          }
        }
        // 检测书签
        else if (line.match(/<DT><A[^>]*HREF="([^"]+)"/)) {
          const urlMatch = line.match(/HREF="([^"]+)"/);
          const titleMatch = line.match(/<DT><A[^>]*>([^<]+)<\/A>/);
          const iconMatch = line.match(/ICON="([^"]+)"/);
          const addDateMatch = line.match(/ADD_DATE="(\d+)"/);

          if (urlMatch && titleMatch) {
            const url = urlMatch[1];
            const title = titleMatch[1];
            const icon = iconMatch ? iconMatch[1] : null;
            const addDate = addDateMatch ? parseInt(addDateMatch[1]) : Date.now();
            const parentFolderId = folderIdMap.get(currentPath[currentPath.length - 1]);

            // 添加到书签列表
            newBookmarks.push({
              id: `bk_${bookmarkCount++}_${Date.now()}`,
              title: title,
              url: url,
              icon: icon,
              addDate: addDate,
              folder: parentFolderId,
              folderName: currentPath[currentPath.length - 1] // 保存文件夹名称用于显示
            });
          }
        }
      }

      // 如果没有找到任何书签，抛出错误
      if (newBookmarks.length === 0) {
        throw new Error('未找到任何书签');
      }

      // 合并现有书签和新书签
      const allBookmarks = [...bookmarks, ...newBookmarks];

      // 合并现有文件夹和新文件夹
      const existingFolders = bookmarkFolders || [];
      const allFolders = [...existingFolders, ...folders];

      // 更新全局变量
      bookmarks = allBookmarks;
      bookmarkFolders = allFolders;

      // 保存书签数据
      saveBookmarks();

      return { success: true, count: newBookmarks.length };
    } catch (error) {
      console.error('解析和导入书签失败:', error);
      throw new Error(`无法导入书签: ${error.message}`);
    }
  });

  // 添加获取所有书签文件夹的处理程序
  ipcMain.handle('bookmarks-get-folders', async () => {
    return bookmarkFolders || [];
  });

  // 添加删除所有书签的处理程序
  ipcMain.handle('bookmarks-delete-all', async () => {
    try {
      // 清空书签和文件夹数组
      bookmarks = [];
      bookmarkFolders = [];

      // 保存更新后的书签数据
      saveBookmarks();

      return { success: true };
    } catch (error) {
      console.error('删除所有书签失败:', error);
      throw new Error(`无法删除所有书签: ${error.message}`);
    }
  });

  loadBookmarks();
}

module.exports = registerBookmarksIpc
