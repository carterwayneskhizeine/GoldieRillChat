import React, { useState, useEffect, useRef } from 'react'
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
import { formatMessageTime } from './utils/timeFormat'
import { handleFileSelect, removeFile, handleFileDrop } from './components/fileHandlers'
import { toggleMessageCollapse } from './components/messageCollapse'
import { loadImage, drawImage, rotate, flip, resetTransform, setResolution, downloadImage } from './components/imageOperations'
import { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } from './components/mouseEventHandlers'
import { handleCanvasDrop, handleCanvasDragOver } from './components/canvasDropHandlers'
import { handleResolutionChange } from './components/resolutionHandlers'
import { sendCanvasToChat } from './components/canvasChatHandlers'
import { handleDragStart, handleDragOver, handleDrop } from './components/conversationDragHandlers'
import { renameChatFolder } from './components/conversationRenameHandlers'
import { deleteConversation } from './components/conversationDeleteHandlers'
import { handleSelectFolder } from './components/folderHandlers'
import { handleUpdateFolders } from './components/folderUpdateHandlers'
import { toggleTheme, themes, initializeTheme, useThemeEffect } from './components/themeHandlers'
import './styles/lightbox.css'
import './styles/chatview.css'
import { tools, getToolDisplayName, createToolSwitcher } from './config/toolsConfig'
import { initializeBrowserState, useBrowserEvents, useSidebarEffect } from './components/browserHandlers'
import { useKeyboardEvents } from './components/keyboardHandlers'
import { globalStyles } from './styles/globalStyles'
import MainLayout from './components/MainLayout'
import {
  initializeChatState,
  initializeEditorState,
  initializeImagePreviewState,
  initializeUIState,
  initializeCanvasState,
  initializeStoragePath,
  initializeSidebarState
} from './components/stateInitializers'
import { getAllMessageImages, findImageIndex } from './components/imagePreviewUtils'

export default function App() {
  // 修改初始工具为 chat
  const [activeTool, setActiveTool] = useState('chat')
  
  // 侧边栏状态
  const initialSidebarState = initializeSidebarState()
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarState.sidebarOpen)
  const [sidebarMode, setSidebarMode] = useState(initialSidebarState.sidebarMode)
  const [previousMode, setPreviousMode] = useState(initialSidebarState.previousMode)

  // UI状态
  const initialUIState = initializeUIState()
  const [showSettings, setShowSettings] = useState(initialUIState.showSettings)
  const [isCtrlPressed, setIsCtrlPressed] = useState(initialUIState.isCtrlPressed)
  const [contextMenu, setContextMenu] = useState(initialUIState.contextMenu)
  const [selectedText, setSelectedText] = useState(initialUIState.selectedText)
  const [selectedElement, setSelectedElement] = useState(initialUIState.selectedElement)

  // 存储路径
  const [storagePath, setStoragePath] = useState(initializeStoragePath)

  // 聊天相关状态
  const initialChatState = initializeChatState()
  const [conversations, setConversations] = useState(initialChatState.conversations)
  const [currentConversation, setCurrentConversation] = useState(initialChatState.currentConversation)
  const [messages, setMessages] = useState(initialChatState.messages)
  const [messageInput, setMessageInput] = useState(initialChatState.messageInput)
  const [selectedFiles, setSelectedFiles] = useState(initialChatState.selectedFiles)
  const [editingMessage, setEditingMessage] = useState(initialChatState.editingMessage)
  const [editingFileName, setEditingFileName] = useState(initialChatState.editingFileName)
  const [fileNameInput, setFileNameInput] = useState(initialChatState.fileNameInput)
  const [editingFolderName, setEditingFolderName] = useState(initialChatState.editingFolderName)
  const [folderNameInput, setFolderNameInput] = useState(initialChatState.folderNameInput)
  const [deletingConversation, setDeletingConversation] = useState(initialChatState.deletingConversation)
  const [deletingMessageId, setDeletingMessageId] = useState(initialChatState.deletingMessageId)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(initialChatState.shouldScrollToBottom)

  // 浏览器状态
  const initialBrowserState = initializeBrowserState()
  const [browserTabs, setBrowserTabs] = useState(initialBrowserState.browserTabs)
  const [activeTabId, setActiveTabId] = useState(initialBrowserState.activeTabId)
  const [currentUrl, setCurrentUrl] = useState(initialBrowserState.currentUrl)
  const [isLoading, setIsLoading] = useState(initialBrowserState.isLoading)
  const [pageTitle, setPageTitle] = useState(initialBrowserState.pageTitle)

  // 编辑器状态
  const [editorState, setEditorState] = useState(initializeEditorState())

  // 画布状态
  const initialCanvasState = initializeCanvasState()
  const [canvasSize, setCanvasSize] = useState(initialCanvasState.canvasSize)
  const [tempCanvasSize, setTempCanvasSize] = useState(initialCanvasState.tempCanvasSize)
  const [imageSize, setImageSize] = useState(initialCanvasState.imageSize)

  // 图片预览状态
  const initialPreviewState = initializeImagePreviewState()
  const [lightboxOpen, setLightboxOpen] = useState(initialPreviewState.lightboxOpen)
  const [lightboxImages, setLightboxImages] = useState(initialPreviewState.lightboxImages)
  const [lightboxIndex, setLightboxIndex] = useState(initialPreviewState.lightboxIndex)

  // Refs
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const canvasSizeTimeoutRef = useRef(null)

  // Add new state variables for mouse rotation
  const [startAngle, setStartAngle] = useState(0)
  const [lastRotation, setLastRotation] = useState(0)
  const [isRotating, setIsRotating] = useState(false)

  // 添加拖动排序相关的状态
  const [draggedConversation, setDraggedConversation] = useState(null)

  // Add state for collapsed messages
  const [collapsedMessages, setCollapsedMessages] = useState(new Set())

  // 使用初始化函数替换原有的主题状态声明
  const [currentTheme, setCurrentTheme] = useState(initializeTheme())

  // 使用新的主题持久化Hook
  useThemeEffect(currentTheme)

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

  // 使用新的键盘事件Hook
  useKeyboardEvents({
    setIsCtrlPressed
  })

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

  // 当图片或编辑状态改变时重绘
  useEffect(() => {
    drawImage(canvasRef.current, editorState)
  }, [editorState, canvasSize])

  // 添加对activeTool的监听，处理面板切换
  useEffect(() => {
    if (activeTool === 'editor') {
      // 使用setTimeout确保canvas已经渲染
      setTimeout(() => {
        drawImage(canvasRef.current, editorState)
      }, 0)
    } else if (activeTool === 'chat') {
      // 切换到chat面板时滚动到底部
      setTimeout(() => {
        scrollToBottom()
      }, 0)
    }
  }, [activeTool])

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

  // 在组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (canvasSizeTimeoutRef.current) {
        clearTimeout(canvasSizeTimeoutRef.current)
      }
    }
  }, [])

  // 添加打开文件所在文件夹的函数
  const openFileLocation = async (file) => {
    try {
      await window.electron.openFileLocation(file.path)
    } catch (error) {
      console.error('Failed to open file location:', error)
      alert('打开文件位置失败')
    }
  }

  // 添加对 showContextMenu 事件的监听
  useEffect(() => {
    const handleShowContextMenu = (e) => {
      const { x, y, text, target } = e.detail;
      setContextMenu({ visible: true, x, y });
      setSelectedText(text);
      setSelectedElement(target);
    };

    window.addEventListener('showContextMenu', handleShowContextMenu);
    return () => {
      window.removeEventListener('showContextMenu', handleShowContextMenu);
    };
  }, []);

  // 处理右键菜单
  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
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

  // 处理删除对话
  const handleDeleteConversation = (conversation) => {
    setDeletingConversation(conversation)
  }

  // 处理重命名对话
  const handleRenameConversation = (conversation) => {
    setEditingFolderName(conversation.id)
    setFolderNameInput(conversation.name)
  }

  // 添加处理侧边栏模式切换的函数
  const handleSidebarModeToggle = () => {
    if (sidebarMode === 'default') {
      setPreviousMode('default')
      setSidebarMode('chat')
      
      // 如果没有选中的对话，选择第一个
      if (!currentConversation && conversations.length > 0) {
        loadConversation(conversations[0].id)
      }
    } else {
      setSidebarMode(previousMode)
      setPreviousMode(null)
    }
  }

  // 合并 onMouseUp 和 onMouseLeave 处理函数
  const handleMouseEvent = () => {
    handleMouseUp(setIsRotating, setEditorState)
  }

  // 统一的错误处理函数
  const handleError = (error) => {
    console.error(error)
    alert(error.message)
  }

  // 添加滚动到消息中心的函数
  const scrollToMessage = (messageId, behavior = 'smooth', align = 'center') => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior,
        block: align,
      })
    }
  }

  // 添加handleImageClick函数
  const handleImageClick = (e, file) => {
    e.preventDefault()
    e.stopPropagation()
    
    const allImages = getAllMessageImages(messages)
    const currentImage = { src: `local-file://${file.path}` }
    const imageIndex = findImageIndex(messages, currentImage)
    
    setLightboxImages(allImages)
    setLightboxIndex(imageIndex)
    setLightboxOpen(true)
  }

  return (
    <MainLayout
      // 全局状态
      activeTool={activeTool}
      sidebarOpen={sidebarOpen}
      sidebarMode={sidebarMode}
      showSettings={showSettings}
      isCtrlPressed={isCtrlPressed}
      // 组件状态
      conversations={conversations}
      currentConversation={currentConversation}
      messages={messages}
      editingMessage={editingMessage}
      messageInput={messageInput}
      selectedFiles={selectedFiles}
      editingFileName={editingFileName}
      fileNameInput={fileNameInput}
      editingFolderName={editingFolderName}
      folderNameInput={folderNameInput}
      deletingConversation={deletingConversation}
      deletingMessageId={deletingMessageId}
      shouldScrollToBottom={shouldScrollToBottom}
      browserTabs={browserTabs}
      activeTabId={activeTabId}
      currentUrl={currentUrl}
      isLoading={isLoading}
      pageTitle={pageTitle}
      editorState={editorState}
      canvasSize={canvasSize}
      tempCanvasSize={tempCanvasSize}
      imageSize={imageSize}
      lightboxOpen={lightboxOpen}
      lightboxImages={lightboxImages}
      lightboxIndex={lightboxIndex}
      collapsedMessages={collapsedMessages}
      currentTheme={currentTheme}
      // Refs
      messagesEndRef={messagesEndRef}
      fileInputRef={fileInputRef}
      canvasRef={canvasRef}
      canvasSizeTimeoutRef={canvasSizeTimeoutRef}
      // 状态更新函数
      setActiveTool={setActiveTool}
      setSidebarOpen={setSidebarOpen}
      setSidebarMode={setSidebarMode}
      setShowSettings={setShowSettings}
      setIsCtrlPressed={setIsCtrlPressed}
      setConversations={setConversations}
      setCurrentConversation={setCurrentConversation}
      setMessages={setMessages}
      setMessageInput={setMessageInput}
      setSelectedFiles={setSelectedFiles}
      setEditingMessage={setEditingMessage}
      setEditingFileName={setEditingFileName}
      setFileNameInput={setFileNameInput}
      setEditingFolderName={setEditingFolderName}
      setFolderNameInput={setFolderNameInput}
      setDeletingConversation={setDeletingConversation}
      setDeletingMessageId={setDeletingMessageId}
      setShouldScrollToBottom={setShouldScrollToBottom}
      setBrowserTabs={setBrowserTabs}
      setActiveTabId={setActiveTabId}
      setCurrentUrl={setCurrentUrl}
      setIsLoading={setIsLoading}
      setPageTitle={setPageTitle}
      setEditorState={setEditorState}
      setCanvasSize={setCanvasSize}
      setTempCanvasSize={setTempCanvasSize}
      setImageSize={setImageSize}
      setLightboxOpen={setLightboxOpen}
      setLightboxImages={setLightboxImages}
      setLightboxIndex={setLightboxIndex}
      setCollapsedMessages={setCollapsedMessages}
      setCurrentTheme={setCurrentTheme}
      // 事件处理函数
      handleSidebarModeToggle={handleSidebarModeToggle}
      createNewConversation={createNewConversation}
      loadConversation={loadConversation}
      sendMessage={sendMessage}
      confirmDeleteMessage={confirmDeleteMessage}
      updateMessage={updateMessageInApp}
      moveMessage={moveMessageInApp}
      enterEditMode={enterEditMode}
      exitEditMode={exitEditMode}
      handleImageClick={handleImageClick}
      handleSelectFolder={handleSelectFolder}
      handleUpdateFolders={handleUpdateFolders}
      toggleTheme={toggleTheme}
      themes={themes}
      storagePath={storagePath}
      setStoragePath={setStoragePath}
      renameChatFolder={renameChatFolder}
      handleResolutionChange={handleResolutionChange}
      sendCanvasToChat={sendCanvasToChat}
    />
  )
}