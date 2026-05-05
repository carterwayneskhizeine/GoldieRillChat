const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const axios = require('axios')

// 添加获取环境变量API密钥的函数
function getDashscopeApiKey() {
  // 从环境变量获取API密钥
  if (process.env.DASHSCOPE_API_KEY) {
    return process.env.DASHSCOPE_API_KEY;
  }

  // 从.env.local文件获取API密钥
  const envPath = path.join(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/DASHSCOPE_API_KEY=(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    } catch (error) {
      console.error('读取配置文件失败:', error.message);
    }
  }

  console.warn('未找到DASHSCOPE_API_KEY，相关功能可能无法正常工作');
  return null;
}

async function proxyDashscopeDetect(apiKey, imageUrl) {
  try {
    // 优先使用传入的API密钥，如果没有则获取默认的API密钥
    const key = apiKey || getDashscopeApiKey();

    if (!key) {
      return { error: '未配置阿里云百炼API密钥，请在设置页面配置' };
    }

    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    };

    // 发送API请求
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/face-detect',
      {
        model: 'liveportrait-detect',
        input: {
          image_url: imageUrl
        }
      },
      { headers }
    );

    return { output: response.data.output };
  } catch (error) {
    console.error('百炼API请求失败:', error.message, error.response?.data);
    return {
      error: error.response?.data?.message || error.message,
      code: error.response?.status
    };
  }
}

async function proxyDashscopeSynthesis(apiKey, imageUrl, audioUrl) {
  try {
    // 优先使用传入的API密钥，如果没有则获取默认的API密钥
    const key = apiKey || getDashscopeApiKey();

    if (!key) {
      return { error: '未配置阿里云百炼API密钥，请在设置页面配置' };
    }

    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'X-DashScope-Async': 'enable'
    };

    // 发送API请求
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis/',
      {
        model: 'liveportrait',
        input: {
          image_url: imageUrl,
          audio_url: audioUrl
        },
        parameters: {
          template_id: 'normal',
          eye_move_freq: 0.5,
          video_fps: 30,
          mouth_move_strength: 1,
          paste_back: true,
          head_move_strength: 0.7
        }
      },
      { headers }
    );

    return { output: response.data.output };
  } catch (error) {
    console.error('百炼API请求失败:', error.message, error.response?.data);
    return {
      error: error.response?.data?.message || error.message,
      code: error.response?.status
    };
  }
}

async function proxyDashscopeTaskStatus(apiKey, taskId) {
  try {
    // 优先使用传入的API密钥，如果没有则获取默认的API密钥
    const key = apiKey || getDashscopeApiKey();

    if (!key) {
      return { error: '未配置阿里云百炼API密钥，请在设置页面配置' };
    }

    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${key}`
    };

    // 查询任务状态
    const response = await axios.get(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      { headers }
    );

    return { output: response.data.output };
  } catch (error) {
    console.error('查询任务状态失败:', error.message, error.response?.data);
    return {
      error: error.response?.data?.message || error.message,
      code: error.response?.status
    };
  }
}

// 轮询任务状态的函数
function pollTaskStatus(taskId, apiKey, webContents) {
  setTimeout(async () => {
    try {
      const result = await proxyDashscopeTaskStatus(apiKey, taskId);

      // 向渲染进程发送状态更新
      if (webContents && !webContents.isDestroyed()) {
        webContents.send('dashscope-task-status', result);
      }

      // 如果任务还在进行中，继续轮询
      if (
        result.output &&
        (result.output.task_status === 'PENDING' || result.output.task_status === 'RUNNING')
      ) {
        pollTaskStatus(taskId, apiKey, webContents);
      }
    } catch (error) {
      console.error('轮询任务状态失败:', error);
      if (webContents && !webContents.isDestroyed()) {
        webContents.send('dashscope-task-status', {
          error: error.message
        });
      }
    }
  }, 5000); // 5秒轮询一次
}

async function proxyDashscopeVideoRetalk(apiKey, videoUrl, audioUrl, refImageUrl = '', videoExtension = false) {
  try {
    // 优先使用传入的API密钥，如果没有则获取默认的API密钥
    const key = apiKey || getDashscopeApiKey();

    if (!key) {
      return { error: '未配置阿里云百炼API密钥，请在设置页面配置' };
    }

    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'X-DashScope-Async': 'enable'
    };

    // 准备请求数据
    const requestData = {
      model: 'videoretalk',
      input: {
        video_url: videoUrl,
        audio_url: audioUrl
      },
      parameters: {
        video_extension: videoExtension
      }
    };

    // 如果有参考图片URL，添加到请求中
    if (refImageUrl) {
      requestData.input.ref_image_url = refImageUrl;
    }

    // 发送API请求
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis/',
      requestData,
      { headers }
    );

    return { output: response.data.output };
  } catch (error) {
    console.error('VideoRetalk API请求失败:', error.message, error.response?.data);
    return {
      error: error.response?.data?.message || error.message,
      code: error.response?.status
    };
  }
}

function registerLivePortraitIpc() {
  // 添加阿里云百炼API相关IPC处理程序
  ipcMain.on('dashscope-detect', async (event, params) => {
    const { imageUrl, apiKey } = params;
    const result = await proxyDashscopeDetect(apiKey, imageUrl);
    event.sender.send('dashscope-detect-response', result);
  });

  ipcMain.on('dashscope-synthesis', async (event, params) => {
    const { imageUrl, audioUrl, apiKey } = params;
    const result = await proxyDashscopeSynthesis(apiKey, imageUrl, audioUrl);
    event.sender.send('dashscope-synthesis-response', result);
  });

  ipcMain.on('dashscope-poll-task', (event, params) => {
    const { taskId, apiKey } = params;
    // 启动轮询
    pollTaskStatus(taskId, apiKey, event.sender);
  });

  // 添加声动人像VideoRetalk的IPC处理
  ipcMain.on('dashscope-videoretalk', async (event, params) => {
    const { videoUrl, audioUrl, refImageUrl, videoExtension, apiKey } = params;
    const result = await proxyDashscopeVideoRetalk(apiKey, videoUrl, audioUrl, refImageUrl, videoExtension);
    event.sender.send('dashscope-videoretalk-response', result);
  });
}

module.exports = registerLivePortraitIpc
