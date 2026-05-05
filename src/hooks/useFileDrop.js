import { useState, useRef } from 'react'

export default function useFileDrop({ messages, setMessages, currentConversation, setShouldScrollToBottom, selectedFiles, setSelectedFiles }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const dragCounterRef = useRef(0)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (!currentConversation) return
    if (e.dataTransfer.types && (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file'))) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging && e.dataTransfer.types &&
        (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-moz-file'))) {
      setIsDragging(true)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    if (!currentConversation) {
      alert('请先选择或创建一个对话')
      return
    }

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    try {
      setIsUploading(true)
      setUploadProgress(0)
      const totalFiles = files.length
      let processedCount = 0

      for (const file of files) {
        try {
          const result = await window.electron.saveFile(currentConversation.path, {
            name: file.name,
            data: await file.arrayBuffer()
          })
          processedCount++
          setUploadProgress(Math.floor((processedCount / totalFiles) * 100))

          const processedFile = { name: result.name, path: result.path, type: file.type }

          let messageContent = `文件: ${file.name}`
          if (file.type.startsWith('image/')) messageContent = `图片文件: ${file.name}`
          else if (file.type.startsWith('video/')) messageContent = `视频文件: ${file.name}`
          else if (file.type.startsWith('audio/')) messageContent = `音频文件: ${file.name}`
          else if (file.type === 'application/pdf') messageContent = `PDF文档: ${file.name}`
          else if (file.type.includes('document') || file.type.includes('sheet') || file.type.includes('presentation')) messageContent = `办公文档: ${file.name}`
          else if (file.type.includes('text/')) messageContent = `文本文件: ${file.name}`

          const tempMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: messageContent,
            type: 'user',
            timestamp: new Date().toISOString(),
            files: [processedFile]
          }

          const updatedMessages = [...messages, tempMessage]
          await window.electron.saveMessages(currentConversation.path, currentConversation.id, updatedMessages)
          setMessages(updatedMessages)
          if (typeof setShouldScrollToBottom === 'function') setShouldScrollToBottom(true)
        } catch (error) {
          alert(`文件 ${file.name} 上传失败: ${error.message}`)
        }
      }
    } catch (error) {
      alert('文件上传失败: ' + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInputChange = (e, conversation) => {
    if (!conversation) {
      alert('请先选择或创建一个对话')
      return
    }
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    setIsUploading(true)
    setUploadProgress(0)
    const totalFiles = files.length
    let processedCount = 0

    Promise.all(
      files.map(async (file) => {
        const result = await window.electron.saveFile(conversation.path, {
          name: file.name,
          data: await file.arrayBuffer()
        })
        processedCount++
        setUploadProgress(Math.floor((processedCount / totalFiles) * 100))
        return { name: result.name, path: result.path, type: file.type }
      })
    )
    .then((processedFiles) => {
      setSelectedFiles(prev => [...prev, ...processedFiles])
      e.target.value = ''
      setIsUploading(false)
    })
    .catch((error) => {
      alert('上传文件失败: ' + error.message)
      e.target.value = ''
      setIsUploading(false)
    })
  }

  return { isDragging, isUploading, uploadProgress, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handleFileInputChange }
}
