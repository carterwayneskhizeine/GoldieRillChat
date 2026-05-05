const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs').promises

function registerConversationIpc() {
  // 修改消息存储相关的 IPC 处理程序
  ipcMain.handle('save-messages', async (event, conversationPath, conversationId, messages) => {
    try {
      // 确保 messages 是数组
      if (!Array.isArray(messages)) {
        throw new Error('消息必须是数组');
      }

      const messagesPath = path.join(conversationPath, 'messages.json');
      await fs.writeFile(messagesPath, JSON.stringify(messages, null, 2), 'utf8');

      // 更新 timemessages.json 文件中的修改时间
      try {
        const timeMessagesPath = path.join(conversationPath, 'timemessages.json');
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
      } catch (updateTimeError) {
        console.error('更新 timemessages.json 失败:', updateTimeError);
        // 不阻止保存消息的操作继续
      }

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

        // 处理消息中的图片路径
        const processedMessages = await Promise.all(messages.map(async (msg) => {
          // 创建消息的副本
          const processedMsg = { ...msg };

          // 检查files数组是否存在
          if (processedMsg.files && Array.isArray(processedMsg.files)) {
            // 验证文件路径
            processedMsg.files = await Promise.all(processedMsg.files.map(async (file) => {
              if (file && file.path) {
                // 检查文件是否存在
                try {
                  await fs.access(file.path);
                  // 文件存在，返回原始文件对象
                  return file;
                } catch (error) {
                  // 文件不存在，尝试查找替代路径
                  const fileName = path.basename(file.path);

                  // 检查images子目录
                  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
                    const imagesPath = path.join(conversationPath, 'images', fileName);
                    try {
                      await fs.access(imagesPath);
                      // 如果在images目录中找到文件，更新路径
                      return {
                        ...file,
                        path: imagesPath
                      };
                    } catch (imgError) {
                      // 图片不在images目录中，再尝试在对话根目录中查找
                      const rootPath = path.join(conversationPath, fileName);
                      try {
                        await fs.access(rootPath);
                        return {
                          ...file,
                          path: rootPath
                        };
                      } catch (rootError) {
                        // 所有尝试都失败，保留原始路径
                        return file;
                      }
                    }
                  }

                  // 非图片文件或无法找到替代路径，保留原始路径
                  return file;
                }
              }
              return file;
            }));
          }

          // 处理消息内容中的图片链接
          if (processedMsg.content && typeof processedMsg.content === 'string') {
            // 使用正则表达式找出所有Markdown格式的图片链接
            const imgRegex = /!\[(.*?)\]\((file:\/\/|local-file:\/\/)?([^)]+)\)/g;
            let matches = [];
            let match;

            // 创建一个数组来存储所有需要处理的图片匹配
            const imgMatches = [];
            while ((match = imgRegex.exec(processedMsg.content)) !== null) {
              imgMatches.push([...match]);
            }

            // 处理所有图片匹配
            await Promise.all(imgMatches.map(async ([fullMatch, altText, protocol, imgPath]) => {
              // 检查图片路径是否存在
              try {
                await fs.access(imgPath);
                // 路径存在，不需要修改
                return;
              } catch (error) {
                // 路径不存在，尝试查找替代路径
                const fileName = path.basename(imgPath);
                const alternativePaths = [
                  path.join(conversationPath, 'images', fileName),
                  path.join(conversationPath, fileName)
                ];

                for (const altPath of alternativePaths) {
                  try {
                    await fs.access(altPath);
                    // 找到替代路径，更新内容
                    const newImgLink = `![${altText}](local-file://${altPath})`;
                    processedMsg.content = processedMsg.content.replace(fullMatch, newImgLink);

                    // 确保files数组中包含这个图片
                    if (!processedMsg.files) {
                      processedMsg.files = [];
                    }

                    // 检查files中是否已存在该图片
                    const imageExists = processedMsg.files.some(file =>
                      file.path === altPath || path.basename(file.path) === fileName
                    );

                    if (!imageExists) {
                      try {
                        const stats = await fs.stat(altPath);
                        processedMsg.files.push({
                          name: fileName,
                          path: altPath,
                          type: path.extname(fileName).toLowerCase(),
                          size: stats.size,
                          timestamp: stats.mtime.toISOString()
                        });
                      } catch (statErr) {
                        console.error(`获取图片状态失败: ${statErr.message}`);
                      }
                    }

                    break; // 找到一个可用路径就退出循环
                  } catch (accessErr) {
                    // 继续尝试下一个路径
                  }
                }
              }
            }));
          }

          return processedMsg;
        }));

        return processedMessages;
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

  // 添加一个新的函数来更新messages.json中的路径
  ipcMain.handle('update-messages-path', async (event, oldPath, newPath) => {
    try {
      console.log(`更新消息路径: ${oldPath} -> ${newPath}`);

      // 读取messages.json文件
      const messagesPath = path.join(newPath, 'messages.json');

      try {
        // 检查文件是否存在
        await fs.access(messagesPath);

        // 读取消息内容
        const content = await fs.readFile(messagesPath, 'utf8');
        const messages = JSON.parse(content);

        if (!Array.isArray(messages)) {
          console.warn('消息文件格式无效:', messagesPath);
          return false;
        }

        // 是否有任何路径更新
        let hasUpdates = false;

        // 更新每条消息中的路径信息
        const updatedMessages = messages.map(msg => {
          // 创建消息的副本
          const updatedMsg = { ...msg };

          // 更新txtFile路径
          if (updatedMsg.txtFile && updatedMsg.txtFile.path) {
            const originalPath = updatedMsg.txtFile.path;

            // 只替换路径前缀，保留文件名
            if (originalPath.startsWith(oldPath)) {
              const fileName = path.basename(originalPath);
              updatedMsg.txtFile = {
                ...updatedMsg.txtFile,
                path: path.join(newPath, fileName)
              };
              hasUpdates = true;
            }
          }

          // 更新files数组中的路径
          if (updatedMsg.files && Array.isArray(updatedMsg.files)) {
            updatedMsg.files = updatedMsg.files.map(file => {
              if (file && file.path && file.path.startsWith(oldPath)) {
                const fileName = path.basename(file.path);
                hasUpdates = true;
                return {
                  ...file,
                  path: path.join(newPath, fileName)
                };
              }
              return file;
            });
          }

          return updatedMsg;
        });

        // 只有在有实际更新时才写入文件
        if (hasUpdates) {
          console.log(`正在更新 ${messagesPath} 的路径信息，共 ${messages.length} 条消息`);
          await fs.writeFile(messagesPath, JSON.stringify(updatedMessages, null, 2), 'utf8');
          return true;
        } else {
          console.log('没有需要更新的路径');
          return false;
        }
      } catch (error) {
        console.error('更新消息路径失败:', error);
        return false;
      }
    } catch (error) {
      console.error('更新消息路径失败:', error);
      throw error;
    }
  });
}

module.exports = registerConversationIpc
