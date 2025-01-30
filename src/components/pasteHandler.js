export const handlePaste = async (e, currentConversation, setSelectedFiles, electron) => {
  if (!currentConversation) {
    alert('请先选择或创建一个对话')
    return
  }

  const items = e.clipboardData.items
  const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'))
  
  if (imageItems.length > 0) {
    const savedFiles = await Promise.all(imageItems.map(async item => {
      const blob = item.getAsFile()
      const reader = new FileReader()
      const fileData = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result)
        reader.readAsArrayBuffer(blob)
      })
      
      const timestamp = Date.now()
      const extension = blob.type.split('/')[1]
      const fileName = `pasted_image_${timestamp}.${extension}`
      
      const result = await electron.saveFile(currentConversation.path, {
        name: fileName,
        data: Array.from(new Uint8Array(fileData))
      })
      
      return {
        name: fileName,
        path: result.path
      }
    }))
    
    setSelectedFiles(prev => [...prev, ...savedFiles])
  }
} 