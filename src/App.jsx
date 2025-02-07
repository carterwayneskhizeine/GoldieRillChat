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
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import { MonacoEditor } from './components/MonacoEditor'
import { AIChat } from './components/AIChat'
import './styles/aichat.css'
import { generateRandomTheme } from './utils/themeGenerator'
import { 
  handleDeleteConversation, 
  handleRenameConversation,
  handleContextMenu
} from './components/conversationHandlers'

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
  const [draggedConversation, setDraggedConversation] = useState(initialChatState.draggedConversation)

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

  // Add state for collapsed messages
  const [collapsedMessages, setCollapsedMessages] = useState(new Set())

  // 使用初始化函数替换原有的主题状态声明
  const [currentTheme, setCurrentTheme] = useState(initializeTheme())

  // 使用新的主题持久化Hook
  useThemeEffect(currentTheme)

  // 添加发送到Monaco的处理函数
  const sendToMonaco = (message) => {
    // 切换到Monaco编辑器工具
    setActiveTool('monaco');
    
    // 构建格式化的内容
    const formattedContent = `// Chat Message from ${formatMessageTime(message.timestamp)}\n\n${message.content}`;

    // 如果编辑器已经准备好，直接设置内容
    if (window.monacoEditor) {
      window.monacoEditor.setValue(formattedContent);
    } else {
      // 如果编辑器还没准备好，将内容存储在全局变量中
      window.pendingMonacoContent = formattedContent;
    }
  };

  // 添加 sendToEditor 函数
  const sendToEditor = async (message) => {
    if (!message.files?.some(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
      return;
    }

    // 切换到编辑器工具
    setActiveTool('editor');
    
    // 获取第一个图片文件
    const imageFile = message.files.find(file => 
      file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );

    if (imageFile) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `local-file://${imageFile.path}`;
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
      
      setImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    }
  };

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
    if (!storagePath) {
      alert('请先在设置中选择存储文件夹');
      return;
    }

    try {
      // 生成新会话ID和名称
      const newId = Date.now().toString();
      const conversationCount = conversations.length;
      const newName = `AIChat${(conversationCount + 1).toString().padStart(2, '0')}`;

      // 在选定的存储路径下创建新的会话文件夹
      const folderPath = window.electron.path.join(storagePath, newName);
      const result = await window.electron.createAIChatFolder(folderPath);
      
      // 构造新会话对象
      const newConversation = {
        id: newId,
        name: newName,
        timestamp: new Date().toISOString(),
        path: result.path,
        messages: []
      };
      
      // 更新状态
      const updatedConversations = [...conversations, newConversation];
      setConversations(updatedConversations);
      setCurrentConversation(newConversation);
      setMessages([]);
      
      // 保存到本地存储
      localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
      localStorage.setItem('aichat_current_conversation', JSON.stringify(newConversation));
    } catch (error) {
      console.error('创建新会话失败:', error);
      alert('创建新会话失败: ' + error.message);
    }
  };

  const loadConversation = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    try {
      const messages = await window.electron.loadMessages(conversation.path, conversation.id);
      setMessages(messages || []);
      setCurrentConversation(conversation);
      localStorage.setItem('aichat_current_conversation', JSON.stringify(conversation));
    } catch (error) {
      console.error('加载会话消息失败:', error);
      alert('加载会话消息失败: ' + error.message);
    }
  };

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
    if (!currentConversation) return;
    
    try {
      let result;
      if (message.txtFile) {
        // 处理文本文件重命名
        result = await window.electron.renameMessageFile(
          currentConversation.path,
          message.txtFile.displayName,
          newFileName
        );

        if (result.merged) {
          // 合并消息内容
          const existingMessage = messages.find(msg => 
            msg.txtFile && msg.txtFile.displayName === newFileName
          );

          const mergedMessage = {
            ...existingMessage,
            content: `${existingMessage.content}\n\n${message.content}`,
            txtFile: result
          };

          setMessages(prev => prev.map(msg => 
            msg.id === existingMessage.id ? mergedMessage : msg
          ).filter(msg => msg.id !== message.id));

          await window.electron.saveMessages(
            currentConversation.path,
            currentConversation.id,
            messages.map(msg => msg.id === existingMessage.id ? mergedMessage : msg)
              .filter(msg => msg.id !== message.id)
          );
        } else {
          // 直接重命名
          const updatedMessage = {
            ...message,
            txtFile: result
          };

          setMessages(prev => prev.map(msg => 
            msg.id === message.id ? updatedMessage : msg
          ));

          await window.electron.saveMessages(
            currentConversation.path,
            currentConversation.id,
            messages.map(msg => msg.id === message.id ? updatedMessage : msg)
          );
        }
      } else if (message.files) {
        // 处理图片文件重命名
        // 检查 editingFileName 是否包含下划线
        if (!editingFileName || !editingFileName.includes('_')) {
          throw new Error('无效的文件标识符格式');
        }

        const [msgId, fileIndex] = editingFileName.split('_');

        // 验证 fileIndex 的有效性
        if (fileIndex === undefined || isNaN(parseInt(fileIndex))) {
          throw new Error('无效的文件索引格式');
        }

        const index = parseInt(fileIndex);
        if (index < 0 || index >= message.files.length) {
          throw new Error('文件索引超出范围');
        }

        const file = message.files[index];
        if (!file) {
          throw new Error('找不到要重命名的文件');
        }

        const fileExt = file.name.split('.').pop();
        const newName = `${newFileName}.${fileExt}`;

        result = await window.electron.renameFile(
          currentConversation.path,
          file.name,
          newName
        );

        // 更新消息中的文件信息
        const updatedFiles = [...message.files];
        updatedFiles[index] = {
          ...file,
          name: result.name,
          path: result.path
        };

        const updatedMessage = {
          ...message,
          files: updatedFiles
        };

        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? updatedMessage : msg
        ));

        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          messages.map(msg => msg.id === message.id ? updatedMessage : msg)
        );
      }
    } catch (error) {
      console.error('重命名文件失败:', error);
      console.error('错误详情:', {
        message,
        editingFileName,
        newFileName,
        currentConversation
      });
      alert(`重命名失败: ${error.message}`);
    }
    
    setEditingFileName(null);
    setFileNameInput('');
  };

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

  // 添加处理从 AIChat 发送到侧边栏的函数
  const handleSendToSidebar = async (message) => {
    if (!currentConversation) {
      alert('请先在 Chat 界面创建或选择一个对话');
      return;
    }

    try {
      // 构建新消息对象
      const newMessage = {
        id: Date.now(),
        content: message.content,
        type: 'assistant',
        timestamp: new Date(),
        usage: message.usage || {}
      };

      // 更新消息列表
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);

      // 保存消息到存储
      await window.electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        updatedMessages
      );

      // 切换到 chat 界面
      setActiveTool('chat');
      
      // 滚动到新消息
      setShouldScrollToBottom(true);
    } catch (error) {
      console.error('发送消息到侧边栏失败:', error);
      alert('发送消息到侧边栏失败: ' + error.message);
    }
  };

  // 将 randomTheme 函数移到组件内部
  const randomTheme = () => {
    generateRandomTheme();
    setCurrentTheme('custom');  // 现在可以访问到 setCurrentTheme
  };

  // 会话管理相关函数
  const handleConversationSelect = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    try {
      const messages = await window.electron.loadMessages(conversation.path, conversation.id);
      setMessages(messages || []);
      setCurrentConversation(conversation);
      localStorage.setItem('aichat_current_conversation', JSON.stringify(conversation));
    } catch (error) {
      console.error('加载会话消息失败:', error);
      alert('加载会话消息失败: ' + error.message);
    }
  };

  const handleConversationCreate = async () => {
    if (!storagePath) {
      alert('请先在设置中选择存储文件夹');
      return;
    }

    try {
      const newId = Date.now().toString();
      const conversationCount = conversations.length;
      const newName = `AIChat${(conversationCount + 1).toString().padStart(2, '0')}`;
      const folderPath = window.electron.path.join(storagePath, newName);
      const result = await window.electron.createAIChatFolder(folderPath);
      
      const newConversation = {
        id: newId,
        name: newName,
        timestamp: new Date().toISOString(),
        path: result.path,
        messages: []
      };
      
      const updatedConversations = [...conversations, newConversation];
      setConversations(updatedConversations);
      setCurrentConversation(newConversation);
      setMessages([]);
      
      localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
      localStorage.setItem('aichat_current_conversation', JSON.stringify(newConversation));
    } catch (error) {
      console.error('创建新会话失败:', error);
      alert('创建新会话失败: ' + error.message);
    }
  };

  const handleConversationDelete = async (conversation) => {
    try {
      await window.electron.deleteChatFolder(conversation.path);
      
      const updatedConversations = conversations.filter(c => c.id !== conversation.id);
      setConversations(updatedConversations);
      
      if (currentConversation?.id === conversation.id) {
        const nextConversation = updatedConversations[0] || null;
        setCurrentConversation(nextConversation);
        setMessages(nextConversation ? await window.electron.loadMessages(nextConversation.path, nextConversation.id) : []);
      }
      
      localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
      if (!currentConversation || currentConversation.id === conversation.id) {
        localStorage.removeItem('aichat_current_conversation');
      }
    } catch (error) {
      console.error('删除会话失败:', error);
      alert('删除会话失败: ' + error.message);
    }
  };

  const handleConversationRename = async (conversation, newName) => {
    try {
      const result = await window.electron.renameChatFolder(conversation.path, newName);
      
      const updatedConversations = conversations.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, name: result.name, path: result.path }
          : conv
      );
      
      setConversations(updatedConversations);
      if (currentConversation?.id === conversation.id) {
        setCurrentConversation({ ...currentConversation, name: result.name, path: result.path });
      }
      
      localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
    } catch (error) {
      console.error('重命名失败:', error);
      alert('重命名失败: ' + error.message);
    }
  };

  // 添加本地存储同步
  useEffect(() => {
    localStorage.setItem('aichat_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (currentConversation) {
      localStorage.setItem('aichat_current_conversation', JSON.stringify(currentConversation));
    }
  }, [currentConversation]);

  return (
    <div className="h-screen flex flex-col">
      <style>{globalStyles}</style>
      <TitleBar 
        activeTool={activeTool}
        currentUrl={currentUrl}
        setCurrentUrl={setCurrentUrl}
        isLoading={isLoading}
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
      />
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
        <Sidebar 
          sidebarOpen={sidebarOpen}
          sidebarMode={sidebarMode}
          activeTool={activeTool}
          conversations={conversations}
          currentConversation={currentConversation}
          draggedConversation={draggedConversation}
          setDraggedConversation={setDraggedConversation}
          editingFolderName={editingFolderName}
          folderNameInput={folderNameInput}
          setEditingFolderName={setEditingFolderName}
          setFolderNameInput={setFolderNameInput}
          setContextMenu={setContextMenu}
          loadConversation={handleConversationSelect}
          createNewConversation={handleConversationCreate}
          switchTool={switchTool}
          handleSidebarModeToggle={handleSidebarModeToggle}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleContextMenu={handleContextMenu}
          handleConversationDelete={handleConversationDelete}
          handleConversationRename={handleConversationRename}
          messages={messages}
          editingMessage={editingMessage}
          setEditingMessage={setEditingMessage}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          sendMessage={sendMessage}
          confirmDeleteMessage={confirmDeleteMessage}
          updateMessageInApp={updateMessageInApp}
          moveMessageInApp={moveMessageInApp}
          enterEditMode={enterEditMode}
          exitEditMode={exitEditMode}
          collapsedMessages={collapsedMessages}
          setCollapsedMessages={setCollapsedMessages}
          handleImageClick={handleImageClick}
          fileInputRef={fileInputRef}
          browserTabs={browserTabs}
          activeTabId={activeTabId}
          previousMode={previousMode}
          window={window}
          setShowSettings={setShowSettings}
          setSidebarMode={setSidebarMode}
          setPreviousMode={setPreviousMode}
          editingFileName={editingFileName}
          setEditingFileName={setEditingFileName}
          fileNameInput={fileNameInput}
          setFileNameInput={setFileNameInput}
          renameMessageFile={renameMessageFile}
          openFileLocation={openFileLocation}
          copyMessageContent={copyMessageContent}
          deletingMessageId={deletingMessageId}
          setDeletingMessageId={setDeletingMessageId}
          cancelDeleteMessage={cancelDeleteMessage}
          scrollToMessage={scrollToMessage}
          sendToMonaco={sendToMonaco}
          sendToEditor={sendToEditor}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat content */}
          <div 
            style={{ 
              display: activeTool === 'chat' ? 'flex' : 'none',
              height: 'calc(100vh - 40px)'
            }} 
            className="flex-1 flex flex-col overflow-hidden">
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
              handleImageClick={handleImageClick}
              fileInputRef={fileInputRef}
              editingFileName={editingFileName}
              setEditingFileName={setEditingFileName}
              fileNameInput={fileNameInput}
              setFileNameInput={setFileNameInput}
              renameMessageFile={renameMessageFile}
              openFileLocation={openFileLocation}
              copyMessageContent={copyMessageContent}
              deletingMessageId={deletingMessageId}
              setDeletingMessageId={setDeletingMessageId}
              cancelDeleteMessage={cancelDeleteMessage}
              confirmDeleteMessage={confirmDeleteMessage}
              scrollToMessage={scrollToMessage}
              window={window}
              sendToMonaco={sendToMonaco}
              sendToEditor={sendToEditor}
              shouldScrollToBottom={shouldScrollToBottom}
            />
          </div>

          {/* Editor content */}
          <div style={{ display: activeTool === 'editor' ? 'flex' : 'none' }} className="flex-1 flex flex-col">
            <Editor
              editorState={editorState}
              setEditorState={setEditorState}
              canvasSize={canvasSize}
              setCanvasSize={setCanvasSize}
              tempCanvasSize={tempCanvasSize}
              setTempCanvasSize={setTempCanvasSize}
              imageSize={imageSize}
              setImageSize={setImageSize}
              isCtrlPressed={isCtrlPressed}
              setIsCtrlPressed={setIsCtrlPressed}
              canvasRef={canvasRef}
              canvasSizeTimeoutRef={canvasSizeTimeoutRef}
              currentConversation={currentConversation}
              messages={messages}
              setMessages={setMessages}
              setActiveTool={setActiveTool}
              window={window}
              startAngle={startAngle}
              setStartAngle={setStartAngle}
              lastRotation={lastRotation}
              setLastRotation={setLastRotation}
              isRotating={isRotating}
              setIsRotating={setIsRotating}
            />
          </div>

          {/* Browser content */}
          <div style={{ display: activeTool === 'browser' ? 'flex' : 'none' }} className="flex-1 flex flex-col relative">
            <div className="flex-1 bg-base-100 overflow-auto">
              {/* Browser view managed by main process */}
            </div>
          </div>

          {/* Monaco Editor content */}
          <div style={{ display: activeTool === 'monaco' ? 'flex' : 'none' }} className="flex-1 overflow-hidden">
            <MonacoEditor />
          </div>

          {/* AI Chat content */}
          <div style={{ display: activeTool === 'aichat' ? 'flex' : 'none' }} className="flex-1 overflow-hidden">
            <AIChat 
              sendToSidebar={handleSendToSidebar}
              createNewConversation={handleConversationCreate}
              storagePath={storagePath}
              currentConversation={currentConversation}
              conversations={conversations}
              onConversationSelect={handleConversationSelect}
              onConversationDelete={handleConversationDelete}
              onConversationRename={handleConversationRename}
            />
          </div>
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