// 翻译服务
import { callSiliconCloud } from './modelProviders';
import toastManager from '../utils/toastManager';
import { STORAGE_KEYS } from '../components/AIChat/constants';

// 翻译服务的存储键名
const TRANSLATION_API_KEY = 'translation_siliconflow_api_key';
const TRANSLATION_API_HOST = 'translation_siliconflow_api_host';

// 默认的 SiliconFlow API 地址
const DEFAULT_SILICONFLOW_API_HOST = 'https://api.siliconflow.cn';

/**
 * 检测文本是否包含中文字符
 * @param {string} text - 要检测的文本
 * @returns {boolean} - 如果包含中文字符则返回true
 */
export const containsChinese = (text) => /[\u4e00-\u9fa5]/.test(text);

/**
 * 检测文本语言
 * @param {string} text - 要检测的文本
 * @returns {string} - 返回 'zh' 或 'en'
 */
export const detectLanguage = (text) => {
  return containsChinese(text) ? 'zh' : 'en';
};

/**
 * 获取翻译服务专用的 API 配置
 * 如果没有专门的翻译配置，则尝试使用 siliconflow 提供商的配置
 * @returns {Object} - 返回 {apiKey, apiHost} 对象
 */
export const getTranslationApiConfig = () => {
  // 尝试获取专门为翻译服务配置的 API 密钥和主机地址
  let apiKey = localStorage.getItem(TRANSLATION_API_KEY);
  let apiHost = localStorage.getItem(TRANSLATION_API_HOST);

  // 如果没有专门的翻译服务配置，尝试使用 siliconflow 提供商的配置
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
 * 设置翻译服务专用的 API 配置
 * @param {string} apiKey - API 密钥
 * @param {string} apiHost - API 主机地址
 */
export const setTranslationApiConfig = (apiKey, apiHost) => {
  if (apiKey) {
    localStorage.setItem(TRANSLATION_API_KEY, apiKey);
  }
  
  if (apiHost) {
    localStorage.setItem(TRANSLATION_API_HOST, apiHost);
  }
};

/**
 * 翻译文本（仅使用siliconflow的Qwen/Qwen2-1.5B-Instruct模型）
 * @param {string} text - 要翻译的文本
 * @param {string} provider - 模型提供商（将被忽略）
 * @param {string} model - 模型名称（将被忽略）
 * @param {string} apiKey - API密钥（如果提供则使用该密钥，否则使用专用的翻译配置）
 * @param {string} apiHost - API主机地址（如果提供则使用该地址，否则使用专用的翻译配置）
 * @returns {Promise<string>} - 翻译后的文本
 */
export const translateText = async (text, provider, model, userApiKey, userApiHost) => {
  if (!text.trim()) {
    return '';
  }

  try {
    // 获取翻译服务的 API 配置
    const { apiKey: translationApiKey, apiHost: translationApiHost } = getTranslationApiConfig();
    
    // 优先使用翻译专用的配置，如果没有则使用传入的配置，但始终确保使用 SiliconFlow API
    const apiKey = translationApiKey || userApiKey || '';
    
    // 强制使用 SiliconFlow API 主机地址，忽略用户当前选择的提供商
    // 优先使用翻译专用配置的 API 主机地址，如果没有则使用默认的 SiliconFlow API 地址
    const apiHost = translationApiHost || DEFAULT_SILICONFLOW_API_HOST;
    
    // 添加调试日志
    console.log('翻译服务使用的 API 配置:', { apiKey: apiKey ? '已设置' : '未设置', apiHost });
    
    // 如果没有 API 密钥，则无法进行翻译
    if (!apiKey) {
      toastManager.error('未配置 API 密钥，请在设置中添加 siliconflow 的 API 密钥', { duration: 5000 });
      return text;
    }
    
    // 检测语言
    const sourceLanguage = detectLanguage(text);
    const targetLanguage = sourceLanguage === 'zh' ? '英文' : '中文';
    
    // 构建翻译提示模板
    const translationPrompt = `
你是一位翻译专家。你的唯一任务是将 <translate_input> 标签内的文本从${sourceLanguage === 'zh' ? '中文' : '英文'}翻译成${targetLanguage}，直接提供翻译结果，不要添加任何解释，保持原始格式。

<translate_input>
${text}
</translate_input>

将上述 <translate_input> 标签内的文本翻译成${targetLanguage}，不要包含 <translate_input> 标签。
`;

    // 构建对话消息
    const messages = [
      {
        type: 'user',
        content: translationPrompt
      }
    ];

    // 强制使用 Qwen/Qwen2-1.5B-Instruct 模型
    const translationModel = 'Qwen/Qwen2-1.5B-Instruct';

    // 通知用户正在使用特定模型
    toastManager.info(`使用 ${translationModel} 模型进行翻译...`);
    
    // 添加更多调试日志
    console.log('翻译请求配置:', {
      apiHost,
      model: translationModel,
      messageCount: messages.length
    });

    // 直接调用 SiliconFlow API，而不是通过 callModelAPI
    const response = await callSiliconCloud({
      apiKey,
      apiHost,
      model: translationModel,
      messages,
      maxTokens: 2000,
      temperature: 0.3, // 使用较低的温度以获得更确定的翻译
      onUpdate: null // 不需要流式更新
    });

    return response.content.trim();
  } catch (error) {
    console.error('翻译失败:', error);
    toastManager.error('翻译失败: ' + error.message, { duration: 3000 }); // 3秒后自动消失
    return text; // 失败时返回原文本
  }
}; 