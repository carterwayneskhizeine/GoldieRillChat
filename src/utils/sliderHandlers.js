/**
 * 滑动条处理函数
 * 支持水平滑动条交互
 */

/**
 * 处理水平滑动条鼠标按下事件
 * @param {React.MouseEvent} event 鼠标事件
 * @param {Function} setter 状态设置函数
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @param {string} cssVariable CSS变量名，用于更新轨道填充
 * @param {Function} onValueChange 可选的值变化回调
 */
export const handleHorizontalSliderMouseDown = (
  event,
  setter,
  min,
  max,
  cssVariable,
  onValueChange = null
) => {
  const slider = event.currentTarget.parentElement;
  if (!slider) return;

  const updateSliderValue = (e) => {
    const rect = slider.getBoundingClientRect();
    const width = rect.width;
    const offsetX = Math.min(Math.max(0, e.clientX - rect.left), width);
    const percentage = (offsetX / width) * 100;
    const value = Math.round(((max - min) * percentage / 100 + min) * 10) / 10;
    
    // 更新状态
    setter(value);
    
    // 更新CSS变量以更新轨道填充
    if (cssVariable) {
      document.documentElement.style.setProperty(cssVariable, `${percentage}%`);
    }
    
    // 如果有回调，调用它
    if (onValueChange) {
      onValueChange(value);
    }
  };

  // 初始更新值
  updateSliderValue(event);
  
  const handleMouseMove = (e) => {
    updateSliderValue(e);
  };
  
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

/**
 * 更新滑动条轨道填充的CSS变量
 * @param {number} value 当前值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @param {string} cssVariable CSS变量名
 */
export const updateSliderTrack = (value, min, max, cssVariable) => {
  const percentage = ((value - min) / (max - min)) * 100;
  document.documentElement.style.setProperty(cssVariable, `${percentage}%`);
};

/**
 * 标准化滑动条值（将字符串转为数值，并限制在min和max之间）
 * @param {any} value 要标准化的值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @param {number} decimals 小数位数
 * @returns {number} 标准化后的值
 */
export const normalizeSliderValue = (value, min, max, decimals = 0) => {
  let numValue = typeof value === 'string' ? parseFloat(value) : value;
  numValue = Math.min(Math.max(min, numValue), max);
  
  if (decimals > 0) {
    const multiplier = Math.pow(10, decimals);
    return Math.round(numValue * multiplier) / multiplier;
  }
  
  return Math.round(numValue);
}; 