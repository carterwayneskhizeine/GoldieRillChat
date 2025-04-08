/**
 * 加载图片到编辑器
 * @param {File} file - 要加载的图片文件
 * @param {Function} setImageSize - 设置图片尺寸的函数
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const loadImage = async (file, setImageSize, setEditorState) => {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      setImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      
      setEditorState(prev => ({
        ...prev,
        image: img,
        scale: 1,
        rotation: 0,
        flipH: false,
        flipV: false,
        offsetX: 0,
        offsetY: 0
      }));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/**
 * 在画布上绘制图片
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {Object} editorState - 编辑器状态
 */
export const drawImage = (canvas, editorState) => {
  if (!canvas || !editorState.image) return

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.translate(canvas.width / 2 + editorState.offsetX, canvas.height / 2 + editorState.offsetY)
  ctx.rotate(editorState.rotation * Math.PI / 180)
  ctx.scale(
    editorState.flipH ? -editorState.scale : editorState.scale,
    editorState.flipV ? -editorState.scale : editorState.scale
  )
  ctx.drawImage(
    editorState.image,
    -editorState.image.width / 2,
    -editorState.image.height / 2
  )
  ctx.restore()
}

/**
 * 重置图片变换
 * @param {Object} editorState - 当前编辑器状态
 * @param {Object} canvasSize - 画布尺寸
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const resetTransform = (editorState, canvasSize, setEditorState) => {
  if (!editorState.image) return
  
  // 计算适配画布宽度的缩放比例
  const scaleToFit = canvasSize.width / editorState.image.width
  
  setEditorState(prev => ({
    ...prev,
    scale: scaleToFit,  // 设置适配画布的缩放比例
    rotation: 0,
    flipH: false,
    flipV: false,
    offsetX: 0,
    offsetY: 0
  }))
}

/**
 * 设置画布分辨率
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {Function} setCanvasSize - 设置画布尺寸的函数
 * @param {Function} setTempCanvasSize - 设置临时画布尺寸的函数
 */
export const setResolution = (width, height, setCanvasSize, setTempCanvasSize) => {
  setCanvasSize({ width, height })
  setTempCanvasSize({ width, height })  // 同步更新临时值
}

/**
 * 下载编辑后的图片
 * @param {string} format - 图片格式 ('png' 或 'jpg')
 * @param {HTMLCanvasElement} canvas - 画布元素
 */
export const downloadImage = (format = 'png', canvas) => {
  if (!canvas) return

  const link = document.createElement('a')
  link.download = `image.${format}`
  link.href = canvas.toDataURL(`image/${format}`)
  link.click()
}

/**
 * 旋转图片
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const rotate = (setEditorState) => {
  setEditorState(prev => ({
    ...prev,
    rotation: (prev.rotation + 90) % 360
  }))
}

/**
 * 翻转图片
 * @param {string} direction - 翻转方向 ('h' 为水平翻转, 'v' 为垂直翻转)
 * @param {Function} setEditorState - 设置编辑器状态的函数
 */
export const flip = (direction, setEditorState) => {
  setEditorState(prev => ({
    ...prev,
    flipH: direction === 'h' ? !prev.flipH : prev.flipH,
    flipV: direction === 'v' ? !prev.flipV : prev.flipV
  }))
} 