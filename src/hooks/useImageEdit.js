import { useState, useEffect } from 'react'

const loadImageFromPath = async (filePath, fileName, fileType) => {
  const fileData = await window.electron.readBinaryFile(filePath)
  const blob = new Blob([fileData], { type: fileType || 'image/png' })
  return new File([blob], fileName || 'image.png', { type: fileType || 'image/png' })
}

export default function useImageEdit({ currentConversation, messages, setMessages, setShouldScrollToBottom }) {
  const [showInlineEditor, setShowInlineEditor] = useState(false)
  const [editingImage, setEditingImage] = useState(null)
  const [editingImageMessage, setEditingImageMessage] = useState(null)

  const handleEditImage = (message, file) => {
    window.electron.access(file.path)
      .then(async () => {
        try {
          const fileObj = await loadImageFromPath(file.path, file.name, file.type)
          setEditingImage(fileObj)
          setEditingImageMessage(message)
          setShowInlineEditor(true)
        } catch (error) {
          alert('无法编辑图片: 加载图片失败 - ' + error.message)
        }
      })
      .catch(error => {
        alert('无法编辑图片: 文件不存在或无法访问 - ' + error.message)
      })
  }

  const handleSaveEditedImage = (editedImage) => {
    if (!editedImage || !editingImageMessage || !currentConversation) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const uint8Array = new Uint8Array(e.target.result)
      try {
        const originalFileName = editedImage.name || ''
        const fileExt = originalFileName.split('.').pop() || 'png'
        const baseName = originalFileName.replace(/\.[^/.]+$/, '') || 'image'
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
        const newFileName = `edited_${baseName}_${timestamp}.${fileExt}`

        const savedFile = await window.electron.saveFile(currentConversation.path, {
          name: newFileName,
          data: Array.from(uint8Array)
        })

        const newMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: `编辑后的图片: ${savedFile.name}`,
          files: [savedFile],
          timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, newMessage])
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          [...messages, newMessage]
        )
        setShowInlineEditor(false)
        setEditingImage(null)
        setEditingImageMessage(null)
        if (typeof setShouldScrollToBottom === 'function') setShouldScrollToBottom(true)
      } catch (error) {
        alert('保存消息失败: ' + error.message)
      }
    }
    reader.onerror = () => alert('读取文件失败')
    reader.readAsArrayBuffer(editedImage)
  }

  const handleCancelEdit = () => {
    setShowInlineEditor(false)
    setEditingImage(null)
    setEditingImageMessage(null)
  }

  useEffect(() => {
    const handler = (e) => {
      const { message, file } = e.detail
      handleEditImage(message, file)
    }
    window.addEventListener('editImage', handler)
    return () => window.removeEventListener('editImage', handler)
  }, [])

  return { showInlineEditor, editingImage, handleEditImage, handleSaveEditedImage, handleCancelEdit }
}
