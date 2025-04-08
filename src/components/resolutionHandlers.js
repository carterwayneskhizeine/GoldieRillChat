/**
 * 处理分辨率输入变化
 * @param {string} dimension - 要修改的维度 ('width' 或 'height')
 * @param {string} value - 新的值
 * @param {Function} setTempCanvasSize - 设置临时画布尺寸的函数
 * @param {Function} setCanvasSize - 设置画布尺寸的函数
 * @param {Object} canvasSizeTimeoutRef - 用于存储定时器的ref对象
 */
export const handleResolutionChange = (dimension, value, setTempCanvasSize, setCanvasSize, canvasSizeTimeoutRef) => {
  const newValue = value === '' ? '' : parseInt(value) || 0
  setTempCanvasSize(prev => ({ ...prev, [dimension]: newValue }))
  
  // 清除之前的定时器
  if (canvasSizeTimeoutRef.current) {
    clearTimeout(canvasSizeTimeoutRef.current)
  }
  
  // 设置新的定时器
  canvasSizeTimeoutRef.current = setTimeout(() => {
    setCanvasSize(prev => ({
      ...prev,
      [dimension]: newValue === '' ? 0 : newValue
    }))
  }, 1000)
} 