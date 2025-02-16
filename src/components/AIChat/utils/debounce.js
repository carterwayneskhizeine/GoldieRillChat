/**
 * 创建一个防抖函数
 * @param {Function} func 需要防抖的函数
 * @param {number} wait 等待时间（毫秒）
 * @param {boolean} [immediate=false] 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;

  return function executedFunction(...args) {
    const context = this;

    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}; 