import React, { useState, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar'
import { 
  updateMessage,
  sendMessage as sendMessageOp,
  deleteMessage as deleteMessageOp,
  enterEditMode as enterEditModeOp,
  exitEditMode as exitEditModeOp
} from './components/messageOperations'
import { 
  loadConversations, 
  createNewConversation as createNewConversationOp,
  loadConversation as loadConversationOp 
} from './components/conversationOperations'
import { moveMessage as moveMessageOp } from './components/messageMovement'
import { copyMessageContent } from './components/messageUtils'
import { handlePaste } from './components/pasteHandler'
import { copyCode, pasteCode } from './components/codeOperations'

// 添加全局样式
const globalStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;     /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;            /* Chrome, Safari, Opera */
  }
  
  /* 添加窗口拖拽样式 */
  .app-drag-region {
    -webkit-app-region: drag;
    app-region: drag;
  }
  
  button, input, .no-drag {
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }
`

const themes = ["dark", "synthwave", "halloween", "forest", "pastel", "black", "luxury", "dracula", "business", "coffee", "emerald", "corporate", "retro", "aqua", "wireframe", "night", "dim", "sunset"]

// 在文件顶部添加工具页面配置
const tools = ['chat', 'browser', 'editor']

    export default function App() {
  // 修改初始工具为 chat
  const [activeTool, setActiveTool] = useState('chat')
  // 设置侧边栏默认打开
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [storagePath, setStoragePath] = useState(() => localStorage.getItem('storagePath') || '')
  
  // Chat related states
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [editingMessage, setEditingMessage] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImage, setCurrentImage] = useState(null)
  const [allImages, setAllImages] = useState([])
  const [editingFileName, setEditingFileName] = useState(null)
  const [fileNameInput, setFileNameInput] = useState('')

  // Add new state variables
  const [imageResolution, setImageResolution] = useState(null)
  const [editingImageName, setEditingImageName] = useState(null)
  const [imageNameInput, setImageNameInput] = useState('')

  // Add new state variables for folder renaming
  const [editingFolderName, setEditingFolderName] = useState(null)
  const [folderNameInput, setFolderNameInput] = useState('')
  // 添加删除确认状态
  const [deletingConversation, setDeletingConversation] = useState(null)
  // 在其他 state 声明附近添加
  const [deletingMessageId, setDeletingMessageId] = useState(null)

  // 添加图片编辑器相关的状态
  const canvasRef = useRef(null)
  const [editorState, setEditorState] = useState({
    image: null,
    scale: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    dragging: false,
    lastX: 0,
    lastY: 0,
    offsetX: 0,
    offsetY: 0
  })
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 })
  const [tempCanvasSize, setTempCanvasSize] = useState({ width: 1920, height: 1080 })
  const canvasSizeTimeoutRef = useRef(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  // Add new state variable for scroll control
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)

  // Add new state variable for Ctrl key press
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)

  // Add new state variables for mouse rotation
  const [startAngle, setStartAngle] = useState(0)
  const [lastRotation, setLastRotation] = useState(0)
  const [isRotating, setIsRotating] = useState(false)

  // Add new state variable for image scale
  const [imageScale, setImageScale] = useState(1)

  // 添加拖动排序相关的状态和函数
  const [draggedConversation, setDraggedConversation] = useState(null)

  // 添加图片拖动相关的状态
  const [imageDrag, setImageDrag] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    translateX: 0,
    translateY: 0,
    lastTranslateX: 0,
    lastTranslateY: 0
  })

  // Add new state for collapsed messages
  const [collapsedMessages, setCollapsedMessages] = useState(new Set())

  // 在其他 state 声明附近添加
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [selectedElement, setSelectedElement] = useState(null)

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
    localStorage.setItem('theme', currentTheme)
  }, [currentTheme])

  // Load conversations on mount
  useEffect(() => {
    const initializeConversations = async () => {
      try {
        const savedConversations = await loadConversations()
        setConversations(savedConversations)
      } catch (error) {
        alert(error.message)
      }
    }
    initializeConversations()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom()
      setShouldScrollToBottom(false)
    }
  }, [messages, shouldScrollToBottom])

  // Add keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(true)
      }
    }
    
    const handleKeyUp = (e) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const toggleTheme = () => {
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    setCurrentTheme(themes[nextIndex])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const createNewConversation = async () => {
    try {
      const result = await createNewConversationOp(storagePath, conversations, window.electron)
      
      setConversations(result.updatedConversations)
      setCurrentConversation(result.newConversation)
      setMessages([])
    } catch (error) {
      alert(error.message)
    }
  }

  const loadConversation = async (conversationId) => {
    try {
      const result = await loadConversationOp(conversationId, conversations, window.electron)
      setCurrentConversation(result.conversation)
      setMessages(result.messages)
      setShouldScrollToBottom(true)
    } catch (error) {
      alert(error.message)
      setMessages([])
    }
  }

  const sendMessage = async () => {
    try {
      const result = await sendMessageOp(
        messageInput,
        selectedFiles,
        messages,
        currentConversation,
        window.electron
      )
      
      setMessages(result.updatedMessages)
      setShouldScrollToBottom(true)
      setMessageInput('')
      setSelectedFiles([])
      
      // Reset textarea height and scrollbar
      const textarea = document.querySelector('textarea')
      if (textarea) {
        textarea.style.height = '48px'
        textarea.style.overflowY = 'hidden'
      }
    } catch (error) {
      alert(error.message)
    }
  }

  const deleteMessageInApp = async (messageId) => {
    setDeletingMessageId(messageId)
  }

  const confirmDeleteMessage = async () => {
    try {
      const updatedMessages = await deleteMessageOp(
        deletingMessageId,
        messages,
        currentConversation,
        window.electron
      )
      setMessages(updatedMessages)
      setDeletingMessageId(null)
    } catch (error) {
      alert(error.message)
    }
  }

  const cancelDeleteMessage = () => {
    setDeletingMessageId(null)
  }

  const enterEditMode = (message) => {
    const editState = enterEditModeOp(message)
    setEditingMessage(editState.editingMessage)
    setMessageInput(editState.messageInput)
  }

  const exitEditMode = () => {
    const editState = exitEditModeOp()
    setEditingMessage(editState.editingMessage)
    setMessageInput(editState.messageInput)
  }

  const updateMessageInApp = async (messageId, newContent) => {
    // Get the message being edited
    const message = messages.find(msg => msg.id === messageId)
    if (!message) return

    try {
      // 使用提取出的 updateMessage 函数
      const updatedMessages = await updateMessage(
        messageId,
        newContent,
        message,
        messages,
        currentConversation,
        window.electron
      )

      // Update state after successful file operations
      setMessages(updatedMessages)
    } catch (error) {
      alert(error.message)
      return
    }

    exitEditMode()
  }

  const deleteConversation = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId)
    if (!conversation) return

    try {
      // Move conversation folder to recycle bin
      await window.electron.moveFolderToRecycle(conversation.path)
      
      // Update state
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null)
        setMessages([])
      }
      
      // Update storage
      localStorage.setItem('conversations', JSON.stringify(
        conversations.filter(c => c.id !== conversationId)
      ))
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('删除对话失败')
    }
  }

  const handleSelectFolder = async () => {
    try {
      const result = await window.electron.selectFolder()
      if (result) {
        setStoragePath(result)
        localStorage.setItem('storagePath', result)
        // Save current messages to the new location
        if (currentConversation) {
          await window.electron.saveMessages(
            result,
            currentConversation.id,
            messages
          )
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    }
  }

  // Function to get all images from messages
  const getAllImages = () => {
    const images = []
    messages.forEach(message => {
      message.files?.forEach(file => {
        if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          images.push(file)
        }
      })
    })
    return images
  }

  // Function to show next image
  const showNextImage = () => {
    const images = getAllImages()
    const currentIndex = images.findIndex(img => img.path === currentImage.path)
    const nextIndex = (currentIndex + 1) % images.length
    setCurrentImage(images[nextIndex])
  }

  // Function to show previous image
  const showPrevImage = () => {
    const images = getAllImages()
    const currentIndex = images.findIndex(img => img.path === currentImage.path)
    const prevIndex = (currentIndex - 1 + images.length) % images.length
    setCurrentImage(images[prevIndex])
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showImageModal) return
      // 如果正在重命名，不处理左右键
      if (editingImageName) return
      
      if (e.key === 'ArrowRight') {
        showNextImage()
      } else if (e.key === 'ArrowLeft') {
        showPrevImage()
      } else if (e.key === 'Escape') {
        setShowImageModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showImageModal, currentImage, editingImageName])

  // Add renameMessageFile function
  const renameMessageFile = async (message, newFileName) => {
    if (!currentConversation || !message.txtFile) return
    
    try {
      // Find if there's an existing message with the target filename
      const existingMessage = messages.find(msg => 
        msg.txtFile && msg.txtFile.displayName === newFileName
      )

      const result = await window.electron.renameMessageFile(
        currentConversation.path,
        message.txtFile.displayName,
        newFileName
      )

      if (result.merged && existingMessage) {
        // Merge message contents
        const mergedMessage = {
          ...existingMessage,
          content: `${existingMessage.content}\n\n${message.content}`,
          txtFile: result
        }

        // Update messages array
        setMessages(prev => prev.map(msg => 
          msg.id === existingMessage.id ? mergedMessage : msg
        ).filter(msg => msg.id !== message.id))

        // Save to storage
        const updatedMessages = messages
          .map(msg => msg.id === existingMessage.id ? mergedMessage : msg)
          .filter(msg => msg.id !== message.id)

        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          updatedMessages
        )
      } else {
        // Just rename
        const updatedMessage = {
          ...message,
          txtFile: result
        }

        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? updatedMessage : msg
        ))

        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          messages.map(msg => msg.id === message.id ? updatedMessage : msg)
        )
      }
    } catch (error) {
      console.error('Failed to rename file:', error)
      alert('重命名失败')
    }
    
    setEditingFileName(null)
    setFileNameInput('')
  }

  // Add function to get image resolution
  const getImageResolution = (imgElement) => {
    setImageResolution({
      width: imgElement.naturalWidth,
      height: imgElement.naturalHeight
    })
  }

  // Add function to rename image file
  const renameImageFile = async (file, newFileName) => {
    if (!currentConversation) return
    
    try {
      const oldPath = file.path
      const oldDir = window.electron.path.dirname(oldPath)
      const extension = window.electron.path.extname(file.name)
      const newName = newFileName + extension
      
      const result = await window.electron.renameFile(
        currentConversation.path,
        file.name,
        newName
      )

      // Update messages with new file path
      const updatedMessages = messages.map(msg => {
        if (msg.files) {
          const updatedFiles = msg.files.map(f => 
            f.path === oldPath ? { ...f, name: newName, path: result.path } : f
          )
          return { ...msg, files: updatedFiles }
        }
        return msg
      })

      setMessages(updatedMessages)
      setCurrentImage({ ...currentImage, name: newName, path: result.path })
      
      // Save updated messages
      await window.electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        updatedMessages
      )
    } catch (error) {
      console.error('Failed to rename image:', error)
      alert('重命名失败')
    }
    
    setEditingImageName(null)
    setImageNameInput('')
  }

  // Add renameChatFolder function
  const renameChatFolder = async (conversation, newName) => {
    try {
      const result = await window.electron.renameChatFolder(conversation.path, newName)
      
      // Update conversations state
      const updatedConversations = conversations.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, name: result.name, path: result.path }
          : conv
      )
      
      setConversations(updatedConversations)
      if (currentConversation?.id === conversation.id) {
        setCurrentConversation({ ...currentConversation, name: result.name, path: result.path })
      }
      
      // Update storage
      localStorage.setItem('conversations', JSON.stringify(updatedConversations))
    } catch (error) {
      console.error('Failed to rename chat folder:', error)
      alert('重命名失败')
    }
    
    setEditingFolderName(null)
    setFolderNameInput('')
  }

  // Add new function to handle file drop
  const handleFileDrop = async (e) => {
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
      
      const result = await window.electron.saveFile(currentConversation.path, {
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

  // 图片编辑器功能
  const loadImage = async (file) => {
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

  const drawImage = () => {
    const canvas = canvasRef.current
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

  // 当图片或编辑状态改变时重绘
  useEffect(() => {
    drawImage()
  }, [editorState, canvasSize])

  // 添加对activeTool的监听，处理面板切换
  useEffect(() => {
    if (activeTool === 'editor') {
      // 使用setTimeout确保canvas已经渲染
      setTimeout(() => {
        drawImage()
      }, 0)
    } else if (activeTool === 'chat') {
      // 切换到chat面板时滚动到底部
      setTimeout(() => {
        scrollToBottom()
      }, 0)
    }
  }, [activeTool])

  // 图片编辑功能
  const rotate = () => {
    setEditorState(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }))
  }

  const flip = (direction) => {
    setEditorState(prev => ({
      ...prev,
      flipH: direction === 'h' ? !prev.flipH : prev.flipH,
      flipV: direction === 'v' ? !prev.flipV : prev.flipV
    }))
  }

  const resetTransform = () => {
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

  const setResolution = (width, height) => {
    setCanvasSize({ width, height })
    setTempCanvasSize({ width, height })  // 同步更新临时值
  }

  const downloadImage = (format = 'png') => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `image.${format}`
    link.href = canvas.toDataURL(`image/${format}`)
    link.click()
  }

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    if (!editorState.image) return

    const isCtrlMode = isCtrlPressed || document.getElementById('ctrlToggle').checked
    
    if (isCtrlMode) {
      // 进入旋转模式
      setIsRotating(true)
      const rect = canvasRef.current.getBoundingClientRect()
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

  const handleMouseMove = (e) => {
    if (!editorState.dragging || !editorState.image) return
    
    if (isRotating) {
      // 旋转模式
      const rect = canvasRef.current.getBoundingClientRect()
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

  const handleMouseUp = () => {
    setIsRotating(false)
    setEditorState(prev => ({
      ...prev,
      dragging: false
    }))
  }

  const handleWheel = (e) => {
    if (!editorState.image) return
    e.preventDefault()
    
    const scaleFactor = e.deltaY > 0 ? 0.99 : 1.01
    setEditorState(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(10, prev.scale * scaleFactor))
    }))
  }

  // 添加处理粘贴事件的函数
  const handlePaste = async (e) => {
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
        
        const result = await window.electron.saveFile(currentConversation.path, {
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

  // 添加时间格式化函数
  const formatMessageTime = (timestamp) => {
    const messageDate = new Date(timestamp)
    const today = new Date()
    const isToday = messageDate.toDateString() === today.toDateString()
    
    const hours = messageDate.getHours().toString().padStart(2, '0')
    const minutes = messageDate.getMinutes().toString().padStart(2, '0')
    const time = `${hours}:${minutes}`
    
    if (isToday) {
      return time
    } else {
      const year = messageDate.getFullYear()
      const month = (messageDate.getMonth() + 1).toString().padStart(2, '0')
      const day = messageDate.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day} ${time}`
    }
  }

  // 添加移动消息的函数
  const moveMessageInApp = async (messageId, direction) => {
    try {
      const updatedMessages = await moveMessageOp(
        messageId,
        direction,
        messages,
        isCtrlPressed,
        currentConversation,
        window.electron
      )
      setMessages(updatedMessages)
    } catch (error) {
      alert(error.message)
    }
  }

  // 添加发送图片到编辑器的函数
  const sendToEditor = async (file) => {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = `local-file://${file.path}`
    })
    
    setEditorState(prev => ({
      ...prev,
      image: img,
      scale: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
      offsetX: 0,
      offsetY: 0
    }))
    
    setImageSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    })
    
    // 切换到编辑器面板
    setActiveTool('editor')
  }

  // 添加处理分辨率输入的函数
  const handleResolutionChange = (dimension, value) => {
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

  // 在组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (canvasSizeTimeoutRef.current) {
        clearTimeout(canvasSizeTimeoutRef.current)
      }
    }
  }, [])

  // 添加发送画布图片到聊天的函数
  const sendCanvasToChat = async () => {
    if (!currentConversation) {
      alert('请先选择或创建一个对话')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const timestamp = Date.now()
      const fileName = `canvas_image_${timestamp}.png`
      
      // 将blob转换为Uint8Array
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // 保存文件
      const result = await window.electron.saveFile(currentConversation.path, {
        name: fileName,
        data: Array.from(uint8Array)
      })
      
      // 创建新消息
      const newMessage = {
        id: Date.now().toString(),
        content: '',
        timestamp: new Date().toISOString(),
        files: [{
          name: fileName,
          path: result.path
        }]
      }
      
      // 更新消息列表
      setMessages(prev => [...prev, newMessage])
      
      // 保存到storage
      await window.electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        [...messages, newMessage]
      )
      
      // 切换到chat面板
      setActiveTool('chat')
    } catch (error) {
      console.error('Failed to send canvas image:', error)
      alert('发送失败')
    }
  }

  // 添加图片缩放处理函数
  const handleImageWheel = (e) => {
    e.preventDefault()
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
    setImageScale(prev => Math.max(0.1, Math.min(10, prev * scaleFactor)))
  }

  // 添加拖动排序相关的状态和函数
  const handleDragStart = (conversation) => {
    setDraggedConversation(conversation)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = async (targetConversation) => {
    if (!draggedConversation || draggedConversation.id === targetConversation.id) return

    const oldIndex = conversations.findIndex(c => c.id === draggedConversation.id)
    const newIndex = conversations.findIndex(c => c.id === targetConversation.id)
    
    const newConversations = [...conversations]
    newConversations.splice(oldIndex, 1)
    newConversations.splice(newIndex, 0, draggedConversation)
    
    setConversations(newConversations)
    setDraggedConversation(null)
    
    // 保存新的顺序到存储
    localStorage.setItem('conversations', JSON.stringify(newConversations))
  }

  // 添加画布拖拽处理函数
  const handleCanvasDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      loadImage(imageFile)
    }
  }

  const handleCanvasDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // 添加检查图片位置的函数
  const checkImagePosition = (imgElement) => {
    const rect = imgElement.getBoundingClientRect()
    const distanceToBottom = window.innerHeight - (rect.top + rect.height)
    
    if (distanceToBottom < 100) {
      imgElement.parentElement.style.overflowY = 'auto'
    } else {
      imgElement.parentElement.style.overflowY = 'hidden'
    }
  }

  // 添加图片拖动相关的处理函数
  const handleImageContextMenu = (e) => {
    e.preventDefault() // 阻止默认的右键菜单
  }

  const handleImageMouseDown = (e) => {
    if (e.button === 2) { // 右键点击
      setImageDrag(prev => ({
        ...prev,
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        lastTranslateX: prev.translateX,
        lastTranslateY: prev.translateY
      }))
    }
  }

  const handleImageMouseMove = (e) => {
    if (imageDrag.isDragging) {
      const deltaX = e.clientX - imageDrag.startX
      const deltaY = e.clientY - imageDrag.startY
      
      // 添加0.25的速度系数来减缓移动速度
      const speedFactor = 0.5
      
      setImageDrag(prev => ({
        ...prev,
        translateX: prev.lastTranslateX + deltaX * speedFactor,
        translateY: prev.lastTranslateY + deltaY * speedFactor
      }))
    }
  }

  const handleImageMouseUp = () => {
    setImageDrag(prev => ({
      ...prev,
      isDragging: false
    }))
  }

  // 添加打开文件所在文件夹的函数
  const openFileLocation = async (file) => {
    try {
      await window.electron.openFileLocation(file.path)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('打开文件位置失败')
    }
  }

  // 添加更新文件夹的函数
  const handleUpdateFolders = async () => {
    if (!storagePath) {
      alert('请先在设置中选择存储文件夹')
      return
    }

    try {
      const folders = await window.electron.scanFolders(storagePath)
      setConversations(folders)
      // 保存到本地存储
      localStorage.setItem('conversations', JSON.stringify(folders))
      alert('更新文件夹成功')
    } catch (error) {
      console.error('Failed to update folders:', error)
      alert('更新文件夹失败')
    }
  }

  // Add toggle function
  const toggleMessageCollapse = (messageId) => {
    setCollapsedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })

    // 使用setTimeout确保状态更新后再滚动
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      if (messageElement) {
        messageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }, 100)
  }

  // 处理右键菜单
  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()  // 阻止事件冒泡
    const selection = window.getSelection()
    const text = selection.toString()

    setContextMenu({ visible: true, x: e.pageX, y: e.pageY })
    setSelectedText(text)
    setSelectedElement(e.target)
  }

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 })
    setSelectedText('')
    setSelectedElement(null)
  }

  // 复制代码
  const handleCopyCode = () => {
    copyCode(selectedElement, selectedText)
    closeContextMenu()
  }

  // 粘贴代码
  const handlePasteCode = async () => {
    await pasteCode(selectedElement, setMessageInput)
    closeContextMenu()
  }

  // 手动解析和渲染Markdown
  const renderMarkdown = (text) => {
    if (!text) return ''

    // 首先处理换行
    // 将连续两个或更多换行符转换为段落标签
    text = text.replace(/\n\s*\n/g, '</p><p>')
    // 将单个换行符转换为 <br>
    text = text.replace(/\n/g, '<br>')
    // 包裹整个文本为段落
    text = '<p>' + text + '</p>'

    // 解析标题 (需要处理段落标签)
    text = text.replace(/<p># (.*?)<\/p>/gim, '<h1>$1</h1>')
    text = text.replace(/<p>## (.*?)<\/p>/gim, '<h2>$1</h2>')
    text = text.replace(/<p>### (.*?)<\/p>/gim, '<h3>$1</h3>')

    // 解析粗体和斜体
    text = text.replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    text = text.replace(/\*(.*?)\*/gim, '<i>$1</i>')

    // 解析链接
    text = text.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

    // 解析图片
    text = text.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" class="max-w-full rounded-lg" />')

    // 解析引用 (需要处理段落标签)
    text = text.replace(/<p>> (.*?)<\/p>/gim, '<blockquote>$1</blockquote>')

    // 解析列表 (需要处理段落标签)
    // 将连续的列表项组合在一起
    let listItems = text.match(/<p>(?:\-|\d+\.) .*?<\/p>/gim)
    if (listItems) {
      listItems.forEach(item => {
        if (item.startsWith('<p>- ')) {
          // 无序列表
          text = text.replace(item, item.replace(/<p>- (.*?)<\/p>/gim, '<ul><li>$1</li></ul>'))
        } else {
          // 有序列表
          text = text.replace(item, item.replace(/<p>\d+\. (.*?)<\/p>/gim, '<ol><li>$1</li></ol>'))
        }
      })
    }

    // 解析表格 (需要处理段落标签)
    text = text.replace(/<p>\|(.*?)\|<\/p>/gim, '<table><tr><td>$1</td></tr></table>')

    // 解析代码块为普通文本 (需要处理段落标签)
    text = text.replace(/<p>```([\s\S]*?)```<\/p>/gim, '<pre>$1</pre>')

    // 清理多余的段落标签
    text = text.replace(/<p><\/p>/g, '')

    return text.trim()
  }

  // 添加工具切换函数
  const switchTool = (direction) => {
    const currentIndex = tools.indexOf(activeTool)
    if (direction === 'prev') {
      const prevIndex = (currentIndex - 1 + tools.length) % tools.length
      setActiveTool(tools[prevIndex])
    } else {
      const nextIndex = (currentIndex + 1) % tools.length
      setActiveTool(tools[nextIndex])
    }
  }

  // 获取当前工具显示名称
  const getToolDisplayName = (tool) => {
    switch (tool) {
      case 'chat':
        return 'Chat'
      case 'editor':
        return 'Image Editor'
      case 'browser':
        return 'Browser'
      default:
        return tool
    }
  }

  // 添加浏览器相关状态
  const [browserTabs, setBrowserTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pageTitle, setPageTitle] = useState('新标签页')

  // 修改浏览器事件监听的 useEffect
  useEffect(() => {
    if (activeTool === 'browser') {
      // 显示浏览器视图
      window.electron.browser.setVisibility(true)
      // 更新浏览器视图位置（考虑当前侧边栏状态）
      window.electron.browser.updateSidebarWidth(sidebarOpen ? 256 : 0)

      // 只在没有任何标签页时创建新标签页
      if (browserTabs.length === 0 && !activeTabId) {
        window.electron.browser.newTab('https://www.google.com')
      }

      // 监听标签页更新
      const tabsUnsubscribe = window.electron.browser.onTabsUpdate((tabs) => {
        setBrowserTabs(Object.values(tabs))
      })

      // 监听活动标签页更新
      const activeTabUnsubscribe = window.electron.browser.onActiveTabUpdate((tabId) => {
        setActiveTabId(tabId)
        const tab = browserTabs.find(t => t.id === tabId)
        if (tab) {
          setCurrentUrl(tab.url)
          setPageTitle(tab.title)
        }
      })

      // 监听 URL 更新
      const urlUnsubscribe = window.electron.browser.onUrlUpdate((url) => {
        setCurrentUrl(url)
      })

      // 监听加载状态
      const loadingUnsubscribe = window.electron.browser.onLoading((loading) => {
        setIsLoading(loading)
      })

      // 监听标题更新
      const titleUnsubscribe = window.electron.browser.onTitleUpdate((title) => {
        setPageTitle(title)
      })

      // 清理函数
      return () => {
        window.electron.browser.setVisibility(false)
        tabsUnsubscribe()
        activeTabUnsubscribe()
        urlUnsubscribe()
        loadingUnsubscribe()
        titleUnsubscribe()
      }
    }
  }, [activeTool, sidebarOpen, browserTabs.length, activeTabId])

  // 在 useEffect 中添加侧边栏状态监听
  useEffect(() => {
    if (activeTool === 'browser') {
      // 通知主进程侧边栏状态变化
      window.electron.browser.updateSidebarWidth(sidebarOpen ? 200 : 0)
    }
  }, [sidebarOpen, activeTool])

  const handleFileSelect = async (event) => {
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
      
      const result = await window.electron.saveFile(currentConversation.path, {
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

  const removeFile = (fileToRemove) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileToRemove.name))
  }

      return (
    <div className="flex flex-col h-screen" onClick={closeContextMenu}>
      <style>{globalStyles}</style>

      {/* 添加标题栏 */}
      <TitleBar 
        activeTool={activeTool}
        currentUrl={currentUrl}
        setCurrentUrl={setCurrentUrl}
        isLoading={isLoading}
      />

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar toggle bar */}
        <div
          className="h-full w-[10px] cursor-pointer hover:bg-base-300 flex items-center justify-center no-drag"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <div className="text-base-content">
            {sidebarOpen ? '◂' : '▸'}
          </div>
        </div>

      {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-50' : 'w-0'} bg-base-300 text-base-content overflow-hidden transition-all duration-300 flex flex-col`}>
          <div className="w-50 flex flex-col h-full">
            {/* Main content area */}
            <div className="p-2 flex-1 flex flex-col overflow-hidden">
              {/* Top buttons row - 三向切换 */}
        <div className="join grid grid-cols-2 mb-2">
          <button 
                  className="join-item btn btn-outline btn-sm"
                  onClick={() => switchTool('prev')}
          >
            Previous
          </button>
          <button 
                  className="join-item btn btn-outline btn-sm"
                  onClick={() => switchTool('next')}
          >
            Next
          </button>
        </div>

              {/* 工具页面指示器 */}
              <div className="flex justify-center gap-2 mb-2">
                {tools.map(tool => (
                  <div
                    key={tool}
                    className={`w-2 h-2 rounded-full ${activeTool === tool
                        ? 'bg-primary'
                        : 'bg-base-content opacity-20'
                      }`}
                  />
                ))}
        </div>

        {/* Current tool display */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
                  <span className="font-semibold mr-2">
                    {getToolDisplayName(activeTool)}
            </span>
            {activeTool === 'chat' && (
                    <button
                      className="btn btn-circle btn-ghost btn-sm"
                      onClick={createNewConversation}
                    >
                <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

              {/* Chat list */}
              {activeTool === 'chat' && (
        <div className="flex-1 mt-2 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className={`btn btn-ghost justify-between ${
                  currentConversation?.id === conversation.id ? 'btn-active' : ''
                } ${draggedConversation?.id === conversation.id ? 'opacity-50' : ''}`}
                        draggable={editingFolderName === null}
                        onDragStart={() => {
                          if (editingFolderName !== null) return
                          handleDragStart(conversation)
                        }}
                        onDragOver={(e) => {
                          if (editingFolderName !== null) return
                          handleDragOver(e)
                        }}
                        onDrop={(e) => {
                          if (editingFolderName !== null) return
                          handleDrop(conversation)
                        }}
                        onContextMenu={(e) => {
                          if (editingFolderName !== null) return
                          e.preventDefault()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setContextMenu({
                            visible: true,
                            x: rect.right,
                            y: rect.top,
                            type: 'chat',
                            data: conversation
                          })
                        }}
                  onClick={() => {
                    if (editingFolderName === conversation.id) return
                    loadConversation(conversation.id)
                  }}
                >
                        <div className="flex items-center gap-2 flex-1">
                  {editingFolderName === conversation.id ? (
                            <div className="join w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={folderNameInput}
                      onChange={(e) => setFolderNameInput(e.target.value)}
                                className="input input-xs input-bordered join-item flex-1"
                      placeholder="Enter new folder name"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          renameChatFolder(conversation, folderNameInput)
                        }
                      }}
                      autoFocus
                    />
                              <button
                                className="btn btn-xs join-item"
                                onClick={() => renameChatFolder(conversation, folderNameInput)}
                              >
                                Yes
                              </button>
                  <button
                                className="btn btn-xs join-item"
                                onClick={() => {
                                  setEditingFolderName(null)
                                  setFolderNameInput('')
                                }}
                              >
                                No
                  </button>
                            </div>
                          ) : (
                            <span className="truncate">
                              {conversation.name}
                            </span>
                )}
                        </div>
              </div>
            ))}
          </div>
                </div>
              )}
        </div>

            {/* Settings button - 只在 Chat 工具激活时显示 */}
            {activeTool === 'chat' && (
              <div className="p-2 border-t border-base-content/10">
                <button
                  className="btn btn-ghost btn-sm w-full flex justify-start gap-2"
                  onClick={() => setShowSettings(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
                  <span>Settings</span>
          </button>
              </div>
            )}
        </div>
      </div>

      {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat content */}
        {activeTool === 'chat' && (
          <div className="flex-1 flex flex-col relative">
              {/* 现有的聊天内容 */}
            <div 
              className="absolute inset-0 overflow-y-auto overflow-x-hidden"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={handleFileDrop}
            >
              <div className="max-w-3xl mx-auto py-4 px-6 pb-32">
                {messages.map(message => (
                    <div key={message.id} className="chat chat-start mb-8 relative">
                    <div className="chat-header opacity-70 flex items-center gap-2">
                      {message.txtFile ? (
                        editingFileName === message.id ? (
                          <div className="join">
                            <input
                              type="text"
                              value={fileNameInput}
                              onChange={(e) => setFileNameInput(e.target.value)}
                              className="input input-xs input-bordered join-item"
                              placeholder="Enter new file name"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  renameMessageFile(message, fileNameInput)
                                }
                              }}
                            />
                            <button
                              className="btn btn-xs join-item"
                              onClick={() => renameMessageFile(message, fileNameInput)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-xs join-item"
                              onClick={() => {
                                setEditingFileName(null)
                                setFileNameInput('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="cursor-pointer hover:underline" onClick={() => {
                              setEditingFileName(message.id)
                              setFileNameInput(message.txtFile.displayName)
                            }}>
                              {message.txtFile.displayName}
                            </span>
                            <span className="text-xs opacity-50">
                              {formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="text-xs opacity-50">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="chat-bubble relative max-w-[800px] break-words">
                      {message.content && message.content.split('\n').length > 6 && (
                          <div
                            className="absolute right-0 flex items-center"
                            style={{
                              position: 'sticky',
                              top: '50px',  // 向下移动一倍
                              height: '0',
                              zIndex: 10,
                              transform: 'translateX(calc(102% + 1rem))'  // 向右移动两倍
                            }}
                          >
                        <button 
                              className="btn btn-md btn-ghost btn-circle bg-base-100"
                          onClick={() => toggleMessageCollapse(message.id)}
                        >
                          {collapsedMessages.has(message.id) ? (
                            <svg className="w-10 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-10 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </button>
                          </div>
                      )}
                      {editingMessage?.id === message.id ? (
                        <div className="join w-full">
                          <div className="mockup-code w-[650px] h-[550px] bg-base-300 relative">
                            <pre data-prefix=""></pre>
                            <textarea
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              className="absolute inset-0 top-[40px] bg-transparent text-current p-4 resize-none focus:outline-none w-full h-[calc(100%-40px)] font-mono"
                            />
                          </div>
                          <div className="absolute -bottom-8 -left-1 flex gap-1">
                            <button
                              className="btn btn-ghost btn-xs bg-base-100"
                              onClick={() => updateMessageInApp(message.id, messageInput)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-ghost btn-xs bg-base-100"
                              onClick={exitEditMode}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 group">
                          {message.content && (
                            <div className="flex justify-between items-start">
                              <div 
                                  className={`prose max-w-none break-words w-full ${collapsedMessages.has(message.id)
                                    ? 'max-h-[144px] overflow-y-auto' 
                                    : ''
                                }`}
                                style={{
                                  whiteSpace: 'pre-wrap'
                                }}
                                  data-message-id={message.id}
                                  onContextMenu={handleContextMenu}
                                  dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                                />
                            </div>
                          )}
                          {message.files?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {message.files.map((file, index) => (
                                file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <div 
                                    key={index} 
                                    className="relative group cursor-pointer"
                                    onClick={() => {
                                      setCurrentImage(file)
                                      setShowImageModal(true)
                                    }}
                                  >
                                    <img 
                                      src={`local-file://${file.path}`} 
                                      alt={file.name}
                                      className="max-w-[300px] max-h-[300px] rounded-lg object-cover hover:opacity-90 transition-opacity"
                                    />
                                  </div>
                                ) : file.name.match(/\.mp4$/i) ? (
                                  <div key={index} className="w-full">
                                    <video controls className="w-full max-w-[800px] rounded-lg">
                                      <source src={`local-file://${file.path}`} type="video/mp4" />
                                      Your browser does not support the video tag.
                                    </video>
                                  </div>
                                ) : (
                                  <div 
                                    key={index} 
                                    className="badge badge-outline cursor-pointer hover:bg-base-200"
                                    onClick={() => openFileLocation(file)}
                                  >
                                    {file.name}
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                          <div className="absolute -bottom-8 -left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 group-hover:delay-0 delay-[500ms]">
                            {message.files?.some(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                              <button
                                className="btn btn-ghost btn-xs bg-base-100"
                                onClick={() => {
                                  const imageFile = message.files.find(file => 
                                    file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                  )
                                  if (imageFile) {
                                    sendToEditor(imageFile)
                                  }
                                }}
                              >
                                Send
                              </button>
                            ) : message.content ? (
                              <button
                                className="btn btn-ghost btn-xs bg-base-100"
                                onClick={() => enterEditMode(message)}
                              >
                                Edit
                              </button>
                            ) : null}
                            <button
                              className="btn btn-ghost btn-xs bg-base-100"
                                onClick={() => deleteMessageInApp(message.id)}
                            >
                              Delete
                            </button>

                              {deletingMessageId === message.id && (
                                <div className="modal modal-open flex items-center justify-center">
                                  <div role="alert" className="alert w-[400px]">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      className="stroke-info h-6 w-6 shrink-0">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>Delete this message?</span>
                                    <div>
                                      <button className="btn btn-sm" onClick={cancelDeleteMessage}>
                                        No
                                      </button>
                                      <button className="btn btn-sm btn-primary ml-2" onClick={confirmDeleteMessage}>
                                        Yes
                                      </button>
                                    </div>
                                  </div>
                                  <div className="modal-backdrop" onClick={cancelDeleteMessage}></div>
                                </div>
                              )}
                            <button
                              className="btn btn-ghost btn-xs bg-base-100"
                              onClick={() => copyMessageContent(message)}
                            >
                              Copy
                            </button>
                            {messages.indexOf(message) > 0 && (
                              <button
                                className="btn btn-ghost btn-xs bg-base-100"
                                onClick={() => moveMessageInApp(message.id, 'up')}
                              >
                                Up
                              </button>
                            )}
                            {messages.indexOf(message) < messages.length - 1 && (
                              <button
                                className="btn btn-ghost btn-xs bg-base-100"
                                onClick={() => moveMessageInApp(message.id, 'down')}
                              >
                                Down
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom input area - fixed */}
            <div className={`absolute bottom-0 left-0 right-0 bg-transparent z-50 ${editingMessage ? 'hidden' : ''}`}>
              <div className="p-4">
                <div className="max-w-3xl mx-auto relative">
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="badge badge-outline gap-2">
                          {file.name}
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => removeFile(file)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <textarea 
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value)
                          // 自动调整高度
                          e.target.style.height = 'auto'  // 先重置高度
                          e.target.style.height = `${e.target.scrollHeight}px`  // 设置为实际内容高度
                          // 如果超过最大高度，显示滚动功能（但滚动条隐藏）
                          if (e.target.scrollHeight > 480) {
                            e.target.style.overflowY = 'scroll'
                          } else {
                            e.target.style.overflowY = 'hidden'
                          }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                            // 重置高度
                          e.target.style.height = '64px'
                          e.target.style.overflowY = 'hidden'
                        }
                      }}
                      onPaste={(e) => handlePaste(e, currentConversation, setSelectedFiles, window.electron)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleContextMenu(e)
                      }}
                      placeholder="Send a message..."
                      className="textarea textarea-bordered w-full min-h-[64px] max-h-[480px] rounded-3xl resize-none pr-24 scrollbar-hide bg-base-100"
                      style={{
                        scrollbarWidth: 'none',  // Firefox
                        msOverflowStyle: 'none',  // IE and Edge
                        '&::-webkit-scrollbar': {  // Chrome, Safari, Opera
                          display: 'none'
                        }
                      }}
                      rows="2"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-circle"
                        onClick={sendMessage}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Editor content */}
        {activeTool === 'editor' && (
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
              {/* 现有的编辑器内容 */}
            {/* Tools row - 移动到顶部 */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex-1 flex justify-start items-center">
                <button
                  className="btn btn-sm"
                  disabled={!editorState.image || !currentConversation}
                  onClick={sendCanvasToChat}
                >
                  Send
                </button>
              </div>
              <div className="flex flex-wrap gap-2 justify-center items-center">
                <input
                  type="file"
                  id="imageInput"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => loadImage(e.target.files[0])}
                />
                <button 
                  className="btn btn-sm"
                  onClick={() => document.getElementById('imageInput').click()}
                >
                  Import
                </button>

                <div className="dropdown">
                  <button tabIndex={0} className="btn btn-sm">Res</button>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-32">
                      <li><button onClick={() => setResolution(1920, 1080)} className="whitespace-nowrap">1920 × 1080</button></li>
                    <li><button onClick={() => setResolution(512, 512)} className="whitespace-nowrap">512 × 512</button></li>
                    <li><button onClick={() => setResolution(512, 288)} className="whitespace-nowrap">512 × 288</button></li>
                    <li><button onClick={() => setResolution(768, 320)} className="whitespace-nowrap">768 × 320</button></li>
                    <li><button onClick={() => setResolution(768, 512)} className="whitespace-nowrap">768 × 512</button></li>
                  </ul>
                </div>

                <button className="btn btn-sm btn-square" onClick={rotate}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <button className="btn btn-sm btn-square" onClick={() => flip('h')}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>

                <button className="btn btn-sm btn-square" onClick={() => flip('v')}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 8h16M4 16h16" />
                  </svg>
                </button>

                <button className="btn btn-sm btn-square" onClick={resetTransform}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>

                <div className="dropdown">
                  <button tabIndex={0} className="btn btn-sm btn-square">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box">
                    <li><button onClick={() => downloadImage('jpg')}>JPG Format</button></li>
                    <li><button onClick={() => downloadImage('png')}>PNG Format</button></li>
                  </ul>
                </div>

                <div className="dropdown">
                  <button tabIndex={0} className="btn btn-sm">AR</button>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box">
                    <li><button onClick={() => {
                        const newHeight = Math.round(canvasSize.width * (9 / 16))
                      setCanvasSize(prev => ({ ...prev, height: newHeight }))
                      setTempCanvasSize(prev => ({ ...prev, height: newHeight }))
                    }}>16:9</button></li>
                    <li><button onClick={() => {
                        const newHeight = Math.round(canvasSize.width * (16 / 9))
                      setCanvasSize(prev => ({ ...prev, height: newHeight }))
                      setTempCanvasSize(prev => ({ ...prev, height: newHeight }))
                    }}>9:16</button></li>
                    <li><button onClick={() => {
                        const newHeight = Math.round(canvasSize.width * (3 / 4))
                      setCanvasSize(prev => ({ ...prev, height: newHeight }))
                      setTempCanvasSize(prev => ({ ...prev, height: newHeight }))
                    }}>4:3</button></li>
                    <li><button onClick={() => {
                      setCanvasSize(prev => ({ ...prev, height: prev.width }))
                      setTempCanvasSize(prev => ({ ...prev, height: prev.width }))
                    }}>1:1</button></li>
                  </ul>
                </div>

                <button className="btn btn-sm btn-square" onClick={() => {
                  const canvas = canvasRef.current
                  if (canvas) {
                    canvas.toBlob(blob => {
                      navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                      ])
                    })
                  }
                }}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>

                <div className="join">
                  <input 
                    type="number" 
                    value={tempCanvasSize.width}
                    onChange={(e) => handleResolutionChange('width', e.target.value)}
                    className="input input-bordered input-sm join-item w-20" 
                  />
                  <span className="join-item flex items-center px-2 bg-base-200">×</span>
                  <input 
                    type="number"
                    value={tempCanvasSize.height}
                    onChange={(e) => handleResolutionChange('height', e.target.value)}
                    className="input input-bordered input-sm join-item w-20"
                  />
                </div>
              </div>
              <div className="flex-1 flex justify-end items-center gap-2">
                <span className="text-sm opacity-70">Ctrl</span>
                <input
                  type="checkbox"
                  id="ctrlToggle"
                  className="toggle toggle-sm"
                  checked={isCtrlPressed}
                  onChange={(e) => setIsCtrlPressed(e.target.checked)}
                />
              </div>
            </div>

            {/* Canvas area */}
            <div 
              className="flex-1 bg-base-200 rounded-lg flex items-center justify-center overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
            >
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                className="bg-neutral-content rounded"
              />
            </div>

            {/* Resolution info */}
            <div className="flex gap-4 text-sm justify-center">
              <span className="opacity-70">Canvas: {canvasSize.width} × {canvasSize.height}</span>
              <span className="opacity-70">Image: {imageSize.width} × {imageSize.height}</span>
            </div>
          </div>
        )}

          {/* Browser content */}
          {activeTool === 'browser' && (
            <div className="flex-1 flex flex-col relative">
              {/* 标签栏 */}
              <div className="flex items-center gap-1 p-1 bg-base-300 overflow-x-auto scrollbar-hide">
                {browserTabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`flex items-center gap-1 px-3 py-1 rounded cursor-pointer hover:bg-base-100 ${
                      activeTabId === tab.id ? 'bg-base-100' : ''
                    }`}
                    onClick={() => window.electron.browser.switchTab(tab.id)}
                  >
                    {tab.isLoading ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-base-content border-t-transparent" />
                    ) : (
                      <div className="w-4 h-4 flex items-center justify-center">
                        {tab.favicon ? (
                          <img src={tab.favicon} alt="" className="w-4 h-4" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                    )}
                    <span className="max-w-[150px] truncate">{tab.title}</span>
                    <button
                      className="opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.electron.browser.closeTab(tab.id)
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => window.electron.browser.newTab()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* 浏览器视图容器 */}
              <div className="flex-1 bg-base-100 overflow-auto">
                {/* 浏览器视图由主进程管理 */}
              </div>
            </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button 
              onClick={() => setShowSettings(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Storage</h2>
                
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Folder</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm opacity-70">{storagePath || 'No folder selected'}</span>
                      <button className="btn btn-primary" onClick={handleSelectFolder}>
                        Modify Folder
                      </button>
                    </div>
                </div>
                
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Update</h3>
                    <button className="btn btn-primary" onClick={handleUpdateFolders}>
                      Update Folders
                    </button>
                </div>

                  <div className="divider"></div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Theme</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm opacity-70">{currentTheme}</span>
                      <button onClick={toggleTheme} className="btn btn-primary">
                        Change Theme
                      </button>
              </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowSettings(false)}></div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && currentImage && (
        <div className="modal modal-open">
          <div className="modal-box relative max-w-5xl h-[80vh] p-0 bg-transparent shadow-none overflow-visible flex flex-col">
            {/* 添加关闭按钮 */}
            <button 
              className="btn btn-circle btn-ghost bg-base-100 absolute right-0 -top-16 z-50"
              onClick={() => setShowImageModal(false)}
            >
              ✕
            </button>
            
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16">
              <button 
                className="btn btn-circle btn-ghost bg-base-100"
                onClick={showPrevImage}
              >
                ❮
              </button>
              </div>
            
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16">
              <button 
                className="btn btn-circle btn-ghost bg-base-100"
                onClick={showNextImage}
              >
                ❯
              </button>
            </div>

            <div className="w-full flex-1 flex items-center justify-center relative">
              <img 
                src={`local-file://${currentImage.path}`}
                alt={currentImage.name}
                className="max-w-full max-h-full object-contain z-10"
                style={{
                  transform: `scale(${imageScale}) translate(${imageDrag.translateX}px, ${imageDrag.translateY}px)`,
                  transition: imageDrag.isDragging ? 'none' : 'transform 0.1s ease-out',
                  cursor: imageDrag.isDragging ? 'grabbing' : 'grab'
                }}
                onLoad={(e) => {
                  getImageResolution(e.target)
                  setImageScale(1)
                  checkImagePosition(e.target)
                  // 重置拖动状态
                  setImageDrag({
                    isDragging: false,
                    startX: 0,
                    startY: 0,
                    translateX: 0,
                    translateY: 0,
                    lastTranslateX: 0,
                    lastTranslateY: 0
                  })
                }}
                onWheel={(e) => {
                  handleImageWheel(e)
                  checkImagePosition(e.target)
                }}
                onContextMenu={handleImageContextMenu}
                onMouseDown={handleImageMouseDown}
                onMouseMove={handleImageMouseMove}
                onMouseUp={handleImageMouseUp}
                onMouseLeave={handleImageMouseUp}
              />
          </div>

            <div className="bg-base-100 p-4 flex items-center justify-center gap-4 relative z-0" style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              margin: '0 20px 20px 20px'
            }}>
              {editingImageName === currentImage.path ? (
                <div className="join">
                  <input
                    type="text"
                    value={imageNameInput}
                    onChange={(e) => setImageNameInput(e.target.value)}
                    className="input input-bordered join-item"
                    placeholder="Enter new file name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        renameImageFile(currentImage, imageNameInput)
                      }
                    }}
                  />
                  <button
                    className="btn join-item"
                    onClick={() => renameImageFile(currentImage, imageNameInput)}
                  >
                    Save
                  </button>
                  <button
                    className="btn join-item"
                    onClick={() => {
                      setEditingImageName(null)
                      setImageNameInput('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <span
                    className="cursor-pointer hover:underline text-white"
                    onClick={() => {
                      setEditingImageName(currentImage.path)
                      setImageNameInput(currentImage.name.replace(/\.[^/.]+$/, ""))
                    }}
                  >
                    {currentImage.name}
                  </span>
                  {imageResolution && (
                    <div className="flex items-center gap-4">
                      <span className="text-white">
                        Res: {imageResolution.width} × {imageResolution.height}
                      </span>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            sendToEditor(currentImage)
                            setShowImageModal(false)
                          }}
                        >
                          Send to Editor
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={async () => {
                            try {
                              const img = new Image()
                              await new Promise((resolve, reject) => {
                                img.onload = resolve
                                img.onerror = reject
                                img.src = `local-file://${currentImage.path}`
                              })
                              
                              const canvas = document.createElement('canvas')
                              canvas.width = img.naturalWidth
                              canvas.height = img.naturalHeight
                              const ctx = canvas.getContext('2d')
                              ctx.drawImage(img, 0, 0)
                              
                              const blob = await new Promise(resolve => canvas.toBlob(resolve))
                              await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                              ])
                            } catch (error) {
                              console.error('Failed to copy image:', error)
                              alert('复制失败')
                            }
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div 
            className="modal-backdrop bg-black/80" 
            onClick={() => setShowImageModal(false)}
          ></div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingConversation && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete Chat</h3>
            <p className="py-4">Are you sure you want to delete this chat?</p>
            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => setDeletingConversation(null)}
              >
                No
              </button>
              <button 
                className="btn btn-error"
                onClick={() => {
                  deleteConversation(deletingConversation.id)
                  setDeletingConversation(null)
                }}
              >
                Yes
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeletingConversation(null)}></div>
        </div>
      )}

        {/* 右键菜单 */}
        {contextMenu.visible && (
          <div
            className="fixed z-[100]"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`
            }}
            onContextMenu={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.type === 'chat' ? (
              <ul className="menu menu-horizontal bg-base-200 rounded-box shadow-lg">
                <li>
                  <button
                    className="text-left px-4 py-2 hover:bg-base-300"
                    onClick={() => {
                      setDeletingConversation(contextMenu.data)
                      closeContextMenu()
                    }}
                  >
                    Delete
                  </button>
                </li>
                <li>
                  <button
                    className="text-left px-4 py-2 hover:bg-base-300"
                    onClick={() => {
                      setEditingFolderName(contextMenu.data.id)
                      setFolderNameInput(contextMenu.data.name)
                      closeContextMenu()
                    }}
                  >
                    Rename
                  </button>
                </li>
              </ul>
            ) : (
              <ul className={`menu ${selectedElement?.closest('textarea') ? 'menu-horizontal' : ''} bg-base-200 ${selectedElement?.closest('textarea') ? '' : 'w-56'} rounded-box shadow-lg`}>
                <li>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-base-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyCode()
                    }}
                  >
                    Copy
                  </button>
                </li>
                <li>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-base-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePasteCode()
                    }}
                  >
                    Paste
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
        </div>
      )
    }
