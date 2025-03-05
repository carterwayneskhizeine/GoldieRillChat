const { app, BrowserWindow, ipcMain, dialog, protocol, nativeImage, BrowserView, Menu, clipboard, Tray, globalShortcut } = require('electron')
const { shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')  // 添加同步版本的 fs 模块
const BrowserLikeWindow = require('electron-as-browser')

let mainWindow = null
let browserWindow = null

// 添加应用程序退出标志
app.isQuitting = false;

// 添加侧边栏状态变量
let sidebarWidth = 0

// 添加标签页管理相关变量
let tabs = new Map()
let activeTabId = null

// 添加视图存储
let viewMap = new Map()

// 在合适的位置添加书签存储初始化代码
// 书签数据存储
let bookmarks = [];
let bookmarkFolders = []; // 添加书签文件夹存储
let bookmarksPanelVisible = false;

// 初始化导出对象 - 用于跨模块共享
exports.bookmarks = bookmarks;
exports.bookmarkFolders = bookmarkFolders;

// 着色器预设相关变量
let defaultVertexShader = '';
let defaultFragmentShader = '';
let shaderPresetsFolder = '';
const PRESETS_COUNT = 10;

// 设置应用 ID 和图标
if (process.platform === 'win32') {
  app.setAppUserModelId('com.goldie.chat')
}

// 获取图标路径
function getIconPath() {
  let iconPath;
  
  if (process.env.NODE_ENV === 'development') {
    // 开发环境优先使用项目根目录的resources文件夹
    iconPath = path.join(process.cwd(), 'resources/GoldieRillicon.ico');
    
    // 如果不存在则使用构建目录的resources
    if (!require('fs').existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../resources/GoldieRillicon.ico');
    }
  } else {
    // 生产环境使用打包后的resources目录
    iconPath = path.join(process.resourcesPath, 'GoldieRillicon.ico');
  }

  console.log('最终图标路径:', iconPath);
  console.log('文件存在:', require('fs').existsSync(iconPath));
  
  return iconPath;
}

// 确保开发环境下图标文件可用
async function ensureIconAvailable() {
  if (process.env.NODE_ENV === 'development') {
    const fs = require('fs').promises;
    const targetDir = path.join(__dirname, '../resources');
    
    // 确保资源目录存在
    await fs.mkdir(targetDir, { recursive: true });

    const iconFiles = [
      'GoldieRillicon.ico',
      'GoldieRillicon.icns', 
      'GoldieRillIcon.png'
    ];

    for (const file of iconFiles) {
      const srcPath = path.join(process.cwd(), 'resources', file);
      const destPath = path.join(targetDir, file);
      
      try {
        await fs.copyFile(srcPath, destPath);
        console.log(`Copied ${file} to build resources`);
      } catch (error) {
        console.error(`Failed to copy ${file}:`, error);
      }
    }
  }
}

// Register file protocol and initialize app
app.whenReady().then(async () => {
  // 确保图标文件可用
  await ensureIconAvailable();
  
  // 设置应用程序图标
  const iconPath = getIconPath();
  try {
    if (iconPath) {
      const icon = nativeImage.createFromPath(iconPath);
      
      // 设置应用ID - 这是Windows平台下正确显示任务栏图标的关键
      if (process.platform === 'win32') {
        app.setAppUserModelId('com.goldie.chat');
      }
      
      // 设置应用图标
      app.setIcon(icon);
      console.log('Icon set successfully');
    }
  } catch (error) {
    console.error('Failed to set app icon:', error);
  }

  // 创建主窗口
  createWindow();

  // 添加快捷键打开开发者工具 (Ctrl+Shift+I)
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 注册本地文件协议
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const filePath = request.url.replace('local-file://', '')
    callback(decodeURI(filePath))
  })

  // 注册资源文件协议
  protocol.registerFileProtocol('app-resource', (request, callback) => {
    const filePath = request.url.replace('app-resource://', '')
    const resourcePath = app.isPackaged
      ? path.join(process.resourcesPath, filePath)
      : path.join(__dirname, '..', 'resources', filePath)
    callback(resourcePath)
  })

  // 加载书签数据
  loadBookmarks();

  // 注册着色器预设相关IPC处理程序
  ipcMain.handle('init-shader-presets', async () => {
    return await initShaderPresets();
  });
  
  ipcMain.handle('get-all-shader-presets', async () => {
    return await getAllShaderPresets();
  });
  
  ipcMain.handle('load-shader-preset', async (event, presetId) => {
    return await loadShaderPreset(presetId);
  });
  
  ipcMain.handle('save-shader-preset', async (event, presetId, vertexShader, fragmentShader) => {
    return await saveShaderPreset(presetId, vertexShader, fragmentShader);
  });
  
  ipcMain.handle('reset-default-shader-preset', async () => {
    return await resetDefaultShaderPreset();
  });

  // 处理翻译相关IPC请求（添加在其他IPC处理函数附近，确保在createWindow函数里面的ipcMain处理部分）

  // 获取当前页面内容用于翻译
  ipcMain.handle('get-page-content', async () => {
    try {
      if (!browserWindow || !activeTabId) return { success: false, error: '没有活动的浏览器窗口' };
      
      const view = viewMap.get(activeTabId);
      if (!view) return { success: false, error: '找不到活动的标签页视图' };
      
      // 获取页面内容
      const htmlContent = await view.webContents.executeJavaScript(`
        document.documentElement.outerHTML
      `);
      
      return { success: true, content: htmlContent };
    } catch (error) {
      console.error('获取页面内容失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 翻译整个网页
  ipcMain.handle('translate-webpage', async (event, targetLang) => {
    try {
      if (!browserWindow || !activeTabId) return { success: false, error: '没有活动的浏览器窗口' };
      
      const view = viewMap.get(activeTabId);
      if (!view) return { success: false, error: '找不到活动的标签页视图' };
      
      // 获取当前页面内容
      const htmlContent = await view.webContents.executeJavaScript(`
        document.documentElement.outerHTML
      `);
      
      return { success: true, content: htmlContent };
    } catch (error) {
      console.error('获取页面内容失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 应用翻译后的内容到页面
  ipcMain.handle('apply-translated-content', async (event, translatedContent) => {
    try {
      if (!browserWindow || !activeTabId) return { success: false, error: '没有活动的浏览器窗口' };
      
      const view = viewMap.get(activeTabId);
      if (!view) return { success: false, error: '找不到活动的标签页视图' };
      
      // 将翻译后的内容应用到页面
      await view.webContents.executeJavaScript(`
        (function() {
          // 保存当前滚动位置
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          
          // 更新页面内容
          document.open();
          document.write(${JSON.stringify(translatedContent)});
          document.close();
          
          // 恢复滚动位置
          window.scrollTo(scrollX, scrollY);
          
          return true;
        })()
      `);
      
      return { success: true };
    } catch (error) {
      console.error('应用翻译内容失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 翻译特定元素
  ipcMain.handle('translate-elements', async (event, selectors, targetLang) => {
    try {
      if (!browserWindow || !activeTabId) return { success: false, error: '没有活动的浏览器窗口' };
      
      const view = viewMap.get(activeTabId);
      if (!view) return { success: false, error: '找不到活动的标签页视图' };
      
      // 获取指定选择器的元素
      const elementsData = await view.webContents.executeJavaScript(`
        (function() {
          const elements = document.querySelectorAll('${selectors}');
          return Array.from(elements).map(el => {
            return { 
              id: el.id || null,
              text: el.innerText,
              path: el.id ? '#' + el.id : null
            };
          });
        })()
      `);
      
      return { success: true, elements: elementsData };
    } catch (error) {
      console.error('获取元素失败:', error);
      return { success: false, error: error.message };
    }
  });
})

// Handle folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  
  if (!result.canceled) {
    return result.filePaths[0]
  }
  return null
})

// Create new chat folder
ipcMain.handle('create-chat-folder', async (event, basePath) => {
  try {
    // Get list of existing chat folders
    const files = await fs.readdir(basePath)
    const chatFolders = files.filter(f => f.startsWith('NewChat'))
    
    // Find the next available number
    let maxNumber = 0
    chatFolders.forEach(folder => {
      const match = folder.match(/NewChat(\d+)/)
      if (match) {
        const num = parseInt(match[1])
        maxNumber = Math.max(maxNumber, num)
      }
    })
    
    // Create new folder name
    const newFolderName = `NewChat${maxNumber + 1}`
    const newFolderPath = path.join(basePath, newFolderName)
    
    // Create the folder
    await fs.mkdir(newFolderPath)
    
    return {
      path: newFolderPath,
      name: newFolderName
    }
  } catch (error) {
    console.error('Failed to create chat folder:', error)
    throw error
  }
})

// Create AI Chat folder
ipcMain.handle('create-aichat-folder', async (event, basePath) => {
  try {
    // 生成文件夹名称
    const timestamp = new Date();
    const folderName = `${timestamp.getFullYear()}${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}_${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`;
    
    // 创建文件夹
    const folderPath = path.join(basePath, 'aichat', folderName);
    await fs.mkdir(folderPath, { recursive: true });
    
    // 创建空的 messages.json
    await fs.writeFile(
      path.join(folderPath, 'messages.json'),
      '[]',
      'utf8'
    );
    
    return {
      id: Date.now().toString(),
      name: folderName,
      path: folderPath,
      timestamp: timestamp.toISOString()
    };
  } catch (error) {
    console.error('Failed to create AI Chat folder:', error);
    throw error;
  }
});

// Save file to chat folder
ipcMain.handle('save-file', async (event, folderPath, file) => {
  try {
    const filePath = path.join(folderPath, file.name)
    await fs.writeFile(filePath, Buffer.from(file.data))
    
    return {
      name: file.name,
      path: filePath
    }
  } catch (error) {
    console.error('Failed to save file:', error)
    throw error
  }
})

// Save message as txt file
ipcMain.handle('save-message-as-txt', async (event, folderPath, message) => {
  try {
    // Use existing filename if it exists, otherwise generate new one
    const fileName = message.txtFile?.displayName 
      ? `${message.txtFile.displayName}.txt`
      : `message_${message.id}.txt`
    
    const filePath = path.join(folderPath, fileName)
    await fs.writeFile(filePath, message.content, 'utf8')
    return {
      name: fileName,
      displayName: fileName.replace('.txt', ''),
      path: filePath
    }
  } catch (error) {
    console.error('Failed to save message as txt:', error)
    throw error
  }
})

// Load message from txt file
ipcMain.handle('load-message-txt', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return content
  } catch (error) {
    console.error('Failed to load message txt:', error)
    throw error
  }
})

// 读取二进制文件
ipcMain.handle('readBinaryFile', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath);
    return content;
  } catch (error) {
    console.error('读取二进制文件失败:', error);
    throw error;
  }
});

// Rename message file
ipcMain.handle('rename-message-file', async (event, folderPath, oldFileName, newFileName) => {
  try {
    const oldPath = path.join(folderPath, `${oldFileName}.txt`)
    const newPath = path.join(folderPath, `${newFileName}.txt`)

    // Check if target file exists (for merging)
    try {
      await fs.access(newPath)
      // If file exists, read both files
      const oldContent = await fs.readFile(oldPath, 'utf8')
      const newContent = await fs.readFile(newPath, 'utf8')
      // Merge contents
      await fs.writeFile(newPath, `${newContent}\n\n${oldContent}`, 'utf8')
      // Delete old file
      await fs.unlink(oldPath)
      return {
        name: `${newFileName}.txt`,
        displayName: newFileName,
        path: newPath,
        merged: true
      }
    } catch {
      // If file doesn't exist, just rename
      await fs.rename(oldPath, newPath)
      return {
        name: `${newFileName}.txt`,
        displayName: newFileName,
        path: newPath,
        merged: false
      }
    }
  } catch (error) {
    console.error('Failed to rename message file:', error)
    throw error
  }
})

// Move file to recycle bin
ipcMain.handle('move-to-recycle', async (event, folderPath, fileName) => {
  try {
    // Create recycle bin folder if it doesn't exist
    const recycleBinPath = path.join(folderPath, '..', 'RecycleBin')
    try {
      await fs.access(recycleBinPath)
    } catch {
      await fs.mkdir(recycleBinPath)
    }

    // Move file to recycle bin with timestamp prefix to avoid name conflicts
    const timestamp = new Date().getTime()
    const recyclePath = path.join(recycleBinPath, `${timestamp}_${fileName}`)
    
    const oldPath = path.join(folderPath, fileName)
    await fs.rename(oldPath, recyclePath)
    
    return true
  } catch (error) {
    console.error('Failed to move file to recycle bin:', error)
    throw error
  }
})

// Delete message
ipcMain.handle('delete-message', async (event, folderPath, message) => {
  try {
    // 创建 RecycleBin 文件夹（在基础目录下）
    const baseDir = path.dirname(folderPath)
    const recycleBinPath = path.join(baseDir, 'RecycleBin')
    try {
      await fs.access(recycleBinPath)
    } catch {
      await fs.mkdir(recycleBinPath)
    }

    // 移动文本文件到回收站（如果存在）
    if (message.txtFile) {
      const timestamp = Date.now()
      const recyclePath = path.join(recycleBinPath, `${timestamp}_${message.txtFile.name}`)
      try {
        await fs.access(message.txtFile.path)
        await fs.rename(message.txtFile.path, recyclePath)
      } catch (error) {
        console.error('Failed to move txt file:', error)
      }
    }

    // 移动附件文件到回收站（如果存在）
    if (message.files && message.files.length > 0) {
      for (const file of message.files) {
        const timestamp = Date.now()
        const fileName = path.basename(file.path)
        const recyclePath = path.join(recycleBinPath, `${timestamp}_${fileName}`)
        try {
          await fs.access(file.path)
          await fs.rename(file.path, recyclePath)
        } catch (error) {
          console.error('Failed to move file:', error)
        }
      }
    }

    return true
  } catch (error) {
    console.error('Failed to delete message:', error)
    throw error
  }
})

// Rename file (for both text and image files)
ipcMain.handle('renameFile', async (event, folderPath, oldFileName, newFileName, subDir = '') => {
  try {
    const targetDir = subDir ? path.join(folderPath, subDir) : folderPath
    const oldPath = path.join(targetDir, oldFileName)
    const newPath = path.join(targetDir, newFileName)

    // Check if target file exists
    try {
      await fs.access(newPath)
      throw new Error('文件名已存在')
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, proceed with rename
        await fs.rename(oldPath, newPath)
        return {
          name: newFileName,
          path: newPath
        }
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to rename file:', error)
    throw error
  }
})

// Move folder to recycle bin
ipcMain.handle('move-folder-to-recycle', async (event, folderPath) => {
  try {
    // Create recycle bin folder if it doesn't exist
    const recycleBinPath = path.join(path.dirname(folderPath), 'RecycleBin')
    try {
      await fs.access(recycleBinPath)
    } catch {
      await fs.mkdir(recycleBinPath)
    }

    // Move folder to recycle bin with timestamp prefix
    const timestamp = new Date().getTime()
    const folderName = path.basename(folderPath)
    const recyclePath = path.join(recycleBinPath, `${timestamp}_${folderName}`)
    
    await fs.rename(folderPath, recyclePath)
    return true
  } catch (error) {
    console.error('Failed to move folder to recycle bin:', error)
    throw error
  }
})

// Rename chat folder
ipcMain.handle('rename-chat-folder', async (event, folderPath, newName) => {
  try {
    const parentDir = path.dirname(folderPath)
    const newPath = path.join(parentDir, newName)

    // Check if target folder exists
    try {
      await fs.access(newPath)
      throw new Error('文件夹名已存在')
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Folder doesn't exist, proceed with rename
        await fs.rename(folderPath, newPath)
        return {
          name: newName,
          path: newPath
        }
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to rename chat folder:', error)
    throw error
  }
})

// Add open file location method
ipcMain.handle('openFileLocation', async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath)
    return true
  } catch (error) {
    console.error('Failed to open file location:', error)
    throw error
  }
})

// 添加扫描文件夹的方法
ipcMain.handle('scanFolders', async (event, basePath) => {
  try {
    // 获取基础目录下的所有文件和文件夹
    const items = await fs.readdir(basePath, { withFileTypes: true })
    
    console.log('扫描到的所有项目:', items.map(item => item.name));
    
    // 只处理文件夹，排除 RecycleBin 和 Notes
    const folders = items.filter(item => 
      item.isDirectory() && item.name !== 'RecycleBin' && item.name !== 'Notes'
    )
    
    console.log('过滤后的文件夹:', folders.map(folder => folder.name));
    
    // 处理每个文件夹
    const processedFolders = await Promise.all(folders.map(async folder => {
      const folderPath = path.join(basePath, folder.name)
      const folderContents = await fs.readdir(folderPath, { withFileTypes: true })
      
      // 获取文件夹中的所有文件
      const files = await Promise.all(folderContents
        .filter(item => item.isFile())
        .map(async file => {
          const filePath = path.join(folderPath, file.name)
          const stats = await fs.stat(filePath)
          
          return {
            name: file.name,
            path: filePath,
            type: path.extname(file.name).toLowerCase(),
            size: stats.size,
            timestamp: stats.mtime.toISOString()
          }
        }))
      
      // 读取 messages.json 如果存在
      let messages = []
      let folderMtime = null;
      
      try {
        const messagesPath = path.join(folderPath, 'messages.json')
        const messagesContent = await fs.readFile(messagesPath, 'utf8')
        const parsedData = JSON.parse(messagesContent)
        
        // 检查是否是新格式（带有 folderMtime 的对象）
        if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
          if (parsedData.messages) {
            messages = parsedData.messages;
          } else {
            messages = [];
          }
          
          // 获取 folderMtime
          if (parsedData.folderMtime) {
            folderMtime = parsedData.folderMtime;
          }
        } else {
          // 旧格式（直接是消息数组）
          messages = parsedData;
        }

        // 获取已存在文件的路径列表
        const existingFilePaths = new Set()
        messages.forEach(msg => {
          if (msg.txtFile) {
            existingFilePaths.add(msg.txtFile.path)
          }
          if (msg.files) {
            msg.files.forEach(file => existingFilePaths.add(file.path))
          }
        })

        // 处理新的文本文件
        const newTxtFiles = files.filter(f => 
          f.type === '.txt' && !existingFilePaths.has(f.path)
        )
        for (const txtFile of newTxtFiles) {
          const content = await fs.readFile(txtFile.path, 'utf8')
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: content,
            timestamp: txtFile.timestamp,
            txtFile: {
              name: txtFile.name,
              displayName: txtFile.name.replace('.txt', ''),
              path: txtFile.path
            }
          })
        }

        // 处理新的媒体文件
        const newMediaFiles = files.filter(f => 
          f.type !== '.txt' && 
          f.type !== '.json' && 
          !existingFilePaths.has(f.path)
        )
        newMediaFiles.forEach(file => {
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: '',
            timestamp: file.timestamp,
            files: [file]
          })
        })

        // 如果有新文件，重新排序并保存，同时更新 folderMtime
        if (newTxtFiles.length > 0 || newMediaFiles.length > 0) {
          messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          
          // 更新 folderMtime
          folderMtime = Date.now();
          
          // 保存带有 folderMtime 的新格式
          await fs.writeFile(
            path.join(folderPath, 'messages.json'),
            JSON.stringify({ folderMtime, messages }, null, 2),
            'utf8'
          )
        } else if (!folderMtime) {
          // 如果没有 folderMtime，设置一个
          folderMtime = Date.now();
          
          // 保存带有新添加的 folderMtime 的格式
          await fs.writeFile(
            path.join(folderPath, 'messages.json'),
            JSON.stringify({ folderMtime, messages }, null, 2),
            'utf8'
          )
        }
      } catch (error) {
        // 如果 messages.json 不存在，创建新的消息数组
        messages = []
        folderMtime = Date.now(); // 设置当前时间作为 folderMtime
        
        // 处理文本文件
        const txtFiles = files.filter(f => f.type === '.txt')
        for (const txtFile of txtFiles) {
          const content = await fs.readFile(txtFile.path, 'utf8')
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: content,
            timestamp: txtFile.timestamp,
            txtFile: {
              name: txtFile.name,
              displayName: txtFile.name.replace('.txt', ''),
              path: txtFile.path
            }
          })
        }
        
        // 处理媒体文件和其他文件
        const mediaFiles = files.filter(f => f.type !== '.txt' && f.type !== '.json')
        if (mediaFiles.length > 0) {
          // 为每个文件创建独立的消息
          mediaFiles.forEach(file => {
          messages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: '',
              timestamp: file.timestamp,
              files: [file]
            })
          })
        }
        
        // 按时间戳排序消息
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        
        // 保存新的 messages.json，带有 folderMtime
        await fs.writeFile(
          path.join(folderPath, 'messages.json'),
          JSON.stringify({ folderMtime, messages }, null, 2),
          'utf8'
        )
      }
      
      // 获取文件系统的修改时间作为备用
      const folderStats = await fs.stat(folderPath);
      const folderModifiedTime = folderStats.mtime.getTime();
      
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: folder.name,
        path: folderPath,
        timestamp: new Date().toISOString(),
        modifiedTime: folderMtime || folderModifiedTime // 优先使用 folderMtime
      }
    }))
    
    return processedFolders
  } catch (error) {
    console.error('Failed to scan folders:', error)
    throw error
  }
})

// Create the browser window
function createWindow() {
  const iconPath = getIconPath();
  console.log('创建窗口使用的图标路径:', iconPath);

  mainWindow = new BrowserWindow({
    width: 1270,
    height: 920,
    frame: false,
    transparent: false,
    backgroundColor: '#2e2e2e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      additionalArguments: ['--js-flags=--max-old-space-size=4096'],
    },
    icon: iconPath,
    title: 'Goldie Rill Chat'
  });
  
  // 如果在Windows平台上，创建托盘图标
  if (process.platform === 'win32' && iconPath) {
    try {
      // 创建托盘图标
      let tray = new Tray(iconPath);
      tray.setToolTip('Goldie Rill Chat');
      
      // 添加托盘菜单
      const contextMenu = Menu.buildFromTemplate([
        { 
          label: '显示窗口', 
          click: () => {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.show();
              mainWindow.focus();
            }
          }
        },
        { type: 'separator' },
        { 
          label: '退出', 
          click: () => {
            app.isQuitting = true; // 标记为真正退出程序
            app.quit();
          }
        }
      ]);
      tray.setContextMenu(contextMenu);
      
      // 点击托盘图标显示窗口
      tray.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
        }
      });
      
      // 防止托盘图标被垃圾回收
      global.tray = tray;
    } catch (error) {
      console.error('Failed to create tray icon:', error);
    }
  }

  // 添加Windows平台特定设置
  if (process.platform === 'win32') {
    // 强制刷新任务栏图标
    mainWindow.on('ready-to-show', () => {
      mainWindow.setOverlayIcon(nativeImage.createEmpty(), '');
      mainWindow.setOverlayIcon(null, '');
    });
  }

  let browserView = null

  // 修改浏览器视图的可见性处理
  ipcMain.handle('set-browser-view-visibility', (event, visible) => {
    if (visible) {
      // 如果有活动的标签页，显示它
      if (activeTabId && viewMap.get(activeTabId)) {
        const view = viewMap.get(activeTabId)
        mainWindow.setBrowserView(view)
        updateBrowserViewBounds()
      }
      // 不再自动创建新标签页
    } else {
      mainWindow.setBrowserView(null)
    }
  })

  // 添加通用的新窗口处理函数
  async function createNewTab(url, options = {}) {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        scrollBounce: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        nativeWindowOpen: true
      }
    })

    const id = view.webContents.id
    tabs.set(id, {
      id,
      url: url || 'about:blank',
      title: '新标签页',
      isLoading: false,
      canGoBack: false,
      canGoForward: false
    })

    // 存储视图引用
    viewMap.set(id, view)

    // 设置事件监听
    view.webContents.on('did-start-loading', () => {
      const tab = tabs.get(id)
      if (tab) {
        tab.isLoading = true
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === activeTabId) {
          mainWindow.webContents.send('browser-loading', true)
        }
      }
    })

    view.webContents.on('did-stop-loading', () => {
      const tab = tabs.get(id)
      if (tab) {
        tab.isLoading = false
        tab.canGoBack = view.webContents.canGoBack()
        tab.canGoForward = view.webContents.canGoForward()
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === activeTabId) {
          mainWindow.webContents.send('browser-loading', false)
        }
      }
    })

    view.webContents.on('page-title-updated', (event, title) => {
      const tab = tabs.get(id)
      if (tab) {
        tab.title = title
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === activeTabId) {
          mainWindow.webContents.send('browser-title-update', title)
        }
      }
    })

    view.webContents.on('did-navigate', (event, url) => {
      const tab = tabs.get(id)
      if (tab) {
        tab.url = url
        tab.canGoBack = view.webContents.canGoBack()
        tab.canGoForward = view.webContents.canGoForward()
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
        if (id === activeTabId) {
          mainWindow.webContents.send('browser-url-update', url)
        }
      }
    })

    // 处理新窗口打开
    view.webContents.setWindowOpenHandler((details) => {
      createNewTab(details.url, {
        userAgent: details.options?.userAgent,
        features: details.features
      })
      return { action: 'deny' }
    })

    // 加载URL
    try {
      if (options.features) {
        await view.webContents.loadURL(url, {
          userAgent: options.userAgent || view.webContents.getUserAgent()
        })
      } else {
        await view.webContents.loadURL(url)
      }

      // 切换到新标签页
      activeTabId = id
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()
      mainWindow.webContents.send('browser-active-tab-update', id)
      mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
    } catch (error) {
      console.error('Failed to load URL:', error)
    }

    // 添加右键菜单处理
    view.webContents.on('context-menu', (event, params) => {
      const menu = Menu.buildFromTemplate([
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          enabled: params.isEditable || params.selectionText.length > 0,
          click: () => {
            if (params.isEditable) {
              view.webContents.copy()
            } else if (params.selectionText) {
              clipboard.writeText(params.selectionText)
            }
          }
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          enabled: params.isEditable,
          click: () => {
            view.webContents.paste()
          }
        }
      ])
      menu.popup()
    })

    return id
  }

  // 处理新标签页请求
  ipcMain.handle('browser-new-tab', async (event, url = 'about:blank') => {
    const view = await createNewTab(url)
    if (view) {
      // 设置为活动标签页
      activeTabId = view.webContents.id
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()
      mainWindow.webContents.send('browser-active-tab-update', activeTabId)
      
      // 如果提供了 URL，加载它
      if (url && url !== 'about:blank') {
        view.webContents.loadURL(url)
      }
      
      return view.webContents.id
    }
    return null
  })

  // 修改新窗口处理函数
  function handleNewWindow(details) {
    const { url, frameName, features } = details
    createNewTab(url, {
      features,
      userAgent: details.options?.userAgent
    })
    return { action: 'deny' }
  }

  // 为每个新创建的视图添加新窗口处理
  function setupNewWindowHandling(view) {
    view.webContents.setWindowOpenHandler(handleNewWindow)
    
    // 处理target="_blank"链接
    view.webContents.on('new-window', (event, url) => {
      event.preventDefault()
      createNewTab(url)
    })
  }

  // 修改关闭标签页处理
  ipcMain.handle('browser-close-tab', (event, tabId) => {
    const view = viewMap.get(tabId)
    if (view) {
      if (activeTabId === tabId) {
        // 找到下一个要激活的标签页
        const tabIds = Array.from(tabs.keys())
        const currentIndex = tabIds.indexOf(tabId)
        const nextId = tabIds[currentIndex - 1] || tabIds[currentIndex + 1]
        
        if (nextId) {
          activeTabId = nextId
          const nextView = viewMap.get(nextId)
          if (nextView) {
            mainWindow.setBrowserView(nextView)
            updateBrowserViewBounds()
            mainWindow.webContents.send('browser-active-tab-update', nextId)
            
            // 同步新活动标签页的状态
            const tab = tabs.get(nextId)
            if (tab) {
              mainWindow.webContents.send('browser-url-update', tab.url)
              mainWindow.webContents.send('browser-title-update', tab.title)
              mainWindow.webContents.send('browser-loading', tab.isLoading)
            }
          }
        } else {
          activeTabId = null
          mainWindow.setBrowserView(null)
        }
      }
      
      // 清理资源
      tabs.delete(tabId)
      viewMap.delete(tabId)
      view.webContents.destroy()
      mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
    }
  })

  // 修改切换标签页处理
  ipcMain.handle('browser-switch-tab', (event, tabId) => {
    const view = viewMap.get(tabId)
    if (view) {
      activeTabId = tabId
      mainWindow.setBrowserView(view)
      updateBrowserViewBounds()

      // 同步当前标签页的状态
      const tab = tabs.get(tabId)
      if (tab) {
        mainWindow.webContents.send('browser-url-update', tab.url)
        mainWindow.webContents.send('browser-title-update', tab.title)
        mainWindow.webContents.send('browser-loading', tab.isLoading)
        mainWindow.webContents.send('browser-active-tab-update', tabId)
      }
    }
  })

  // 修改浏览器视图的大小和位置计算
  function updateBrowserViewBounds() {
    const view = mainWindow.getBrowserView()
    if (!view) return

    const bounds = mainWindow.getBounds()
    const contentBounds = mainWindow.getContentBounds()
    const isMaximized = mainWindow.isMaximized()
    
    // 计算顶部工具栏的高度（包括标题栏和控制栏）
    const titleBarHeight = bounds.height - contentBounds.height
    const controlBarHeight = 28 // 浏览器控制栏的高度
    
    // 设置浏览器视图的边界，考虑侧边栏宽度和滚动条空间
    view.setBounds({ 
      x: 10 + sidebarWidth, // 10px 是侧边栏切换条的宽度
      y: titleBarHeight + controlBarHeight - (isMaximized ? 15 : 0), // 全屏时向上增加15px
      width: bounds.width - (10 + sidebarWidth + (isMaximized ? 15 : 0)), // 全屏时减去滚动条宽度
      height: bounds.height - (titleBarHeight + controlBarHeight) // 全屏时减少15px高度
    })

    // 设置自动调整大小选项
    view.setAutoResize({
      width: true,
      height: true,
      horizontal: true,
      vertical: true
    })
  }

  // 监听窗口大小变化
  mainWindow.on('resize', () => {
    if (mainWindow.getBrowserView()) {
      updateBrowserViewBounds()
    }
  })

  // 修改侧边栏状态
  ipcMain.handle('update-sidebar-width', (event, width) => {
    sidebarWidth = width
    if (mainWindow && mainWindow.getBrowserView()) {
      updateBrowserViewBounds()
    }
  })

  // 修改浏览器导航处理
  ipcMain.handle('browser-navigate', async (event, url) => {
    const view = mainWindow.getBrowserView()
    if (!view) return

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    try {
      await view.webContents.loadURL(url)
      const tab = tabs.get(activeTabId)
      if (tab) {
        tab.url = url
        mainWindow.webContents.send('browser-tabs-update', Array.from(tabs.values()))
      }
    } catch (error) {
      console.error('Navigation failed:', error)
    }
  })

  ipcMain.handle('browser-back', () => {
    const view = mainWindow.getBrowserView()
    if (view && view.webContents.canGoBack()) {
      view.webContents.goBack()
    }
  })

  ipcMain.handle('browser-forward', () => {
    const view = mainWindow.getBrowserView()
    if (view && view.webContents.canGoForward()) {
      view.webContents.goForward()
    }
  })

  ipcMain.handle('browser-refresh', () => {
    const view = mainWindow.getBrowserView()
    if (view) {
      view.webContents.reload()
    }
  })

  // 添加窗口控制处理程序
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  // 修改关闭按钮行为，点击关闭按钮时只隐藏窗口，不退出程序
  ipcMain.handle('window-close', () => {
    if (mainWindow) {
      mainWindow.hide(); // 隐藏窗口而不是关闭
    }
  })

  // 添加窗口关闭事件处理，阻止默认关闭行为
  mainWindow.on('close', (event) => {
    // 如果不是真正要退出程序
    if (!app.isQuitting) {
      event.preventDefault(); // 阻止默认关闭行为
      mainWindow.hide(); // 隐藏窗口
      return false;
    }
    return true;
  });

  ipcMain.handle('is-window-maximized', () => {
    return mainWindow?.isMaximized()
  })

  // 监听窗口最大化状态变化
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-state-changed', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-state-changed', false)
  })

  // 加载主应用
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open the DevTools in development.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // 主窗口关闭时清理资源
  mainWindow.on('closed', () => {
    // 清理所有标签页
    for (const [id, view] of viewMap) {
      view.webContents.destroy()
    }
    tabs.clear()
    viewMap.clear()
    browserView = null
    mainWindow = null
  })
}

module.exports = {
  createWindow
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 在其他 ipcMain.handle 声明附近添加
ipcMain.handle('getResourcePath', (event, fileName) => {
  if (app.isPackaged) {
    // 在打包后的应用中，资源文件位于 resources 目录
    return path.join(process.resourcesPath, fileName)
  } else {
    // 在开发环境中，使用项目根目录下的 resources
    return path.join(__dirname, '..', 'resources', fileName)
  }
})

// Add file system operations
ipcMain.handle('mkdir', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error('Failed to create directory:', error);
    throw error;
  }
});

ipcMain.handle('writeFile', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to write file:', error);
    throw error;
  }
});

ipcMain.handle('access', async (event, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    throw error;
  }
});

// 修改消息存储相关的 IPC 处理程序
ipcMain.handle('save-messages', async (event, conversationPath, conversationId, messages) => {
  try {
    // 确保 messages 是数组
    if (!Array.isArray(messages)) {
      throw new Error('消息必须是数组');
    }

    const messagesPath = path.join(conversationPath, 'messages.json');
    await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存消息失败:', error);
    throw error;
  }
});

ipcMain.handle('load-messages', async (event, conversationPath) => {
  try {
    const messagesPath = path.join(conversationPath, 'messages.json');
    
    // 检查文件是否存在
    try {
      await fs.access(messagesPath);
    } catch (error) {
      // 如果文件不存在，创建一个空的消息数组文件
      await fs.writeFile(messagesPath, '[]', 'utf8');
      return [];
    }

    // 读取消息文件
    const content = await fs.readFile(messagesPath, 'utf8');
    
    // 检查文件内容是否为空
    if (!content.trim()) {
      await fs.writeFile(messagesPath, '[]', 'utf8');
      return [];
    }

    try {
      // 尝试解析 JSON
      const messages = JSON.parse(content);
      // 确保返回的是数组
      if (!Array.isArray(messages)) {
        console.error('消息文件格式错误，重置文件');
        await fs.writeFile(messagesPath, '[]', 'utf8');
        return [];
      }
      return messages;
    } catch (parseError) {
      console.error('JSON 解析失败，重置文件:', parseError);
      await fs.writeFile(messagesPath, '[]', 'utf8');
      return [];
    }
  } catch (error) {
    console.error('加载消息失败:', error);
    throw error;
  }
});

// 添加图片生成相关的 IPC 处理
ipcMain.handle('generate-image', async (event, { prompt, model, image_size, width, height, steps, guidance, safety_tolerance, interval, prompt_upsampling, conversationPath, apiKey, apiHost }) => {
  try {
    // 验证必要参数
    if (!prompt) throw new Error('提示词不能为空');
    if (!apiKey) throw new Error('API Key 不能为空');
    if (!apiHost) throw new Error('API Host 不能为空');
    if (!conversationPath) throw new Error('对话路径不能为空');
    if (!model) throw new Error('模型不能为空');

    // 添加参数日志
    console.log('接收到的图片生成参数:', {
      model,
      width,
      height,
      steps,
      guidance,
      safety_tolerance,
      interval,
      prompt_upsampling,
      image_size,
      width_type: typeof width,
      height_type: typeof height
    });

    // 确保存在图片存储目录
    const imagesDir = path.join(conversationPath, 'images');
    try {
      await fs.access(imagesDir);
    } catch {
      await fs.mkdir(imagesDir, { recursive: true });
    }

    // 构建请求体
    const requestBody = {
      model,
      prompt,
      seed: Math.floor(Math.random() * 9999999999)
    };

    // 根据模型添加不同的参数
    if (model === 'black-forest-labs/FLUX.1-pro') {
      // 直接使用传入的参数，因为已经在 inputHandlers.js 中验证过了
      Object.assign(requestBody, {
        width,
        height,
        steps,
        guidance,
        safety_tolerance,
        interval,
        prompt_upsampling
      });

      // 添加最终请求体日志
      console.log('发送到 API 的请求体:', {
        ...requestBody,
        width_type: typeof requestBody.width,
        height_type: typeof requestBody.height,
        width_value: requestBody.width,
        height_value: requestBody.height
      });
    } else {
      // 其他模型使用 image_size
      requestBody.image_size = image_size;
    }

    // 调用 SiliconFlow API
    const response = await fetch(`${apiHost}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '图片生成失败');
    }

    const data = await response.json();
    if (!data.images?.[0]?.url) {
      throw new Error('未获取到生成的图片 URL');
    }

    // 下载图片
    const imageUrl = data.images[0].url;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('图片下载失败');
    }

    // 读取图片数据
    const imageBuffer = await imageResponse.arrayBuffer();

    // 生成文件名和保存路径
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `image_${timestamp}.png`;
    const filePath = path.join(imagesDir, fileName);

    // 保存图片到本地
    await fs.writeFile(filePath, Buffer.from(imageBuffer));

    // 返回结果
    return {
      url: imageUrl,
      localPath: filePath,
      fileName: fileName,
      timestamp: timestamp,
      seed: data.seed || Math.floor(Math.random() * 9999999999)
    };

  } catch (error) {
    console.error('图片生成失败:', error);
    throw new Error(`图片生成失败: ${error.message}`);
  }
});

// 添加视频生成相关的 IPC 处理
ipcMain.handle('generate-video', async (event, { prompt, model, image, seed, conversationPath, apiKey, apiHost }) => {
  try {
    // 验证必要参数
    if (!prompt) throw new Error('提示词不能为空');
    if (!apiKey) throw new Error('API Key 不能为空');
    if (!apiHost) throw new Error('API Host 不能为空');
    if (!conversationPath) throw new Error('对话路径不能为空');
    if (!model) throw new Error('模型不能为空');

    // 确保存在视频存储目录
    const videosDir = path.join(conversationPath, 'videos');
    try {
      await fs.access(videosDir);
    } catch {
      await fs.mkdir(videosDir, { recursive: true });
    }

    // 构建请求体
    const requestBody = {
      prompt,
      model,
      seed: seed || Math.floor(Math.random() * 9999999999)
    };

    // 如果提供了参考图片，添加到请求体
    if (image) {
      requestBody.image = image;
    }

    // 发送请求
    const response = await fetch(`${apiHost}/video/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      let errorMessage = `视频生成请求失败 (${response.status})`;
      
      if (errorData) {
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // 返回请求ID和种子
    return {
      requestId: data.requestId,
      seed: requestBody.seed
    };

  } catch (error) {
    console.error('视频生成失败:', error);
    throw new Error(`视频生成请求失败: ${error.message}`);
  }
});

// 添加获取视频状态的 IPC 处理
ipcMain.handle('get-video-status', async (event, { requestId, apiKey, apiHost }) => {
  try {
    // 验证必要参数
    if (!requestId) throw new Error('请求ID不能为空');
    if (!apiKey) throw new Error('API Key 不能为空');
    if (!apiHost) throw new Error('API Host 不能为空');

    // 发送请求
    const response = await fetch(`${apiHost}/video/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ request_id: requestId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      let errorMessage = `获取视频状态失败 (${response.status})`;
      
      if (errorData) {
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      status: data.status,
      url: data.url,
      position: data.position,
      reason: data.reason
    };

  } catch (error) {
    console.error('获取视频状态失败:', error);
    throw new Error(`获取视频状态失败: ${error.message}`);
  }
});

// 添加下载视频的 IPC 处理
ipcMain.handle('download-video', async (event, { url, conversationPath }) => {
  try {
    // 验证必要参数
    if (!url) throw new Error('视频URL不能为空');
    if (!conversationPath) throw new Error('对话路径不能为空');

    // 确保存在视频存储目录
    const videosDir = path.join(conversationPath, 'videos');
    try {
      await fs.access(videosDir);
    } catch {
      await fs.mkdir(videosDir, { recursive: true });
    }

    // 下载视频
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载视频失败: ${response.status}`);
    }

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const fileName = `video_${timestamp}.mp4`;
    const filePath = path.join(videosDir, fileName);

    // 保存视频文件
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));

    // 返回结果
    return {
      path: filePath,
      fileName: fileName,
      timestamp: timestamp
    };

  } catch (error) {
    console.error('下载视频失败:', error);
    throw new Error(`下载视频失败: ${error.message}`);
  }
});

// 处理书签相关IPC消息
ipcMain.handle('bookmarks-add', async (event, bookmark) => {
  // 添加新书签
  exports.bookmarks.push(bookmark);
  // 保存到文件或数据库
  saveBookmarks();
  return true;
});

ipcMain.handle('bookmarks-remove', async (event, bookmarkId) => {
  // 移除书签
  exports.bookmarks = exports.bookmarks.filter(b => b.id !== bookmarkId);
  // 保存到文件或数据库
  saveBookmarks();
  return true;
});

ipcMain.handle('bookmarks-get-all', async () => {
  // 返回所有书签
  return exports.bookmarks;
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
    exports.bookmarks = exports.bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
    
    // 保存更新后的书签数据
    saveBookmarks();
    
    return { success: true };
  } catch (error) {
    console.error('删除书签失败:', error);
    return { success: false, error: error.message };
  }
});

// 加载书签数据
function loadBookmarks() {
  try {
    const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json');
    if (fsSync.existsSync(bookmarksPath)) {
      const data = fsSync.readFileSync(bookmarksPath, 'utf-8');
      const parsedData = JSON.parse(data);
      exports.bookmarks = parsedData.bookmarks || [];
      exports.bookmarkFolders = parsedData.folders || [];
    }
  } catch (error) {
    console.error('加载书签失败:', error);
    exports.bookmarks = [];
    exports.bookmarkFolders = [];
  }
}

// 保存书签数据到文件
function saveBookmarks() {
  try {
    const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json');
    const data = {
      bookmarks: exports.bookmarks || [],
      folders: exports.bookmarkFolders || []
    };
    fsSync.writeFileSync(bookmarksPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存书签失败:', error);
  }
}

// 添加选择书签文件的IPC处理
ipcMain.handle('select-bookmark-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
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
    const allBookmarks = [...exports.bookmarks, ...newBookmarks];
    
    // 去重 - 根据URL去重
    const uniqueUrls = new Set();
    exports.bookmarks = allBookmarks.filter(bookmark => {
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
    const allBookmarks = [...exports.bookmarks, ...newBookmarks];
    
    // 合并现有文件夹和新文件夹
    const existingFolders = exports.bookmarkFolders || [];
    const allFolders = [...existingFolders, ...folders];
    
    // 更新全局变量
    exports.bookmarks = allBookmarks;
    exports.bookmarkFolders = allFolders;
    
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
  return exports.bookmarkFolders || [];
});

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

// 在适当位置添加着色器预设管理函数
// 初始化着色器预设文件夹和文件
async function initShaderPresets() {
  try {
    // 获取存储路径
    const storagePath = app.getPath('userData');
    shaderPresetsFolder = path.join(storagePath, 'shader-presets');
    
    // 确保预设文件夹存在
    try {
      await fs.mkdir(shaderPresetsFolder, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // 获取默认着色器代码（用于Shaders1）
    const appPath = app.getAppPath();
    // 根据是否打包使用不同的路径
    let shaderFilePath;
    if (app.isPackaged) {
      // 打包环境下，使用resources目录下的预设文件
      shaderFilePath = path.join(process.resourcesPath, 'shaders-default.js');
      // 如果文件不存在，尝试其他可能的路径
      if (!await fileExists(shaderFilePath)) {
        shaderFilePath = path.join(appPath, 'dist', 'shaders-default.js');
        if (!await fileExists(shaderFilePath)) {
          console.log('在打包环境中找不到默认着色器文件，使用内置默认值');
          // 使用硬编码的默认着色器
          defaultVertexShader = `varying vec2 vUv;  
void main() {  
  vUv = uv;  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);  
}`;
          defaultFragmentShader = `precision mediump float;  
uniform float u_time;  
uniform vec2 u_resolution;  
uniform vec2 u_mouse;  
uniform float u_intensity;  
varying vec2 vUv;  
  
float rand(vec2 n) {   
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);  
}  
  
float noise(vec2 p) {  
    vec2 ip = floor(p);  
    vec2 u = fract(p);  
    u = u * u * (3.0 - 2.0 * u);  
      
    float res = mix(  
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),  
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),   
        u.y);  
    return res * res;  
}  
  
void main() {  
    vec2 uv = vUv;  
      
    // 动态参数  
    float moveSpeed = 0.2;  
    float moveAmount = 1.5;  
    float verticalOffset = u_time * moveSpeed;  
      
    // 波浪效果  
    float waveFreq = 2.0;  
    float waveAmp = 0.1;  
    float horizontalWave = sin(uv.x * waveFreq * 3.14159 + u_time) * waveAmp;  
      
    // 坐标变换  
    vec2 distortedUV = vec2(  
        uv.x,  
        mod(uv.y + verticalOffset + horizontalWave, 1.0)  
    );  
      
    // 噪声计算  
    float noiseScale = 2.0 + u_intensity * 1.5;  
    float n = noise(distortedUV * noiseScale);  
      
    // 颜色混合  
    vec3 color1 = vec3(0.4, 0.6, 0.9);  
    vec3 color2 = vec3(0.2, 0.3, 0.7);  
    vec3 activeColor = vec3(0.6, 0.8, 1.0);  
      
    float gradientFactor = smoothstep(0.0, 1.0, distortedUV.y);  
    vec3 baseColor = mix(color2, color1, gradientFactor);  
      
    vec3 finalColor = mix(  
        mix(baseColor, color2, n),  
        activeColor,  
        u_intensity * 0.3  
    );  
      
    // 透明度计算  
    float alpha = 0.7 +   
                0.15 * sin(u_time + distortedUV.y * 3.0) +   
                u_intensity * 0.15;  
      
    // 边缘渐晕  
    float vignette = 1.0 - length(uv - 0.5) * 1.5;  
    vignette = clamp(vignette, 0.0, 1.0);  
      
    gl_FragColor = vec4(finalColor * vignette, alpha);  
}`;
          
          // 跳过文件读取部分
          console.log('使用内置默认着色器');
          // 初始化所有预设文件
          // ... 继续执行后面的代码
          const presetsInfo = [];
    
          for (let i = 1; i <= PRESETS_COUNT; i++) {
            const presetId = `Shaders${i}`;
            const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`);
            const exists = await fileExists(presetPath);
            
            if (!exists) {
              // 为首个预设使用默认代码，其他使用空代码
              const vertexShader = i === 1 ? defaultVertexShader : '';
              const fragmentShader = i === 1 ? defaultFragmentShader : '';
              
              await fs.writeFile(presetPath, JSON.stringify({
                id: presetId,
                isDefault: i === 1,
                vertex: vertexShader,
                fragment: fragmentShader
              }, null, 2));
            }
            
            // 读取预设信息（仅基本信息，不包括完整代码）
            const presetContent = JSON.parse(await fs.readFile(presetPath, 'utf8'));
            presetsInfo.push({
              id: presetContent.id,
              isDefault: presetContent.isDefault,
              isEmpty: !presetContent.vertex && !presetContent.fragment
            });
          }
          
          return presetsInfo;
        }
      }
    } else {
      // 开发环境下，使用源代码路径
      shaderFilePath = path.join(appPath, 'src/components/ThreeBackground/utils/shaders.js');
    }
    
    // 读取着色器文件
    try {
      console.log('尝试从路径读取着色器:', shaderFilePath);
      const fileContent = await fs.readFile(shaderFilePath, 'utf8');
      
      // 解析顶点着色器和片段着色器
      const vertexMatch = fileContent.match(/export const vertexShader = `([\s\S]*?)`;/);
      const fragmentMatch = fileContent.match(/export const fragmentShader = `([\s\S]*?)`;/);
      
      if (vertexMatch && vertexMatch[1]) {
        defaultVertexShader = vertexMatch[1];
      }
      
      if (fragmentMatch && fragmentMatch[1]) {
        defaultFragmentShader = fragmentMatch[1];
      }
    } catch (error) {
      console.error('读取默认着色器代码失败:', error);
      defaultVertexShader = '';
      defaultFragmentShader = '';
    }
    
    // 初始化所有预设文件
    const presetsInfo = [];
    
    for (let i = 1; i <= PRESETS_COUNT; i++) {
      const presetId = `Shaders${i}`;
      const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`);
      const exists = await fileExists(presetPath);
      
      if (!exists) {
        // 为首个预设使用默认代码，其他使用空代码
        const vertexShader = i === 1 ? defaultVertexShader : '';
        const fragmentShader = i === 1 ? defaultFragmentShader : '';
        
        await fs.writeFile(presetPath, JSON.stringify({
          id: presetId,
          isDefault: i === 1,
          vertex: vertexShader,
          fragment: fragmentShader
        }, null, 2));
      }
      
      // 读取预设信息（仅基本信息，不包括完整代码）
      const presetContent = JSON.parse(await fs.readFile(presetPath, 'utf8'));
      presetsInfo.push({
        id: presetContent.id,
        isDefault: presetContent.isDefault,
        isEmpty: !presetContent.vertex && !presetContent.fragment
      });
    }
    
    return presetsInfo;
  } catch (error) {
    console.error('初始化着色器预设失败:', error);
    throw error;
  }
}

// 辅助函数：检查文件是否存在
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    console.log(`文件不存在: ${filePath}`, error.message);
    return false;
  }
}

// 获取所有着色器预设
async function getAllShaderPresets() {
  try {
    const presets = [];
    
    for (let i = 1; i <= PRESETS_COUNT; i++) {
      const presetId = `Shaders${i}`;
      const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`);
      
      try {
        const presetContent = JSON.parse(await fs.readFile(presetPath, 'utf8'));
        presets.push({
          id: presetId,
          isDefault: presetContent.isDefault,
          isEmpty: !presetContent.vertex && !presetContent.fragment
        });
      } catch (error) {
        console.error(`读取预设 ${presetId} 失败:`, error);
        // 添加占位对象
        presets.push({
          id: presetId,
          isDefault: i === 1,
          isEmpty: true
        });
      }
    }
    
    return presets;
  } catch (error) {
    console.error('获取着色器预设失败:', error);
    throw error;
  }
}

// 加载指定的着色器预设
async function loadShaderPreset(presetId) {
  try {
    const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`);
    
    // 检查文件是否存在
    const exists = await fileExists(presetPath);
    if (!exists) {
      // 如果是Shaders1且不存在，则创建默认预设
      if (presetId === 'Shaders1') {
        await fs.writeFile(presetPath, JSON.stringify({
          id: presetId,
          isDefault: true,
          vertex: defaultVertexShader,
          fragment: defaultFragmentShader
        }, null, 2));
        
        return {
          id: presetId,
          vertex: defaultVertexShader,
          fragment: defaultFragmentShader
        };
      }
      
      // 对于其他预设，创建空预设
      await fs.writeFile(presetPath, JSON.stringify({
        id: presetId,
        isDefault: false,
        vertex: '',
        fragment: ''
      }, null, 2));
      
      return {
        id: presetId,
        vertex: '',
        fragment: ''
      };
    }
    
    // 读取预设内容
    const presetContent = JSON.parse(await fs.readFile(presetPath, 'utf8'));
    
    // 如果是Shaders1，始终确保有默认值
    if (presetId === 'Shaders1' && presetContent.isDefault) {
      // 重置为默认值
      presetContent.vertex = defaultVertexShader;
      presetContent.fragment = defaultFragmentShader;
      
      // 保存回文件
      await fs.writeFile(presetPath, JSON.stringify(presetContent, null, 2));
    }
    
    return {
      id: presetId,
      vertex: presetContent.vertex,
      fragment: presetContent.fragment
    };
  } catch (error) {
    console.error(`加载着色器预设 ${presetId} 失败:`, error);
    throw error;
  }
}

// 保存着色器预设
async function saveShaderPreset(presetId, vertexShader, fragmentShader) {
  try {
    const presetPath = path.join(shaderPresetsFolder, `${presetId}.json`);
    
    // 读取当前预设内容（如果存在）
    let presetContent = {
      id: presetId,
      isDefault: presetId === 'Shaders1',
      vertex: vertexShader,
      fragment: fragmentShader
    };
    
    // 如果是Shaders1，保留isDefault标记但允许内容被修改
    const exists = await fileExists(presetPath);
    if (exists) {
      const currentContent = JSON.parse(await fs.readFile(presetPath, 'utf8'));
      presetContent.isDefault = currentContent.isDefault;
    }
    
    // 保存预设
    await fs.writeFile(presetPath, JSON.stringify(presetContent, null, 2));
    
    return { success: true, id: presetId };
  } catch (error) {
    console.error(`保存着色器预设 ${presetId} 失败:`, error);
    throw error;
  }
}

// 重置默认着色器预设（仅Shaders1）
async function resetDefaultShaderPreset() {
  try {
    const presetPath = path.join(shaderPresetsFolder, 'Shaders1.json');
    
    // 创建或更新默认预设
    await fs.writeFile(presetPath, JSON.stringify({
      id: 'Shaders1',
      isDefault: true,
      vertex: defaultVertexShader,
      fragment: defaultFragmentShader
    }, null, 2));
    
    return {
      id: 'Shaders1',
      vertex: defaultVertexShader,
      fragment: defaultFragmentShader
    };
  } catch (error) {
    console.error('重置默认着色器预设失败:', error);
    throw error;
  }
} 

// 在应用退出前取消注册所有快捷键
app.on('will-quit', () => {
  // 取消注册所有快捷键
  globalShortcut.unregisterAll();
});

// 添加目录选择功能
ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择文件夹'
    });
    return result;
  } catch (error) {
    console.error('选择目录失败:', error);
    throw error;
  }
});