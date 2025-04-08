// 模型列表缓存的键名前缀
const MODEL_LIST_CACHE_KEY = 'aichat_model_list_';

// 保存模型列表到缓存
export const saveModelListToCache = (provider, models) => {
  try {
    localStorage.setItem(`${MODEL_LIST_CACHE_KEY}${provider}`, JSON.stringify({
      timestamp: Date.now(),
      models: models
    }));
  } catch (error) {
    console.error('保存模型列表到缓存失败:', error);
  }
};

// 从缓存获取模型列表
export const getModelListFromCache = (provider) => {
  try {
    const cached = localStorage.getItem(`${MODEL_LIST_CACHE_KEY}${provider}`);
    if (cached) {
      const { timestamp, models } = JSON.parse(cached);
      // 缓存24小时有效
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return models;
      }
    }
    return null;
  } catch (error) {
    console.error('从缓存获取模型列表失败:', error);
    return null;
  }
};

// 清除指定提供商的缓存
export const clearModelListCache = (provider) => {
  try {
    localStorage.removeItem(`${MODEL_LIST_CACHE_KEY}${provider}`);
  } catch (error) {
    console.error('清除模型列表缓存失败:', error);
  }
};

// 清除所有模型列表缓存
export const clearAllModelListCache = () => {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(MODEL_LIST_CACHE_KEY)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('清除所有模型列表缓存失败:', error);
  }
}; 