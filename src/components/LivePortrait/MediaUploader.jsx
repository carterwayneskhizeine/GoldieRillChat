import axios from 'axios';

/**
 * 提供网络URL相关的工具函数
 */
const MediaUrlHelper = {
  /**
   * 验证URL是否有效
   * @param {string} url - 要验证的URL
   * @returns {Promise<boolean>} - URL是否有效
   */
  validateUrl: async (url) => {
    try {
      // 简单验证URL格式
      if (!url || !url.match(/^https?:\/\/.+/i)) {
        return false;
      }
      
      // 如果在Electron环境中运行，直接返回true，因为Electron可以绕过CORS限制
      if (window.electron && window.electron.ipcRenderer) {
        return true;
      }
      
      // 在浏览器环境中，仍然尝试发送HEAD请求检查资源是否存在
      // 注意：一些服务器可能不支持HEAD请求或阻止CORS
      const response = await axios.head(url, { timeout: 5000 });
      return response.status >= 200 && response.status < 400;
    } catch (error) {
      console.warn('URL验证失败，但可能是CORS限制导致:', error);
      // 即使验证失败，也返回true，因为可能是CORS问题而不是URL实际无效
      return true;
    }
  },
  
  /**
   * 获取URL的文件类型
   * @param {string} url - URL地址
   * @returns {string} - 文件扩展名或mime类型
   */
  getUrlFileType: (url) => {
    // 从URL中提取文件扩展名
    const extension = url.split('.').pop().toLowerCase();
    
    // 定义常见扩展名对应的mime类型
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'aac': 'audio/aac',
      'mp4': 'video/mp4',
      'avi': 'video/avi',
      'mov': 'video/quicktime'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
};

export default MediaUrlHelper; 