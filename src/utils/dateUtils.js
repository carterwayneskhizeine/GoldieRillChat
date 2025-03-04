/**
 * 日期工具函数
 */

/**
 * 格式化ISO日期字符串为可读格式
 * @param {string} isoString - ISO格式的日期字符串
 * @param {boolean} includeTime - 是否包含时间部分
 * @returns {string} 格式化后的日期字符串
 */
export const formatISODate = (isoString, includeTime = true) => {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return isoString;
    }
    
    // 格式化日期部分
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const dateStr = `${year}-${month}-${day}`;
    
    // 如果包含时间部分，则格式化时间
    if (includeTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${dateStr} ${hours}:${minutes}:${seconds}`;
    }
    
    return dateStr;
  } catch (error) {
    console.error('格式化日期错误:', error);
    return isoString;
  }
};

/**
 * 获取相对时间描述（如"3分钟前"）
 * @param {string} isoString - ISO格式的日期字符串
 * @returns {string} 相对时间描述
 */
export const getRelativeTimeString = (isoString) => {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return isoString;
    }
    
    // 计算时间差（毫秒）
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 30) {
      return formatISODate(isoString, false); // 超过一个月显示日期
    } else if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return seconds <= 0 ? '刚刚' : `${seconds}秒前`;
    }
  } catch (error) {
    console.error('获取相对时间错误:', error);
    return isoString;
  }
}; 