// 图片生成服务
import toastManager from '../utils/toastManager';
import { STORAGE_KEYS } from '../components/AIChat/constants';

// 图片生成服务的存储键名
const IMAGE_GEN_API_KEY = 'image_generation_siliconflow_api_key';
const IMAGE_GEN_API_HOST = 'image_generation_siliconflow_api_host';

// 默认的 SiliconFlow API 地址
const DEFAULT_SILICONFLOW_API_HOST = 'https://api.siliconflow.cn';

// 默认图片生成模型
const DEFAULT_IMAGE_MODEL = 'black-forest-labs/FLUX.1-schnell';

// 默认图片尺寸
const DEFAULT_IMAGE_SIZE = '1024x576';

/**
 * 获取图片生成服务专用的 API 配置
 * 如果没有专门的图片生成配置，则尝试使用 siliconflow 提供商的配置
 * @returns {Object} - 返回 {apiKey, apiHost} 对象
 */
export const getImageGenApiConfig = () => {
  // 尝试获取专门为图片生成服务配置的 API 密钥和主机地址
  let apiKey = localStorage.getItem(IMAGE_GEN_API_KEY);
  let apiHost = localStorage.getItem(IMAGE_GEN_API_HOST);

  // 如果没有专门的图片生成服务配置，尝试使用 siliconflow 提供商的配置
  if (!apiKey) {
    apiKey = localStorage.getItem(`${STORAGE_KEYS.API_KEY_PREFIX}_siliconflow`);
  }
  
  if (!apiHost) {
    apiHost = localStorage.getItem(`${STORAGE_KEYS.API_HOST}_siliconflow`);
    if (!apiHost) {
      apiHost = DEFAULT_SILICONFLOW_API_HOST; // 默认 siliconflow API 地址
    }
  }

  return { apiKey, apiHost };
};

/**
 * 设置图片生成服务专用的 API 配置
 * @param {string} apiKey - API 密钥
 * @param {string} apiHost - API 主机地址
 */
export const setImageGenApiConfig = (apiKey, apiHost) => {
  if (apiKey) {
    localStorage.setItem(IMAGE_GEN_API_KEY, apiKey);
  }
  
  if (apiHost) {
    localStorage.setItem(IMAGE_GEN_API_HOST, apiHost);
  }
};

/**
 * 生成图片（仅使用 SiliconFlow API）
 * @param {string} prompt - 图片生成提示词
 * @param {string} model - 模型名称（可选，默认使用 FLUX.1-schnell）
 * @param {string} imageSize - 图片尺寸（可选，默认使用 1024x576）
 * @param {Object} advancedParams - 高级参数（仅用于 FLUX.1-pro 模型）
 * @param {string} conversationPath - 对话路径（用于保存图片）
 * @param {string} userApiKey - 用户提供的 API 密钥（可选）
 * @param {string} userApiHost - 用户提供的 API 主机地址（可选）
 * @returns {Promise<Object>} - 返回生成的图片信息
 */
export const generateImage = async (
  prompt, 
  model = DEFAULT_IMAGE_MODEL, 
  imageSize = DEFAULT_IMAGE_SIZE, 
  advancedParams = {}, 
  conversationPath,
  userApiKey, 
  userApiHost
) => {
  if (!prompt.trim()) {
    throw new Error('提示词不能为空');
  }

  if (!conversationPath) {
    throw new Error('对话路径不能为空');
  }

  try {
    // 获取图片生成服务的 API 配置
    const { apiKey: imageGenApiKey, apiHost: imageGenApiHost } = getImageGenApiConfig();
    
    // 优先使用图片生成专用的配置，如果没有则使用传入的配置
    const apiKey = imageGenApiKey || userApiKey || '';
    
    // 强制使用 SiliconFlow API 主机地址，忽略用户当前选择的提供商
    const apiHost = imageGenApiHost || DEFAULT_SILICONFLOW_API_HOST;
    
    // 添加调试日志
    console.log('图片生成服务使用的 API 配置:', { 
      apiKey: apiKey ? '已设置' : '未设置', 
      apiHost,
      model,
      imageSize
    });
    
    // 如果没有 API 密钥，则无法生成图片
    if (!apiKey) {
      toastManager.error('未配置 API 密钥，请在设置中添加 siliconflow 的 API 密钥', { duration: 5000 });
      throw new Error('未配置 API 密钥');
    }

    // 构建请求参数
    const apiParams = {
      prompt,
      model,
      conversationPath,
      apiKey,
      apiHost
    };

    // 根据模型类型添加不同的参数
    if (model === 'black-forest-labs/FLUX.1-pro') {
      // 对于 FLUX.1-pro 模型，需要添加宽度、高度等高级参数
      Object.assign(apiParams, {
        width: advancedParams.width || 1024,
        height: advancedParams.height || 768,
        steps: advancedParams.steps || 20,
        guidance: advancedParams.guidance || 3,
        safety_tolerance: advancedParams.safety_tolerance || 2,
        interval: advancedParams.interval || 2,
        prompt_upsampling: advancedParams.prompt_upsampling || false
      });
      
      // 确保宽度和高度是32的倍数
      apiParams.width = Math.floor(apiParams.width / 32) * 32;
      apiParams.height = Math.floor(apiParams.height / 32) * 32;
      
      // 验证宽度和高度
      if (apiParams.width < 256 || apiParams.width > 1440 || apiParams.width % 32 !== 0) {
        throw new Error(`宽度 ${apiParams.width} 必须是32的倍数，且在256-1440之间`);
      }
      if (apiParams.height < 256 || apiParams.height > 1440 || apiParams.height % 32 !== 0) {
        throw new Error(`高度 ${apiParams.height} 必须是32的倍数，且在256-1440之间`);
      }
    } else {
      // 其他模型使用 image_size
      apiParams.image_size = imageSize;
    }

    // 通知用户正在生成图片
    toastManager.info(`使用 ${model} 模型生成图片...`);
    
    // 检查是否在 Electron 环境中
    if (typeof window !== 'undefined' && window.electron && window.electron.generateImage) {
      // 在 Electron 环境中，调用 Electron 的图片生成 API
      return await window.electron.generateImage(apiParams);
    } else {
      // 在浏览器环境中，直接调用 SiliconFlow API
      // 注意：浏览器环境中无法保存图片到本地文件系统，所以这里只返回图片 URL
      
      // 构建请求体
      const requestBody = {
        model,
        prompt,
        seed: Math.floor(Math.random() * 9999999999)
      };
      
      // 根据模型添加不同的参数
      if (model === 'black-forest-labs/FLUX.1-pro') {
        Object.assign(requestBody, {
          width: apiParams.width,
          height: apiParams.height,
          steps: apiParams.steps,
          guidance: apiParams.guidance,
          safety_tolerance: apiParams.safety_tolerance,
          interval: apiParams.interval,
          prompt_upsampling: apiParams.prompt_upsampling
        });
      } else {
        requestBody.image_size = apiParams.image_size;
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
      
      // 返回图片信息
      return {
        url: data.images[0].url,
        localPath: data.images[0].url, // 在浏览器环境中，使用 URL 作为本地路径
        fileName: `image_${Date.now()}.png`,
        timestamp: new Date().toISOString(),
        seed: data.seed || requestBody.seed
      };
    }
  } catch (error) {
    console.error('图片生成失败:', error);
    toastManager.error('图片生成失败: ' + error.message, { duration: 3000 });
    throw error;
  }
}; 