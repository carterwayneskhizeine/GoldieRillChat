// 阿里云百炼API服务
import toastManager from '../utils/toastManager';

// 默认的阿里云百炼API地址
const DEFAULT_DASHSCOPE_API_HOST = 'https://dashscope.aliyuncs.com';

/**
 * 获取阿里云百炼API配置
 * 注意：API密钥只能从环境变量或.env.local文件获取，不再从localStorage获取
 * @returns {Object} 返回 {apiKey: null} 对象，表示API密钥将在后端获取
 */
export const getDashscopeApiConfig = () => {
  return { apiKey: null };
};

/**
 * 检查阿里云百炼API密钥是否已配置
 * 由于API密钥只在后端检查，前端无法确定是否已配置
 * @returns {boolean} 返回true，表示需要在后端验证
 */
export const isDashscopeApiConfigured = () => {
  return true;
};

/**
 * 调用阿里云百炼API的通用函数
 * 由于API密钥只在后端使用，这个函数将通过IPC调用后端
 * @param {string} endpoint - API端点
 * @param {Object} params - 请求参数
 * @returns {Promise<Object>} API响应结果
 */
export const callDashscopeApi = async (endpoint, params) => {
  try {
    if (window.electron && window.electron.ipcRenderer) {
      // 通过IPC调用主进程中的API
      return await window.electron.ipcRenderer.invoke('dashscope-api-call', { endpoint, params });
    } else {
      throw new Error('无法访问Electron IPC接口');
    }
  } catch (error) {
    console.error('阿里云百炼API调用失败:', error);
    toastManager.error(`阿里云百炼API调用失败: ${error.message}`, { duration: 3000 });
    throw error;
  }
}; 