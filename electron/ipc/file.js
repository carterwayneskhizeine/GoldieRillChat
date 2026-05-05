const { ipcMain, dialog } = require('electron')
const { shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')

function registerFileIpc(getMainWindow) {
  // Handle folder selection
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
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

        // 检查并处理images子目录
        let imagesFiles = [];
        try {
          const imagesPath = path.join(folderPath, 'images');
          if (fsSync.existsSync(imagesPath) && fsSync.statSync(imagesPath).isDirectory()) {
            const imageContents = await fs.readdir(imagesPath, { withFileTypes: true });
            imagesFiles = await Promise.all(imageContents
              .filter(item => item.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name))
              .map(async file => {
                const filePath = path.join(imagesPath, file.name);
                const stats = await fs.stat(filePath);

                return {
                  name: file.name,
                  path: filePath,
                  type: path.extname(file.name).toLowerCase(),
                  size: stats.size,
                  timestamp: stats.mtime.toISOString()
                }
              }));
            console.log(`找到 ${imagesFiles.length} 个图片文件在 ${imagesPath}`);
          }
        } catch (error) {
          console.error(`读取images目录失败: ${error.message}`);
        }

        // 读取 messages.json 如果存在
        let messages = []
        try {
          const messagesPath = path.join(folderPath, 'messages.json')
          const messagesContent = await fs.readFile(messagesPath, 'utf8')
          messages = JSON.parse(messagesContent)

          // 更新消息中的路径信息，而不是创建新消息
          const updatedMessages = await Promise.all(messages.map(async msg => {
            // 创建消息的副本
            const updatedMsg = { ...msg };

            // 更新txtFile路径
            if (updatedMsg.txtFile && updatedMsg.txtFile.path) {
              const fileName = path.basename(updatedMsg.txtFile.path);
              updatedMsg.txtFile = {
                ...updatedMsg.txtFile,
                path: path.join(folderPath, fileName)
              };
            }

            // 更新files路径
            if (updatedMsg.files && Array.isArray(updatedMsg.files)) {
              updatedMsg.files = await Promise.all(updatedMsg.files.map(async file => {
                if (file.path) {
                  const fileName = path.basename(file.path);
                  // 检查文件是在主目录还是在images子目录
                  const subDir = file.type && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) ? 'images' : '';
                  const filePath = subDir
                    ? path.join(folderPath, subDir, fileName)
                    : path.join(folderPath, fileName);

                  // 检查文件是否存在，如果不存在尝试在images目录中查找
                  if (!fsSync.existsSync(filePath) && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
                    const imagesPath = path.join(folderPath, 'images', fileName);
                    if (fsSync.existsSync(imagesPath)) {
                      return {
                        ...file,
                        path: imagesPath
                      };
                    }
                  }

                  return {
                    ...file,
                    path: filePath
                  };
                }
                return file;
              }));
            }

            // 检查内容中的Markdown图片链接
            if (updatedMsg.content && typeof updatedMsg.content === 'string') {
              // 使用正则表达式找出所有Markdown格式的图片链接
              const imgRegex = /!\[(.*?)\]\((file:\/\/|local-file:\/\/)?([^)]+)\)/g;
              let matches = [];
              let match;

              // 创建一个数组来存储所有需要处理的图片匹配
              const imgMatches = [];
              while ((match = imgRegex.exec(updatedMsg.content)) !== null) {
                imgMatches.push([...match]);
              }

              // 使用Promise.all处理所有图片匹配
              await Promise.all(imgMatches.map(async ([fullMatch, altText, protocol, imgPath]) => {
                // 检查图片路径并修正
                const imageName = path.basename(imgPath);
                const possiblePaths = [
                  imgPath,
                  path.join(folderPath, 'images', imageName),
                  path.join(folderPath, imageName)
                ];

                let validPath = null;
                for (const checkPath of possiblePaths) {
                  try {
                    if (fsSync.existsSync(checkPath)) {
                      validPath = checkPath;
                      break;
                    }
                  } catch (err) {
                    // 忽略访问错误
                  }
                }

                if (validPath) {
                  // 更新内容中的图片路径
                  const newImgPath = validPath;
                  const newImgLink = `![${altText}](local-file://${newImgPath})`;
                  updatedMsg.content = updatedMsg.content.replace(fullMatch, newImgLink);

                  // 确保files数组中包含这个图片
                  if (!updatedMsg.files) {
                    updatedMsg.files = [];
                  }

                  // 检查files中是否已存在该图片
                  const imageExists = updatedMsg.files.some(file =>
                    file.path === newImgPath || path.basename(file.path) === imageName
                  );

                  if (!imageExists) {
                    try {
                      const stats = await fs.stat(newImgPath);
                      updatedMsg.files.push({
                        name: imageName,
                        path: newImgPath,
                        type: path.extname(imageName).toLowerCase(),
                        size: stats.size,
                        timestamp: stats.mtime.toISOString()
                      });
                    } catch (statErr) {
                      console.error(`获取图片状态失败: ${statErr.message}`);
                    }
                  }
                }
              }));

              // 如果消息中有searchImages但没有相应的files，修复这个问题
              if (updatedMsg.searchImages && Array.isArray(updatedMsg.searchImages)) {
                await Promise.all(updatedMsg.searchImages.map(async (img) => {
                  if (img.src && img.src.startsWith('local-file://')) {
                    const imgPath = img.src.replace('local-file://', '');
                    const imageName = path.basename(imgPath);

                    // 检查files中是否已存在该图片
                    const imageExists = updatedMsg.files && updatedMsg.files.some(file =>
                      file.path === imgPath || path.basename(file.path) === imageName
                    );

                    if (!imageExists) {
                      try {
                        if (fsSync.existsSync(imgPath)) {
                          const stats = await fs.stat(imgPath);
                          if (!updatedMsg.files) updatedMsg.files = [];
                          updatedMsg.files.push({
                            name: imageName,
                            path: imgPath,
                            type: path.extname(imageName).toLowerCase(),
                            size: stats.size,
                            timestamp: stats.mtime.toISOString()
                          });
                        }
                      } catch (statErr) {
                        console.error(`获取搜索图片状态失败: ${statErr.message}`);
                      }
                    }
                  }
                }));
              }
            }

            return updatedMsg;
          }));

          // 如果有路径更新，保存回文件
          const hasPathUpdates = true; // 强制更新文件，确保所有图片路径都被正确处理

          if (hasPathUpdates) {
            console.log(`更新 ${folderPath} 的消息路径信息`);
            await fs.writeFile(
              messagesPath,
              JSON.stringify(updatedMessages, null, 2),
              'utf8'
            );
            messages = updatedMessages;
          }
        } catch (error) {
          // 如果 messages.json 不存在，创建新的消息数组
          console.error(`处理messages.json失败: ${error.message}`);
          messages = []

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
          const allMediaFiles = [...files.filter(f => f.type !== '.txt' && f.type !== '.json'), ...imagesFiles];
          if (allMediaFiles.length > 0) {
            // 为每个文件创建独立的消息
            allMediaFiles.forEach(file => {
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

          // 保存新的 messages.json
          await fs.writeFile(
            path.join(folderPath, 'messages.json'),
            JSON.stringify(messages, null, 2),
            'utf8'
          )
        }

        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: folder.name,
          path: folderPath,
          timestamp: new Date().toISOString()
        }
      }))

      return processedFolders
    } catch (error) {
      console.error('Failed to scan folders:', error)
      throw error
    }
  })
}

module.exports = registerFileIpc
