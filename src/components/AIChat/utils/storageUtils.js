import { STORAGE_KEYS } from '../constants';

/**
 * 从本地存储获取 API 密钥
 * @param {string} provider - 提供商名称
 * @returns {string} - API 密钥
 */
export const getApiKey = (provider) => {
  return localStorage.getItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${provider}`) || '';
};

/**
 * 保存 API 密钥到本地存储
 * @param {string} provider - 提供商名称
 * @param {string} key - API 密钥
 */
export const saveApiKey = (provider, key) => {
  localStorage.setItem(`${STORAGE_KEYS.API_KEY_PREFIX}_${provider}`, key);
};

/**
 * 从本地存储获取设置
 * @returns {Object} - 设置对象
 */
export const getSettings = () => {
  return {
    provider: localStorage.getItem(STORAGE_KEYS.SELECTED_PROVIDER),
    model: localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL),
    apiHost: localStorage.getItem(STORAGE_KEYS.API_HOST)
  };
};

/**
 * 保存设置到本地存储
 * @param {Object} settings - 设置对象
 */
export const saveSettings = (settings) => {
  const { provider, model, apiHost } = settings;
  if (provider) localStorage.setItem(STORAGE_KEYS.SELECTED_PROVIDER, provider);
  if (model) localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
  if (apiHost) localStorage.setItem(STORAGE_KEYS.API_HOST, apiHost);
};

/**
 * 从本地存储获取消息历史
 * @returns {Array} - 消息历史数组
 */
export const getMessageHistory = () => {
  const history = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  return history ? JSON.parse(history) : [];
};

/**
 * 保存消息历史到本地存储
 * @param {Array} messages - 消息历史数组
 */
export const saveMessageHistory = (messages) => {
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
};

/**
 * 清除所有本地存储数据
 */
export const clearStorage = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}; 