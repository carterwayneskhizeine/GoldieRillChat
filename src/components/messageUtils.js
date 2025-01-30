export const copyMessageContent = async (message) => {
  try {
    // 创建一个新的 ClipboardItem 数组
    const clipboardItems = []
    
    // 如果有文本内容，添加到剪贴板项
    if (message.content) {
      const textBlob = new Blob([message.content], { type: 'text/plain' })
      clipboardItems.push(new ClipboardItem({ 'text/plain': textBlob }))
    }
    
    // 如果有图片文件，添加到剪贴板项
    if (message.files?.length > 0) {
      await Promise.all(message.files.map(async file => {
        if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          // 创建一个临时的 canvas 来获取图片数据
          const img = new Image()
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = `local-file://${file.path}`
          })
          
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          // 转换为 blob
          const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png')
          })
          
          clipboardItems.push(new ClipboardItem({ 'image/png': blob }))
        }
      }))
    }
    
    // 写入剪贴板
    await navigator.clipboard.write(clipboardItems)
  } catch (error) {
    console.error('Failed to copy content:', error)
    alert('复制失败')
  }
} 