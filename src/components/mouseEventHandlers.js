/**
 * 处理鼠标按下事件
 * @param {MouseEvent} e - 鼠标事件对象
 * @param {Object} editorState - 编辑器状态
 * @param {boolean} isCtrlPressed - Ctrl键是否被按下
 * @param {HTMLElement} canvasRef - 画布元素引用
 * @param {Function} setIsRotating - 设置是否正在旋转的函数
 * @param {Function} setStartAngle - 设置开始角度的函数
 * @param {Function} setLastRotation - 设置上一次旋转角度的函数
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const handleMouseDown = (e, editorState, isCtrlPressed, canvasRef, setIsRotating, setStartAngle, setLastRotation, setEditorState) => {
  if (!editorState.image) return

  const isCtrlMode = isCtrlPressed || document.getElementById('ctrlToggle').checked
  
  if (isCtrlMode) {
    // 进入旋转模式
    setIsRotating(true)
    const rect = canvasRef.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const initialAngle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    ) * 180 / Math.PI
    
    setStartAngle(initialAngle)
    setLastRotation(editorState.rotation)
  }
  
  setEditorState(prev => ({
    ...prev,
    dragging: true,
    lastX: e.clientX,
    lastY: e.clientY
  }))
}

/**
 * 处理鼠标移动事件
 * @param {MouseEvent} e - 鼠标事件对象
 * @param {Object} editorState - 编辑器状态
 * @param {boolean} isRotating - 是否正在旋转
 * @param {HTMLElement} canvasRef - 画布元素引用
 * @param {number} startAngle - 开始角度
 * @param {number} lastRotation - 上一次旋转角度
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const handleMouseMove = (e, editorState, isRotating, canvasRef, startAngle, lastRotation, setEditorState) => {
  if (!editorState.dragging || !editorState.image) return
  
  if (isRotating) {
    // 旋转模式
    const rect = canvasRef.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const currentAngle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    ) * 180 / Math.PI
    
    const angleDiff = currentAngle - startAngle
    setEditorState(prev => ({
      ...prev,
      rotation: lastRotation + angleDiff
    }))
  } else {
    // 移动模式
    const dx = e.clientX - editorState.lastX
    const dy = e.clientY - editorState.lastY
    
    setEditorState(prev => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
      lastX: e.clientX,
      lastY: e.clientY
    }))
  }
}

/**
 * 处理鼠标松开事件
 * @param {Function} setIsRotating - 设置是否正在旋转的函数
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const handleMouseUp = (setIsRotating, setEditorState) => {
  setIsRotating(false)
  setEditorState(prev => ({
    ...prev,
    dragging: false
  }))
}

/**
 * 处理鼠标滚轮事件
 * @param {WheelEvent} e - 滚轮事件对象
 * @param {Object} editorState - 编辑器状态
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const handleWheel = (e, editorState, setEditorState) => {
  if (!editorState.image) return
  e.preventDefault()

  const delta = e.deltaY
  const scaleFactor = 0.1
  const newScale = delta > 0 
    ? Math.max(0.1, editorState.scale - scaleFactor)
    : Math.min(100, editorState.scale + scaleFactor)

  setEditorState(prev => ({
    ...prev,
    scale: newScale
  }))
} 