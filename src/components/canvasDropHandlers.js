/**
 * 处理画布拖放事件
 * @param {DragEvent} e - 拖放事件对象
 * @param {Function} loadImage - 加载图片的函数
 * @param {Function} setImageSize - 设置图片尺寸的函数
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const handleCanvasDrop = async (e, loadImage, setImageSize, setEditorState) => {
  e.preventDefault()
  e.stopPropagation()

  const files = Array.from(e.dataTransfer.files)
  const imageFile = files.find(file => file.type.startsWith('image/'))
  
  if (imageFile) {
    loadImage(imageFile, setImageSize, setEditorState)
  }
}

/**
 * 处理画布拖放悬停事件
 * @param {DragEvent} e - 拖放事件对象
 */
export const handleCanvasDragOver = (e) => {
  e.preventDefault()
  e.stopPropagation()
} 