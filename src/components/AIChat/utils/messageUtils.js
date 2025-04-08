/**
 * 估算文本的 token 数量
 * @param {string} text - 输入文本
 * @returns {number} - 估算的 token 数量
 */
export const estimateTokens = (text) => {
  return Math.ceil(text.length / 4);
};

/**
 * 格式化时间戳
 * @param {Date|number|string} timestamp - 时间戳
 * @returns {string} - 格式化后的时间字符串
 */
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * 获取元素相对于父元素的顶部偏移
 * @param {HTMLElement} child - 子元素
 * @param {HTMLElement} parent - 父元素
 * @returns {number} - 偏移像素值
 */
export const getRelativeOffsetTop = (child, parent) => {
  let offset = 0;
  while (child && child !== parent) {
    offset += child.offsetTop;
    child = child.offsetParent;
  }
  return offset;
};

// API 密钥存储函数
export const saveApiKey = (provider, key) => {
  localStorage.setItem(`aichat_api_key_${provider}`, key);
};

// API 密钥获取函数
export const getApiKey = (provider) => {
  return localStorage.getItem(`aichat_api_key_${provider}`) || '';
}; 