/**
 * 文件类型识别工具
 * 用于检测文件类型并返回适当的处理器类型
 */

// 文本文件类型
const TEXT_FILE_TYPES = ['.txt', '.md', '.markdown', '.json', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.htm'];

// 文档文件类型
const DOCUMENT_FILE_TYPES = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.odt', '.ods', '.odp'];

// 网页文件类型
const WEB_FILE_TYPES = ['.html', '.htm'];

// 图片文件类型
const IMAGE_FILE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

// 获取文件扩展名 - 改进版，可以处理中文文件名
const getFileExtension = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  
  // 查找最后一个点号的位置
  const lastDotIndex = filename.lastIndexOf('.');
  
  // 如果没有找到点号或点号在开头（如隐藏文件），则返回空字符串
  if (lastDotIndex <= 0) {
    return '';
  }
  
  // 返回点号后面的所有字符（扩展名），并转为小写
  return filename.substring(lastDotIndex + 1).toLowerCase();
};

/**
 * 检测文件类型
 * @param {string} filename - 文件名
 * @returns {string} - 文件类型：'text', 'document', 'web', 'image', 'unknown'
 */
const detectFileType = (filename) => {
  // 首先打印调试信息
  const extension = getFileExtension(filename);
  console.log(`检测文件类型: ${filename}, 提取的扩展名: ${extension}`);
  
  const extensionWithDot = `.${extension}`;
  
  if (TEXT_FILE_TYPES.includes(extensionWithDot)) {
    return 'text';
  } else if (DOCUMENT_FILE_TYPES.includes(extensionWithDot)) {
    return 'document';
  } else if (WEB_FILE_TYPES.includes(extensionWithDot)) {
    return 'web';
  } else if (IMAGE_FILE_TYPES.includes(extensionWithDot)) {
    return 'image';
  } else {
    return 'unknown';
  }
};

/**
 * 检查是否为支持的文档类型
 * @param {string} filename 
 * @returns {boolean}
 */
const isSupportedDocumentType = (filename) => {
  const extension = `.${getFileExtension(filename)}`;
  return DOCUMENT_FILE_TYPES.includes(extension);
};

/**
 * 检查是否为支持的文本文件类型
 * @param {string} filename 
 * @returns {boolean}
 */
const isSupportedTextType = (filename) => {
  const extension = `.${getFileExtension(filename)}`;
  return TEXT_FILE_TYPES.includes(extension);
};

/**
 * 检查是否为网页文件类型
 * @param {string} filename 
 * @returns {boolean}
 */
const isWebType = (filename) => {
  const extension = `.${getFileExtension(filename)}`;
  return WEB_FILE_TYPES.includes(extension);
};

/**
 * 检查URL是否为站点地图
 * @param {string} url 
 * @returns {boolean}
 */
const isSitemapUrl = (url) => {
  return url.includes('sitemap.xml') || url.endsWith('sitemap.xml');
};

export {
  detectFileType,
  getFileExtension,
  isSupportedDocumentType,
  isSupportedTextType,
  isWebType,
  isSitemapUrl,
  TEXT_FILE_TYPES,
  DOCUMENT_FILE_TYPES,
  WEB_FILE_TYPES,
  IMAGE_FILE_TYPES
}; 