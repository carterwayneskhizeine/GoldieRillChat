// 处理文件选择
export const handleFileSelect = async (event, currentConversation, setSelectedFiles, electron) => {
  if (!currentConversation) {
    alert('请先选择或创建一个对话')
    return
  }

  const files = Array.from(event.target.files)
  
  // Save files to chat folder
  const savedFiles = await Promise.all(files.map(async file => {
    const reader = new FileReader()
    const fileData = await new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsArrayBuffer(file)
    })
    
    const result = await electron.saveFile(currentConversation.path, {
      name: file.name,
      data: Array.from(new Uint8Array(fileData))
    })
    
    return {
      name: file.name,
      path: result.path
    }
  }))
  
  setSelectedFiles(prev => [...prev, ...savedFiles])
}

// 移除文件
export const removeFile = (fileToRemove, setSelectedFiles) => {
  setSelectedFiles(prev => prev.filter(file => file.name !== fileToRemove.name))
}

// 处理文件拖放
export const handleFileDrop = async (e, currentConversation, setSelectedFiles, electron) => {
  e.preventDefault()
  e.stopPropagation()

  if (!currentConversation) {
    alert('请先选择或创建一个对话')
    return
  }

  const files = Array.from(e.dataTransfer.files)
  
  // Save files to chat folder
  const savedFiles = await Promise.all(files.map(async file => {
    const reader = new FileReader()
    const fileData = await new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsArrayBuffer(file)
    })
    
    const result = await electron.saveFile(currentConversation.path, {
      name: file.name,
      data: Array.from(new Uint8Array(fileData))
    })
    
    return {
      name: file.name,
      path: result.path
    }
  }))
  
  setSelectedFiles(prev => [...prev, ...savedFiles])
} 