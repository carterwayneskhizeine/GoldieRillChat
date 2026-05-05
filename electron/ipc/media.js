const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs').promises
const axios = require('axios')
const crypto = require('crypto')

// 下载图片函数
async function downloadImage(url, folderPath) {
  try {
    // 创建文件夹（如果不存在）
    await fs.mkdir(folderPath, { recursive: true });

    // 生成唯一文件名
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const ext = path.extname(url).split('?')[0] || '.jpg'; // 获取扩展名，去除查询参数
    const fileName = `img_${hash}${ext}`;
    const filePath = path.join(folderPath, fileName);

    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      console.log(`图片已存在: ${filePath}`);
      return { success: true, filePath, fileName, url };
    } catch (err) {
      // 文件不存在，继续下载
    }

    // 下载图片
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 10000, // 10秒超时
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // 保存图片
    await fs.writeFile(filePath, response.data);
    console.log(`图片已下载: ${filePath}`);

    return { success: true, filePath, fileName, url };
  } catch (error) {
    console.error(`下载图片失败 ${url}:`, error.message);
    return { success: false, error: error.message, url };
  }
}

// 下载多个图片
async function downloadImages(imageUrls, folderPath) {
  try {
    // 确保文件夹存在
    await fs.mkdir(folderPath, { recursive: true });

    // 并行下载所有图片
    const results = await Promise.all(
      imageUrls.map(url => downloadImage(url, folderPath))
    );

    // 返回下载结果
    return {
      success: true,
      images: results.map(result => ({
        originalUrl: result.url,
        localPath: result.success ? result.filePath : null,
        fileName: result.success ? result.fileName : null,
        success: result.success,
        error: result.error || null
      }))
    };
  } catch (error) {
    console.error('下载多个图片失败:', error);
    return { success: false, error: error.message };
  }
}

function registerMediaIpc() {
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

  // 添加IPC处理器
  ipcMain.handle('download-search-images', async (event, imageUrls, folderPath) => {
    try {
      const result = await downloadImages(imageUrls, folderPath);
      return result;
    } catch (error) {
      console.error('下载图片IPC处理器错误:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = registerMediaIpc
