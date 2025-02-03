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
import { ContextMenu } from './components/ContextMenu'
import { formatMessageTime } from './utils/timeFormat'
import { handleFileSelect, removeFile, handleFileDrop } from './components/fileHandlers'
import { BrowserTabs } from './components/BrowserTabs'
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
import { ImageLightbox } from './components/ImageLightbox'
import { getAllMessageImages, findImageIndex } from './components/imagePreviewUtils'
import './styles/lightbox.css'
import { MarkdownEditor } from './components/MarkdownEditor'
import { ChatView } from './components/ChatView'
import './styles/chatview.css'
import { tools, getToolDisplayName, createToolSwitcher } from './config/toolsConfig'
import { initializeBrowserState, useBrowserEvents, useSidebarEffect } from './components/browserHandlers'
import { useKeyboardEvents } from './components/keyboardHandlers'
import { globalStyles } from './styles/globalStyles'
import {
  initializeChatState,
  initializeEditorState,
  initializeImagePreviewState,
  initializeUIState,
  initializeCanvasState,
  initializeStoragePath,
  initializeSidebarState
} from './components/stateInitializers'

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

  const handleCanvasDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // 添加图片拖动相关的处理函数
  const handleImageContextMenu = (e) => {
    e.preventDefault() // 阻止默认的右键菜单
  }

  const handleImageMouseMove = (e) => {
    if (editorState.dragging) {
      const deltaX = e.clientX - editorState.lastX
      const deltaY = e.clientY - editorState.lastY
      
      // Add 0.25 speed factor to slow down movement
      const speedFactor = 0.5
      
      setEditorState(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX * speedFactor,
        offsetY: prev.offsetY + deltaY * speedFactor
      }))
    }
  }

  const handleImageMouseUp = () => {
    setEditorState(prev => ({
      ...prev,
      dragging: false
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

  // 创建工具切换函数
  const switchTool = createToolSwitcher(setActiveTool)

  // 使用新的浏览器事件处理函数
  useBrowserEvents({
    activeTool,
    sidebarOpen,
    sidebarMode,
    browserTabs,
    activeTabId,
    setBrowserTabs,
    setActiveTabId,
    setCurrentUrl,
    setIsLoading,
    setPageTitle
  })

  // 使用新的侧边栏状态监听函数
  useSidebarEffect({
    activeTool,
    sidebarOpen,
    sidebarMode
  })

  // 在 handleImageClick 函数附近添加
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

  return (
    <div className="h-screen flex flex-col">
      <style>{globalStyles}</style>
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
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
        <div className={`${sidebarOpen ? (sidebarMode === 'chat' ? 'w-[400px]' : 'w-[200px]') : 'w-0'} bg-base-300 text-base-content overflow-hidden transition-all duration-300 flex flex-col`}>
          <div className={`${sidebarMode === 'chat' ? 'w-[400px]' : 'w-[200px]'} flex flex-col h-full`}>
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
                  <span className="font-semibold">
                    {getToolDisplayName(activeTool)}
                  </span>
                </div>
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
                {activeTool === 'browser' && (
                  <button
                    className="btn btn-circle btn-ghost btn-sm"
                    onClick={() => window.electron.browser.newTab()}
                  >
                    <svg className="h-5 w-5" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                )}
              </div>

              {/* 工具特定内容 */}
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
                          handleDragStart(conversation, setDraggedConversation)
                        }}
                        onDragOver={(e) => {
                          if (editingFolderName !== null) return
                          handleDragOver(e)
                        }}
                        onDrop={(e) => {
                          if (editingFolderName !== null) return
                          handleDrop(conversation, draggedConversation, conversations, setConversations, setDraggedConversation)
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
                            <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={folderNameInput}
                                onChange={(e) => setFolderNameInput(e.target.value)}
                                className="input input-xs input-bordered w-full"
                                placeholder="输入新的文件夹名称"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    renameChatFolder(
                                      conversation, 
                                      folderNameInput,
                                      conversations,
                                      currentConversation,
                                      setConversations,
                                      setCurrentConversation,
                                      setEditingFolderName,
                                      setFolderNameInput,
                                      window
                                    )
                                  }
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  className="btn btn-xs btn-primary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    renameChatFolder(
                                      conversation, 
                                      folderNameInput,
                                      conversations,
                                      currentConversation,
                                      setConversations,
                                      setCurrentConversation,
                                      setEditingFolderName,
                                      setFolderNameInput,
                                      window
                                    )
                                  }}
                                >
                                  Confirm
                                </button>
                                <button
                                  className="btn btn-xs"
                                  onClick={() => {
                                    setEditingFolderName(null)
                                    setFolderNameInput('')
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
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

              {activeTool === 'browser' && (
                <div className="flex-1 mt-2 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-hidden">
                    {sidebarMode === 'default' ? (
                      <BrowserTabs
                        tabs={browserTabs}
                        activeTabId={activeTabId}
                        onTabClick={(tabId) => window.electron.browser.switchTab(tabId)}
                        onTabClose={(tabId) => window.electron.browser.closeTab(tabId)}
                        onNewTab={() => window.electron.browser.newTab()}
                      />
                    ) : (
                      <ChatView
                        messages={messages}
                        currentConversation={currentConversation}
                        editingMessage={editingMessage}
                        setEditingMessage={setEditingMessage}
                        messageInput={messageInput}
                        setMessageInput={setMessageInput}
                        selectedFiles={selectedFiles}
                        setSelectedFiles={setSelectedFiles}
                        sendMessage={sendMessage}
                        deleteMessage={confirmDeleteMessage}
                        updateMessage={updateMessageInApp}
                        moveMessage={moveMessageInApp}
                        enterEditMode={enterEditMode}
                        exitEditMode={exitEditMode}
                        collapsedMessages={collapsedMessages}
                        setCollapsedMessages={setCollapsedMessages}
                        isCompact={true}
                        handleImageClick={handleImageClick}
                        fileInputRef={fileInputRef}
                      />
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm w-full flex justify-start gap-2 p-2 border-t border-base-content/10"
                    onClick={handleSidebarModeToggle}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{sidebarMode === 'default' ? 'Open Chat' : 'Back'}</span>
                  </button>
                </div>
              )}

              {activeTool === 'markdown' && (
                <div className="flex-1 mt-2 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-hidden">
                    {sidebarMode === 'default' ? (
                      <div className="empty-sidebar">
                        {/* Markdown侧边栏的内容可以在这里添加 */}
                      </div>
                    ) : (
                      <ChatView
                        messages={messages}
                        currentConversation={currentConversation}
                        editingMessage={editingMessage}
                        setEditingMessage={setEditingMessage}
                        messageInput={messageInput}
                        setMessageInput={setMessageInput}
                        selectedFiles={selectedFiles}
                        setSelectedFiles={setSelectedFiles}
                        sendMessage={sendMessage}
                        deleteMessage={confirmDeleteMessage}
                        updateMessage={updateMessageInApp}
                        moveMessage={moveMessageInApp}
                        enterEditMode={enterEditMode}
                        exitEditMode={exitEditMode}
                        collapsedMessages={collapsedMessages}
                        setCollapsedMessages={setCollapsedMessages}
                        isCompact={true}
                        handleImageClick={handleImageClick}
                        fileInputRef={fileInputRef}
                      />
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm w-full flex justify-start gap-2 p-2 border-t border-base-content/10"
                    onClick={handleSidebarModeToggle}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{sidebarMode === 'default' ? 'Open Chat' : 'Back'}</span>
                  </button>
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
              {/* Chat content area */}
              <div 
                className="absolute inset-0 overflow-y-auto overflow-x-hidden"
                style={{ 
                  bottom: '80px',  // 给底部留出空间
                  paddingBottom: '20px'  // 添加一些底部内边距
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => handleFileDrop(e, currentConversation, setSelectedFiles, window.electron)}
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
                      <div className="chat-bubble relative max-w-[680px] break-words">
                        {message.content && (message.content.split('\n').length > 6 || message.content.length > 300) && (
                          <div
                            className="absolute right-0 flex items-center"
                            style={{
                              position: 'sticky',
                              top: '50px',
                              height: '0',
                              zIndex: 10,
                              transform: 'translateX(calc(102% + 1rem))'
                            }}
                          >
                            <button 
                              className="btn btn-md btn-ghost btn-circle bg-base-100"
                              onClick={() => {
                                setCollapsedMessages(prev => {
                                  const newSet = new Set(prev);
                                  const isCurrentlyCollapsed = newSet.has(message.id);
                                  
                                  if (isCurrentlyCollapsed) {
                                    newSet.delete(message.id);
                                    setTimeout(() => {
                                      scrollToMessage(message.id, 'smooth', 'start');
                                    }, 100);
                                  } else {
                                    newSet.add(message.id);
                                    setTimeout(() => {
                                      scrollToMessage(message.id, 'smooth', 'center');
                                    }, 100);
                                  }
                                  return newSet;
                                });
                              }}
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
                          <div className="edit-mode-container">
                            <textarea
                              value={messageInput}
                              onChange={(e) => {
                                setMessageInput(e.target.value)
                                // 自动调整高度
                                e.target.style.height = 'auto'
                                e.target.style.height = `${e.target.scrollHeight}px`
                              }}
                              className="edit-mode-textarea"
                              placeholder="编辑消息..."
                              autoFocus
                            />
                            <div className="edit-mode-buttons">
                              <button
                                className="edit-mode-button btn-primary"
                                onClick={() => updateMessageInApp(message.id, messageInput)}
                              >
                                保存
                              </button>
                              <button
                                className="edit-mode-button"
                                onClick={exitEditMode}
                              >
                                取消
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
                                  >
                                    {message.content}
                                  </div>
                              </div>
                            )}
                            {message.files?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {message.files.map((file, index) => (
                                  file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <div 
                                      key={index} 
                                      className="relative"
                                    >
                                      <img 
                                        src={`local-file://${file.path}`} 
                                        alt={file.name}
                                        className="max-w-[300px] max-h-[300px] rounded-lg object-cover cursor-pointer"
                                        onClick={(e) => handleImageClick(e, file)}
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
                                  className="btn btn-common btn-xs bg-base-100"
                                  onClick={() => {
                                    const imageFile = message.files.find(file => 
                                      file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                    );
                                    if (imageFile) {
                                      sendToEditor(imageFile)
                                    }
                                  }}
                                >
                                  Send
                                </button>
                              ) : message.content ? (
                                <button
                                  className="btn btn-common btn-xs bg-base-100"
                                  onClick={() => enterEditMode(message)}
                                >
                                  Edit
                                </button>
                              ) : null}
                              <button
                                className="btn btn-common btn-xs bg-base-100"
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
                                className="btn btn-common btn-xs bg-base-100"
                                onClick={() => copyMessageContent(message)}
                              >
                                Copy
                              </button>
                              {messages.indexOf(message) > 0 && (
                                <button
                                  className="btn btn-common btn-xs bg-base-100"
                                  onClick={() => moveMessageInApp(message.id, 'up')}
                                >
                                  Up
                                </button>
                              )}
                              {messages.indexOf(message) < messages.length - 1 && (
                                <button
                                  className="btn btn-common btn-xs bg-base-100"
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
              <div className={`absolute bottom-0 left-0 right-[20px] bg-base-100 ${editingMessage ? 'hidden' : ''}`}>
                <div className="p-4">
                  <div className="max-w-3xl mx-auto relative">
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="badge badge-outline gap-2">
                            {file.name}
                            <button
                              className="btn btn-common btn-xs"
                              onClick={() => removeFile(file, setSelectedFiles)}
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
                          const target = e.target
                          target.style.height = 'auto'
                          target.style.height = `${target.scrollHeight}px`
                          target.style.overflowY = target.scrollHeight > 480 ? 'scroll' : 'hidden'
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                            e.target.style.height = '64px'
                            e.target.style.overflowY = 'hidden'
                          }
                        }}
                        onPaste={(e) => handlePaste(e, currentConversation, setSelectedFiles, window.electron)}
                        onContextMenu={handleContextMenu}
                        placeholder="Send a message..."
                        className="message-input"
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button
                          className="btn btn-common btn-sm btn-circle"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-common btn-sm btn-circle"
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
                        onChange={(e) => handleFileSelect(e, currentConversation, setSelectedFiles, window.electron)}
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
                  {/* Existing editor content */}
                {/* Tools row - Move to top */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex-1 flex justify-start items-center">
                    <button
                      className="btn btn-sm"
                      disabled={!editorState.image || !currentConversation}
                      onClick={() => sendCanvasToChat(currentConversation, canvasRef.current, messages, setMessages, setActiveTool, window)}
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
                      onChange={(e) => loadImage(e.target.files[0], setImageSize, setEditorState)}
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
                          <li><button onClick={() => setResolution(1920, 1080, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">1920 × 1080</button></li>
                        <li><button onClick={() => setResolution(512, 512, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">512 × 512</button></li>
                        <li><button onClick={() => setResolution(512, 288, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">512 × 288</button></li>
                        <li><button onClick={() => setResolution(768, 320, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">768 × 320</button></li>
                        <li><button onClick={() => setResolution(768, 512, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">768 × 512</button></li>
                      </ul>
                    </div>

                    <button className="btn btn-sm btn-square" onClick={() => rotate(setEditorState)}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>

                    <button className="btn btn-sm btn-square" onClick={() => flip('h', setEditorState)}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>

                    <button className="btn btn-sm btn-square" onClick={() => flip('v', setEditorState)}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 8h16M4 16h16" />
                      </svg>
                    </button>

                    <button className="btn btn-sm btn-square" onClick={() => resetTransform(editorState, canvasSize, setEditorState)}>
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
                        <li><button onClick={() => downloadImage('jpg', canvasRef.current)}>JPG Format</button></li>
                        <li><button onClick={() => downloadImage('png', canvasRef.current)}>PNG Format</button></li>
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
                        onChange={(e) => handleResolutionChange('width', e.target.value, setTempCanvasSize, setCanvasSize, canvasSizeTimeoutRef)}
                        className="input input-bordered input-sm join-item w-20" 
                      />
                      <span className="join-item flex items-center px-2 bg-base-200">×</span>
                      <input 
                        type="number"
                        value={tempCanvasSize.height}
                        onChange={(e) => handleResolutionChange('height', e.target.value, setTempCanvasSize, setCanvasSize, canvasSizeTimeoutRef)}
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
                  className="canvas-container"
                  onMouseDown={(e) => handleMouseDown(e, editorState, isCtrlPressed, canvasRef.current, setIsRotating, setStartAngle, setLastRotation, setEditorState)}
                  onMouseMove={(e) => handleMouseMove(e, editorState, isRotating, canvasRef.current, startAngle, lastRotation, setEditorState)}
                  onMouseUp={handleMouseEvent}
                  onMouseLeave={handleMouseEvent}
                  onWheel={(e) => handleWheel(e, editorState, setEditorState)}
                  onDrop={(e) => handleCanvasDrop(e, loadImage, setImageSize, setEditorState)}
                  onDragOver={handleCanvasDragOver}
                >
                  <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className="canvas-element"
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
                {/* Browser view container */}
                <div className="flex-1 bg-base-100 overflow-auto">
                  {/* Browser view managed by main process */}
                </div>
              </div>
            )}

            {/* Markdown Editor */}
            {activeTool === 'markdown' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <MarkdownEditor />
              </div>
            )}
        </div>

        {/* Modals and overlays */}
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
                        <button className="btn btn-primary" onClick={() => handleSelectFolder(setStoragePath, currentConversation, messages, window)}>
                          Modify Folder
                        </button>
                    </div>
                </div>
                
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Update</h3>
                    <button className="btn btn-primary" onClick={() => handleUpdateFolders(storagePath, setConversations, window)}>
                      Update Folders
                    </button>
                </div>

                  <div className="divider"></div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Theme</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm opacity-70">{currentTheme}</span>
                      <button onClick={() => toggleTheme(currentTheme, themes, setCurrentTheme)} className="btn btn-primary">
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
                    deleteConversation(
                      deletingConversation.id,
                      conversations,
                      currentConversation,
                      setConversations,
                      setCurrentConversation,
                      setMessages,
                      window
                    )
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

        {/* All components need to be wrapped in the same parent element */}
        <div className="overlays">
          <ContextMenu
            contextMenu={contextMenu}
            onClose={closeContextMenu}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
            onCopy={handleCopyCode}
            onPaste={handlePasteCode}
            selectedElement={selectedElement}
          />

          <ImageLightbox
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            images={lightboxImages}
            startIndex={lightboxIndex}
          />
        </div>
      </div>
    </div>
  )
}