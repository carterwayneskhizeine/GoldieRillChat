import React, { useState, useEffect, useRef, useCallback } from 'react'
import TitleBar from './components/TitleBar'
import ThreeBackground from './components/ThreeBackground'
import Embedding from './components/Embedding'
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
import { handleUpdateFolders, mergeConversations } from './components/folderUpdateHandlers'
import { toggleTheme, themes, initializeTheme, useThemeEffect } from './components/themeHandlers'
import { ImageLightbox } from './components/ImageLightbox'
import { getAllMessageMedia, findMediaIndex, getAllMessageImages, findImageIndex } from './components/imagePreviewUtils'
import './styles/lightbox.css'
import { ChatView } from './components/ChatView'
import './styles/chatview.css'
import './styles/panel-titles.css'
import './styles/global-overrides.css'
import './styles/chat-titles.css'
import './styles/embedding.css'
import './styles/monaco-editor.css'
import './styles/sidebar-buttons.css'
import { tools, getToolDisplayName, createToolSwitcher } from './config/toolsConfig'
import { initializeBrowserState, useBrowserEvents, useSidebarEffect } from './components/browserHandlers'
import { useKeyboardEvents } from './components/keyboardHandlers'
import { globalStyles } from './styles/globalStyles'
import {
  initializeChatState,
  initializeUIState,
  initializeStoragePath,
  initializeSidebarState,
  initializeEditorState,
  initializeNotesState,
  initializeShaderPresetsState
} from './components/stateInitializers'
import Sidebar from './components/Sidebar'
import { AIChat } from './components/AIChat'
import './styles/aichat.css'
import { 
  handleDeleteConversation, 
  handleRenameConversation,
  handleContextMenu
} from './components/conversationHandlers'
import { MonacoEditor } from './components/MonacoEditor'
import ToastContainer from './components/ToastContainer'
import toastManager from './utils/toastManager'
import BookmarksPanel from './components/BookmarksPanel'
import ThreeJSShaders from './components/ThreeJSShaders'
import { openUrl, switchToBrowserEvent } from './utils/browserUtils'
import './styles/settings-modal.css'
import './styles/audio-player.css'

// 模拟引入书签Store
const useBookmarkStore = {
  getState: () => ({
    showBookmarksPanel: false,
    toggleBookmarksPanel: () => {},
    addBookmark: (bookmark) => {
      console.log('添加书签:', bookmark);
    }
  })
};

export default function App() {
  // 修改初始工具为 aichat
  const [activeTool, setActiveTool] = useState('aichat')
  
  // 侧边栏状态
  const initialSidebarState = initializeSidebarState()
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarState.sidebarOpen)
  const [sidebarMode, setSidebarMode] = useState(initialSidebarState.sidebarMode)
  const [previousMode, setPreviousMode] = useState(initialSidebarState.previousMode)

  // 添加键盘导航状态
  const [keyboardSelectedConversationId, setKeyboardSelectedConversationId] = useState(null)
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false)

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

  // 笔记相关状态
  const initialNotesState = initializeNotesState()
  const [notes, setNotes] = useState(initialNotesState.notes)
  const [currentNote, setCurrentNote] = useState(initialNotesState.currentNote)
  const [lastSavedTime, setLastSavedTime] = useState(initialNotesState.lastSavedTime)

  // 着色器预设相关状态
  const initialShaderPresetsState = initializeShaderPresetsState()
  const [shaderPresets, setShaderPresets] = useState(initialShaderPresetsState.presets)
  const [currentShaderPreset, setCurrentShaderPreset] = useState(initialShaderPresetsState.currentPresetId)

  // 浏览器状态
  const initialBrowserState = initializeBrowserState()
  const [browserTabs, setBrowserTabs] = useState(initialBrowserState.browserTabs)
  const [activeTabId, setActiveTabId] = useState(initialBrowserState.activeTabId)
  const [currentUrl, setCurrentUrl] = useState(initialBrowserState.currentUrl)
  const [isLoading, setIsLoading] = useState(initialBrowserState.isLoading)
  const [pageTitle, setPageTitle] = useState(initialBrowserState.pageTitle)

  // 使用初始化函数替换原有的主题状态声明
  const [currentTheme, setCurrentTheme] = useState(initializeTheme())
  
  // 使用主题效果
  useThemeEffect(currentTheme)
  
  // Refs
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const canvasSizeTimeoutRef = useRef(null)
  
  // 在其他状态变量声明后添加 editorState
  const initialEditorState = initializeEditorState()
  const [editorState, setEditorState] = useState(initialEditorState)
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [collapsedMessages, setCollapsedMessages] = useState(new Set())
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isRotating, setIsRotating] = useState(false)

  // 书签状态
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  // 在useEffect中添加电子书签store的连接
  useEffect(() => {
    // 这里是实际项目中书签状态的集成代码
    // 在生产环境中，这里应该从window.electron?.bookmarks获取书签状态
    const unsubscribe = window.electron?.bookmarks?.onBookmarksPanelToggle((isVisible) => {
      setShowBookmarksPanel(isVisible);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 用于监听TitleBar中的书签操作
  useEffect(() => {
    // 当书签面板打开时隐藏浏览器视图，关闭时显示浏览器视图（如果当前工具是浏览器）
    if (window.electron?.browser) {
      if (showBookmarksPanel) {
        // 书签面板打开，隐藏浏览器视图
        window.electron.browser.setVisibility(false);
      } else if (activeTool === 'browser') {
        // 书签面板关闭且当前工具是浏览器，显示浏览器视图
        window.electron.browser.setVisibility(true);
      }
    }
  }, [showBookmarksPanel, activeTool]);

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
    if (!message.files?.some(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
      return;
    }

    // 获取第一个图片文件
    const imageFile = message.files.find(file => 
      file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );

    if (imageFile) {
      // 触发自定义事件，让 ChatView 组件处理图片编辑
      window.dispatchEvent(new CustomEvent('editImage', {
        detail: {
          message,
          file: imageFile
        }
      }));
    }
  };

  // Load conversations on mount
  useEffect(() => {
    const initializeConversations = async () => {
      try {
        const savedConversations = await loadConversations()
        setConversations(savedConversations)
        
        // 如果有存储路径，自动扫描文件夹以更新对话列表
        if (storagePath) {
          console.log('自动扫描对话文件夹:', storagePath)
          try {
            const folders = await window.electron.scanFolders(storagePath)
            if (folders && folders.length > 0) {
              // 使用mergeConversationsWithPath函数并传入当前存储路径
              const mergedConversations = await handleUpdateFolders(storagePath, setConversations, window, false)
              console.log('自动更新文件夹成功:', mergedConversations.length)
            }
          } catch (scanError) {
            console.error('自动扫描文件夹失败:', scanError)
            // 扫描失败不中断应用程序启动
          }
        }
      } catch (error) {
        console.error('初始化对话失败:', error)
        alert(error.message)
      }
    }
    initializeConversations()
  }, [storagePath])

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
      toastManager.error('请先在设置中选择存储文件夹');
      return;
    }

    try {
      // 生成新会话ID和名称
      const newId = Date.now().toString();
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = now.toLocaleString('en-US', { month: 'short' });
      const day = now.getDate().toString().padStart(2, '0');
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const newName = `${day}${month}${year}_${hours}${minutes}${seconds}`;

      // 在选定的存储路径下创建新的会话文件夹
      const folderPath = window.electron.path.join(storagePath, newName);
      
      // 创建文件夹
      await window.electron.mkdir(folderPath);
      
      // 创建 timemessages.json 文件记录创建时间
      let modifiedTime = Date.now();
      try {
        // 尝试使用 createTimeMessagesFile 函数
        if (typeof window.electron.createTimeMessagesFile === 'function') {
          const currentTime = await window.electron.createTimeMessagesFile(folderPath);
          modifiedTime = new Date(currentTime).getTime();
        } else {
          // 回退方案：手动创建 timemessages.json 文件
          console.warn('createTimeMessagesFile 函数不可用，使用手动创建方式');
          const timeMessagesPath = window.electron.path.join(folderPath, 'timemessages.json');
          const currentTime = new Date().toISOString();
          const timeData = [{
            folderMtime: currentTime
          }];
          await window.electron.writeFile(timeMessagesPath, JSON.stringify(timeData, null, 2), 'utf8');
          modifiedTime = new Date(currentTime).getTime();
        }
      } catch (error) {
        console.warn('创建 timemessages.json 失败，使用当前时间:', error);
        modifiedTime = Date.now();
      }
      
      // 构造新会话对象
      const newConversation = {
        id: newId,
        name: newName,
        timestamp: new Date().toISOString(),
        path: folderPath,
        modifiedTime: modifiedTime
      };
      
      // 更新状态
      const updatedConversations = [...conversations];
      // 将新对话插入到列表开头
      updatedConversations.unshift(newConversation);
      
      setConversations(updatedConversations);
      setCurrentConversation(newConversation);
      setMessages([]);
      
      // 保存到本地存储
      localStorage.setItem('aichat_conversations', JSON.stringify(
        updatedConversations.map(conv => ({
          id: conv.id,
          name: conv.name,
          path: conv.path,
          timestamp: conv.timestamp,
          modifiedTime: conv.modifiedTime
        }))
      ));
      localStorage.setItem('aichat_current_conversation', JSON.stringify(newConversation));
      
      toastManager.success('创建新会话成功');
    } catch (error) {
      console.error('创建新会话失败:', error);
      toastManager.error('创建新会话失败: ' + error.message);
    }
  };

  const handleConversationSelect = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    try {
      if (!conversation.path) {
        throw new Error('会话路径无效');
      }
      
      // 先检查文件夹是否存在
      try {
        await window.electron.access(conversation.path);
      } catch (accessError) {
        // 文件夹不存在，从列表中移除
        console.warn(`文件夹不存在，从列表中移除: ${conversation.path}`);
        const updatedConversations = conversations.filter(c => c.id !== conversation.id);
        setConversations(updatedConversations);
        localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
        
        // 如果当前对话是被删除的对话，清空当前对话
        if (currentConversation && currentConversation.id === conversation.id) {
          setCurrentConversation(null);
          setMessages([]);
          localStorage.setItem('aichat_current_conversation', '');
        }
        
        toastManager.warning(`会话文件夹不存在: ${conversation.path}\n该会话已从列表中移除`);
        return;
      }
      
      const messages = await window.electron.loadMessages(conversation.path, conversation.id);
      setMessages(messages || []);
      setCurrentConversation(conversation);
      localStorage.setItem('aichat_current_conversation', JSON.stringify({
        id: conversation.id,
        name: conversation.name,
        path: conversation.path,
        timestamp: conversation.timestamp
      }));
    } catch (error) {
      console.error('加载会话消息失败:', error);
      toastManager.error('加载会话消息失败: ' + error.message);
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
        textarea.style.height = '100px'
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

        // 更新消息内容，替换旧的文件名为新的文件名
        let updatedContent = message.content;
        if (updatedContent.includes(file.name)) {
          updatedContent = updatedContent.replace(file.name, result.name);
        } else if (updatedContent.includes('图片文件:') || updatedContent.includes('视频文件:')) {
          updatedContent = updatedContent.replace(/: .+$/, `: ${result.name}`);
        }

        const updatedMessage = {
          ...message,
          content: updatedContent,
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

  // 在切换工具时处理状态初始化
  useEffect(() => {
    // 工具切换时重置键盘导航状态
    setIsKeyboardNavigating(false);
    setKeyboardSelectedConversationId(null);

    // 其它工具状态初始化代码...
    if (activeTool === 'chat') {
      // 进入chat工具时，如果有之前保存的对话，加载它
      if (currentConversation) {
        handleConversationSelect(currentConversation.id);
      } else if (conversations.length > 0) {
        setTimeout(() => {
          handleConversationSelect(conversations[0].id);
        }, 200);
      }
    } else if (activeTool === 'aichat') {
      // 切换到 AI Chat 界面时清空选中的会话和消息
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [activeTool]);

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

  // 处理右键菜单
  useEffect(() => {
    const handleShowContextMenu = (e) => {
      const { x, y, type, data } = e.detail;
      setContextMenu({
        visible: true,
        x,
        y,
        type,
        data
      });
    };

    window.addEventListener('showContextMenu', handleShowContextMenu);
    return () => {
      window.removeEventListener('showContextMenu', handleShowContextMenu);
    };
  }, []);

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
  const switchTool = (direction) => {
    // 使用工具切换器
    setActiveTool(currentTool => {
      const currentIndex = tools.indexOf(currentTool);
      if (direction === 'next') {
        return tools[(currentIndex + 1) % tools.length];
      } else if (direction === 'prev') {
        return tools[(currentIndex - 1 + tools.length) % tools.length];
      } else {
        // 如果direction是一个具体的工具名，直接切换到该工具
        return direction;
      }
    });
  };

  // 添加处理创建对话的函数
  const handleConversationCreate = async (conversation) => {
    try {
      if (!conversation) return;

      // 确保对话有唯一ID
      if (!conversation.id) {
        conversation.id = nanoid();
      }

      // 确保对话有名称
      if (!conversation.name) {
        // 如果没有名称，使用默认名称格式
        conversation.name = `对话 ${new Date().toLocaleString('zh-CN', {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        })}`;
      }

      // 确保对话有路径
      if (!conversation.path) {
        // 如果没有路径，在当前配置的存储路径下创建一个文件夹
        const basePath = storagePath || window.electron.getDefaultStoragePath();
        conversation.path = path.join(basePath, 'conversations', `${conversation.id}`);
        
        // 创建对话文件夹
        await window.electron.createFolder(conversation.path);
      }

      // 将新对话添加到列表中
      setConversations(prev => {
        // 检查是否已经存在同ID的对话
        const exists = prev.some(c => c.id === conversation.id);
        if (exists) return prev;
        return [...prev, conversation];
      });

      return conversation;
    } catch (error) {
      console.error('创建对话失败:', error);
      throw error;
    }
  };

  // 现在添加工具切换事件监听
  useEffect(() => {
    const handleSwitchTool = (event) => {
      const { tool, conversation } = event.detail;
      
      console.log('切换工具:', {
        从: activeTool,
        到: tool,
        当前对话: currentConversation ? currentConversation.name : '无',
        当前对话ID: currentConversation ? currentConversation.id : '无'
      });
      
      // 切换工具
      setActiveTool(tool);
      
      // 如果切换到AIChat
      if (tool === 'aichat') {
        // 确保有当前对话
        if (currentConversation) {
          // 使用setTimeout确保工具切换完成后再选择对话
          setTimeout(() => {
            handleConversationSelect(currentConversation.id);
          }, 100);
        }
      }
      // 如果提供了新的对话，创建并选择它
      else if (conversation) {
        handleConversationCreate(conversation)
          .then(() => {
            handleConversationSelect(conversation.id);
          })
          .catch(error => {
            console.error('切换对话失败:', error);
            alert('切换对话失败: ' + error.message);
          });
      }
    };

    window.addEventListener('switchTool', handleSwitchTool);
    return () => window.removeEventListener('switchTool', handleSwitchTool);
  }, [activeTool, currentConversation, handleConversationSelect]);

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
    
    // 使用新的媒体处理函数
    const allMedia = getAllMessageMedia(messages)
    const currentMedia = { src: `local-file://${file.path}` }
    const mediaIndex = findMediaIndex(messages, currentMedia)
    
    setLightboxImages(allMedia)
    setLightboxIndex(mediaIndex)
    setLightboxOpen(true)
  }

  // 添加处理侧边栏模式切换的函数
  const handleSidebarModeToggle = () => {
    if (sidebarMode === 'default') {
      setPreviousMode('default')
      setSidebarMode('chat')
      
      // 如果没有选中的对话，选择第一个
      if (!currentConversation && conversations.length > 0) {
        handleConversationSelect(conversations[0].id)
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

  // 会话管理相关函数
  const handleConversationDelete = async (conversation) => {
    try {
      await deleteConversation(
        conversation.id,
        conversations,
        currentConversation,
        setConversations,
        setCurrentConversation,
        setMessages,
        window
      );
    } catch (error) {
      console.error('删除会话失败:', error);
      alert('删除会话失败: ' + error.message);
    }
  };

  const handleConversationRename = async (conversation) => {
    try {
      // 确保 conversation.path 存在
      if (!conversation || !conversation.path) {
        throw new Error('无效的会话路径');
      }

      // 设置重命名状态
      setEditingFolderName(conversation.id);
      setFolderNameInput(conversation.name);
    } catch (error) {
      console.error('重命名失败:', error);
      alert('重命名失败: ' + error.message);
    }
  };

  // 添加实际执行重命名的函数
  const handleRenameConfirm = async (conversation, newName) => {
    try {
      // 保存旧路径，用于更新消息路径
      const oldPath = conversation.path;
      
      // 重命名文件夹
      const result = await window.electron.renameChatFolder(conversation.path, newName);
      
      // 更新状态
      const updatedConversations = conversations.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, name: newName, path: result.path }
          : conv
      );
      
      setConversations(updatedConversations);
      if (currentConversation?.id === conversation.id) {
        setCurrentConversation({ ...currentConversation, name: newName, path: result.path });
      }
      
      // 更新本地存储
      localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));

      // 更新消息中的路径信息
      try {
        console.log('更新消息路径:', oldPath, '->', result.path);
        await window.electron.updateMessagesPath(oldPath, result.path);
      } catch (pathError) {
        console.error('更新消息路径失败:', pathError);
        // 不中断重命名流程，仅记录错误
      }

      // 清除编辑状态
      setEditingFolderName(null);
      setFolderNameInput('');
    } catch (error) {
      console.error('重命名失败:', error);
      alert('重命名失败: ' + error.message);
    }
  };

  // 添加本地存储同步
  useEffect(() => {
    const conversationsToSave = conversations.map(conv => ({
      id: conv.id,
      name: conv.name,
      path: conv.path,
      timestamp: conv.timestamp
    }));
    localStorage.setItem('aichat_conversations', JSON.stringify(conversationsToSave));
  }, [conversations]);

  useEffect(() => {
    if (currentConversation) {
      const convToSave = {
        id: currentConversation.id,
        name: currentConversation.name,
        path: currentConversation.path,
        timestamp: currentConversation.timestamp
      };
      localStorage.setItem('aichat_current_conversation', JSON.stringify(convToSave));
    }
  }, [currentConversation]);

  // 在 App 组件中添加新的方法
  const openInBrowserTab = (url) => {
    // 使用通用的URL打开函数，它会自动处理切换到浏览器工具
    openUrl(url, true); // 第二个参数true确保使用内部浏览器
  };

  // 添加处理导入书签的函数
  const handleImportBookmarks = () => {
    // 让用户选择要导入的HTML书签文件
    window.electron.selectBookmarkFile().then(async (filePath) => {
      if (!filePath) return; // 用户取消了选择
      
      try {
        // 读取文件内容
        const fileContent = await window.electron.readFile(filePath);
        
        // 通过书签API解析并导入书签
        const result = await window.electron.bookmarks.parseAndImportBookmarks(fileContent);
        
        if (result && result.success) {
          // 显示成功消息
          toastManager.success(`已导入 ${result.count} 个书签`, 3000);
          
          // 自动显示书签面板
          setShowBookmarksPanel(true);
          window.electron.bookmarks.toggleBookmarksPanel(true);
        } else {
          throw new Error('导入失败');
        }
      } catch (error) {
        console.error('导入书签失败:', error);
        toastManager.error(error.message || '文件格式不正确', 5000);
      }
    }).catch(error => {
      console.error('选择书签文件失败:', error);
      toastManager.error(error.message || '选择文件失败', 3000);
    });
  };

  // 添加书签处理函数
  const handleAddBookmark = () => {
    const activeTab = browserTabs.find(tab => tab.id === activeTabId);
    if (activeTab) {
      // 获取根文件夹ID（如果有的话）
      window.electron?.bookmarks?.getFolders().then(folders => {
        // 查找根文件夹（没有parentId的文件夹）
        let rootFolder = folders.find(f => !f.parentId);
        
        // 如果没有根文件夹，创建一个
        if (!rootFolder) {
          const defaultFolderId = `folder_root_${Date.now()}`;
          rootFolder = {
            id: defaultFolderId,
            name: '我的书签',
            addDate: Date.now(),
            parentId: null
          };
          
          // 添加到文件夹列表
          folders.push(rootFolder);
          
          // 保存新文件夹
          window.electron?.bookmarks?.importBookmarks([], [rootFolder])
            .catch(error => {
              console.error('创建默认文件夹失败:', error);
            });
        }
        
        const rootFolderId = rootFolder ? rootFolder.id : null;
        
        const bookmark = {
          id: Math.random().toString(36).substring(2, 9),
          title: activeTab.title || currentUrl,
          url: activeTab.url || currentUrl,
          icon: activeTab.favicon || null,
          addDate: Date.now(),
          folder: rootFolderId // 将书签添加到根文件夹
        };
        
        // 调用实际的书签添加功能
        window.electron?.bookmarks?.addBookmark(bookmark).then(() => {
          // 显示成功通知
          toastManager.success(`已添加书签: ${bookmark.title}`, 3000);
          
          // 自动打开书签面板以便用户查看新添加的书签
          if (!showBookmarksPanel) {
            setShowBookmarksPanel(true);
            window.electron?.bookmarks?.toggleBookmarksPanel(true);
          }
        }).catch(error => {
          console.error('添加书签失败:', error);
          toastManager.error('添加书签失败', 3000);
        });
      }).catch(error => {
        console.error('获取书签文件夹失败:', error);
        toastManager.error('获取书签文件夹失败', 3000);
      });
    }
  };

  // 处理书签面板切换
  const handleToggleBookmarksPanel = () => {
    const newState = !showBookmarksPanel;
    setShowBookmarksPanel(newState);
    
    // 同步到electron主进程
    window.electron?.bookmarks?.toggleBookmarksPanel(newState);
  };

  // 初始化笔记文件夹和文件
  useEffect(() => {
    const initializeNotes = async () => {
      try {
        // 确保Notes文件夹存在
        await window.electron.ensureDirectory(storagePath, 'Notes');
        
        // 确保所有笔记文件都存在
        const updatedNotes = [...notes];
        
        for (const note of updatedNotes) {
          // 检查文件是否存在，不存在则创建
          const exists = await window.electron.fileExists(`${storagePath}/${note.filePath}`);
          
          if (!exists) {
            // 创建空笔记文件
            await window.electron.writeTextFile(`${storagePath}/${note.filePath}`, '');
          } else {
            // 读取笔记内容
            const content = await window.electron.readTextFile(`${storagePath}/${note.filePath}`);
            note.content = content;
          }
        }
        
        setNotes(updatedNotes);
        
        // 如果Monaco是活动工具并且没有选中的笔记，则默认选择第一个笔记
        if (activeTool === 'monaco' && !currentNote && updatedNotes.length > 0) {
          setCurrentNote(updatedNotes[0]);
        }
      } catch (error) {
        console.error('初始化笔记失败:', error);
        window.toastManager?.error('初始化笔记失败: ' + error.message);
      }
    };
    
    if (storagePath) {
      initializeNotes();
    }
  }, [storagePath, activeTool]);

  // 加载笔记
  const loadNote = async (noteId) => {
    try {
      if (!storagePath) {
        throw new Error('存储路径未设置，请先设置存储路径');
      }
      
      // 如果当前有正在编辑的笔记，先保存
      if (currentNote) {
        await saveNote(currentNote.id);
      }
      
      const noteToLoad = notes.find(note => note.id === noteId);
      if (!noteToLoad) {
        throw new Error(`找不到ID为${noteId}的笔记`);
      }
      
      // 读取笔记文件内容
      const content = await window.electron.readTextFile(`${storagePath}/${noteToLoad.filePath}`);
      
      // 更新笔记内容
      const updatedNotes = notes.map(note => 
        note.id === noteId ? { ...note, content } : note
      );
      
      setNotes(updatedNotes);
      setCurrentNote({ ...noteToLoad, content });
      
      // 如果Monaco编辑器已加载，设置其内容
      if (window.monacoEditor) {
        window.monacoEditor.setValue(content);
      } else {
        // 否则设置为待处理的内容
        window.pendingMonacoContent = content;
      }
      
      return content;
    } catch (error) {
      console.error('加载笔记失败:', error);
      window.toastManager?.error('加载笔记失败: ' + error.message);
      throw error;
    }
  };
  
  // 保存笔记
  const saveNote = async (noteId, manualContent = null) => {
    try {
      if (!storagePath) {
        throw new Error('存储路径未设置，请先设置存储路径');
      }
      
      const noteToSave = notes.find(note => note.id === noteId);
      if (!noteToSave) {
        throw new Error(`找不到ID为${noteId}的笔记`);
      }
      
      // 获取内容，优先使用传入的内容，否则使用编辑器内容
      let content = manualContent;
      if (content === null && window.monacoEditor) {
        content = window.monacoEditor.getValue();
      }
      
      if (content === null) {
        content = noteToSave.content || '';
      }
      
      // 保存内容到文件
      await window.electron.writeTextFile(`${storagePath}/${noteToSave.filePath}`, content);
      
      // 更新笔记状态
      const updatedNotes = notes.map(note => 
        note.id === noteId ? { ...note, content } : note
      );
      
      setNotes(updatedNotes);
      // 如果是当前笔记，更新当前笔记状态
      if (currentNote && currentNote.id === noteId) {
        setCurrentNote({ ...noteToSave, content });
      }
      
      // 更新最后保存时间
      setLastSavedTime(new Date().toLocaleTimeString());
      
      window.toastManager?.success('笔记已保存');
      return true;
    } catch (error) {
      console.error('保存笔记失败:', error);
      window.toastManager?.error('保存笔记失败: ' + error.message);
      throw error;
    }
  };

  // 添加AIChat模型状态
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('aichat_model') || 'deepseek-chat';
  });
  
  const [availableModels, setAvailableModels] = useState(() => {
    const savedModels = localStorage.getItem('aichat_available_models');
    return savedModels ? JSON.parse(savedModels) : ['deepseek-chat', 'deepseek-reasoner'];
  });
  
  const [maxTokens, setMaxTokens] = useState(() => {
    return parseInt(localStorage.getItem('aichat_max_tokens')) || 2000;
  });
  
  const [temperature, setTemperature] = useState(() => {
    return parseFloat(localStorage.getItem('aichat_temperature')) || 0.7;
  });
  
  const [selectedProvider, setSelectedProvider] = useState(() => {
    return localStorage.getItem('aichat_provider') || 'deepseek';
  });

  // 监听切换到浏览器工具的事件
  useEffect(() => {
    const handleSwitchToBrowser = () => {
      setActiveTool('browser');
    };
    
    window.addEventListener('switchToBrowser', handleSwitchToBrowser);
    
    return () => {
      window.removeEventListener('switchToBrowser', handleSwitchToBrowser);
    };
  }, []);

  // 添加监听activeTool变化的useEffect，确保在切换到AI Chat时保持当前对话的选择
  useEffect(() => {
    // 如果当前工具是AI Chat并且有当前对话
    if (activeTool === 'aichat' && currentConversation) {
      // 使用setTimeout确保状态更新后再选择对话
      setTimeout(() => {
        handleConversationSelect(currentConversation.id);
      }, 200);
    }
  }, [activeTool]); // 只在activeTool变化时触发

  // 监听退出键盘导航事件
  useEffect(() => {
    const handleExitKeyboardNav = (e) => {
      setIsKeyboardNavigating(false);
      setKeyboardSelectedConversationId(null);
    };
    
    window.addEventListener('exit-keyboard-nav', handleExitKeyboardNav);
    
    return () => {
      window.removeEventListener('exit-keyboard-nav', handleExitKeyboardNav);
    };
  }, []);

  // 添加侧边栏快捷键控制和工具页面快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 如果当前正在编辑消息，或者当前有输入框被选中，不处理快捷键
      if (editingMessage || document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
           
      // 切换侧边栏显示/隐藏
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault(); // 阻止默认行为
        
        // 切换侧边栏状态
        setSidebarOpen(!sidebarOpen);
        return;
      }
      
      // 添加工具页面快捷键切换功能 (Ctrl + 1-6)
      if (e.ctrlKey && /^[1-6]$/.test(e.key)) {
        const index = parseInt(e.key) - 1;
        if (index >= 0 && index < tools.length) {
          // 直接切换到对应的工具页面
          const targetTool = tools[index];
          setActiveTool(targetTool);
        }
        return;
      }

      // 添加Ctrl+左右方向键切换工具功能
      if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const direction = e.key === 'ArrowLeft' ? 'prev' : 'next';
        switchTool(direction);
        return;
      }

      // 添加Ctrl+上下方向键导航对话文件夹功能 (仅在AI Chat和Chat面板有效)
      if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && 
          (activeTool === 'aichat' || activeTool === 'chat') && 
          conversations.length > 0) {
        
        e.preventDefault(); // 防止页面滚动
        
        // 设置键盘导航模式
        setIsKeyboardNavigating(true);
        
        // 确定当前选中的对话索引
        let currentIndex = -1;
        if (keyboardSelectedConversationId) {
          currentIndex = conversations.findIndex(c => c.id === keyboardSelectedConversationId);
        } else if (currentConversation) {
          currentIndex = conversations.findIndex(c => c.id === currentConversation.id);
        }
        
        // 计算新的索引
        let newIndex;
        if (e.key === 'ArrowUp') {
          // 向上导航 (如果已经是第一个则循环到最后一个)
          newIndex = currentIndex <= 0 ? conversations.length - 1 : currentIndex - 1;
        } else {
          // 向下导航 (如果已经是最后一个则循环到第一个)
          newIndex = currentIndex >= conversations.length - 1 ? 0 : currentIndex + 1;
        }
        
        // 更新键盘选中的对话ID
        setKeyboardSelectedConversationId(conversations[newIndex].id);
        
        // 确保选中的对话在视野内
        setTimeout(() => {
          const selectedElement = document.querySelector(`.conversation-item-${conversations[newIndex].id}`);
          if (selectedElement) {
            selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
        return;
      }
      
      // 处理Enter键确认选择对话
      if (e.key === 'Enter' && isKeyboardNavigating && keyboardSelectedConversationId) {
        const selectedConversation = conversations.find(c => c.id === keyboardSelectedConversationId);
        if (selectedConversation) {
          // 加载选中的对话
          handleConversationSelect(keyboardSelectedConversationId);
          
          // 退出键盘导航模式
          setIsKeyboardNavigating(false);
        }
        return;
      }
      
      // 按ESC键取消键盘导航
      if (e.key === 'Escape' && isKeyboardNavigating) {
        setIsKeyboardNavigating(false);
        setKeyboardSelectedConversationId(null);
        return;
      }
    };

    // 添加全局键盘事件监听器
    window.addEventListener('keydown', handleKeyDown);

    // 清理函数，组件卸载时移除事件监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen, setActiveTool, switchTool, activeTool, conversations, currentConversation, keyboardSelectedConversationId, isKeyboardNavigating, handleConversationSelect]); // 更新依赖数组

  // 添加activeTool变更时的处理，将当前工具记录到localStorage
  useEffect(() => {
    // 将当前活动工具保存到localStorage，供其他组件判断当前界面使用
    localStorage.setItem('active_tool', activeTool);
    
    // 触发自定义事件通知其他组件工具已切换
    const event = new CustomEvent('tool-changed', { 
      detail: { tool: activeTool } 
    });
    window.dispatchEvent(event);
  }, [activeTool]);

  // 添加监听Chat界面设置事件的处理
  useEffect(() => {
    const handleOpenChatSettings = () => {
      // 直接打开设置弹窗
      setShowSettings(true);
      console.log('打开Chat设置事件被触发');
    };
    
    window.addEventListener('open-chat-settings', handleOpenChatSettings);
    
    return () => {
      window.removeEventListener('open-chat-settings', handleOpenChatSettings);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-base-100">
      <ThreeBackground />
      <style>{globalStyles}</style>
      <TitleBar 
        activeTool={activeTool}
        currentUrl={currentUrl}
        setCurrentUrl={setCurrentUrl}
        isLoading={isLoading}
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
        onAddBookmark={handleAddBookmark}
        onToggleBookmarksPanel={handleToggleBookmarksPanel}
        showBookmarksPanel={showBookmarksPanel}
        onImportBookmarks={handleImportBookmarks}
        activeTabId={activeTabId}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        availableModels={availableModels}
        currentConversation={currentConversation}
        maxTokens={maxTokens}
        setMaxTokens={setMaxTokens}
        temperature={temperature}
        setTemperature={setTemperature}
        systemPromptEnabled={false}
        setShowSettings={setShowSettings}
        selectedProvider={selectedProvider}
        onAction={(action, ...args) => {
          if (action === 'switchTool') {
            switchTool(args[0]);
          }
        }}
        sidebarOpen={sidebarOpen}
      />
      <ToastContainer />
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
          createNewConversation={createNewConversation}
          switchTool={switchTool}
          handleSidebarModeToggle={handleSidebarModeToggle}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleConversationDelete={handleConversationDelete}
          handleConversationRename={handleConversationRename}
          renameChatFolder={renameChatFolder}
          setConversations={setConversations}
          setCurrentConversation={setCurrentConversation}
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
          shouldScrollToBottom={shouldScrollToBottom}
          setShouldScrollToBottom={setShouldScrollToBottom}
          notes={notes}
          currentNote={currentNote}
          loadNote={loadNote}
          handleRenameConfirm={handleRenameConfirm}
          shaderPresets={shaderPresets}
          setShaderPresets={setShaderPresets}
          currentShaderPreset={currentShaderPreset}
          setCurrentShaderPreset={setCurrentShaderPreset}
          keyboardSelectedConversationId={keyboardSelectedConversationId}
          isKeyboardNavigating={isKeyboardNavigating}
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
              setMessages={setMessages}
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
              setShouldScrollToBottom={setShouldScrollToBottom}
              sidebarOpen={sidebarOpen}
              sidebarMode={sidebarMode}
            />
          </div>
          
          {/* Embedding content */}
          <div 
            style={{ 
              display: activeTool === 'embedding' ? 'flex' : 'none',
              height: 'calc(100vh - 40px)'
            }} 
            className="flex-1 flex flex-col overflow-hidden">
            <Embedding isActive={activeTool === 'embedding'} />
          </div>

          {/* Browser content */}
          <div style={{ display: activeTool === 'browser' ? 'flex' : 'none' }} className="flex-1 flex flex-col relative">
            <div className="flex-1 bg-base-100 overflow-auto" style={{ height: 'calc(100vh - 28px)' }}>
              {/* Browser view managed by main process */}
            </div>
          </div>

          {/* Monaco Editor content */}
          <div style={{ display: activeTool === 'monaco' ? 'flex' : 'none' }} className="flex-1 overflow-hidden">
            <MonacoEditor 
              currentNote={currentNote}
              saveNote={saveNote}
            />
          </div>

          {/* ThreeJS Shaders content */}
          <div style={{ display: activeTool === 'threejs-shaders' ? 'flex' : 'none' }} className="flex-1 overflow-hidden">
            <ThreeJSShaders />
          </div>

          {/* AI Chat content */}
          <div style={{ display: activeTool === 'aichat' ? 'flex' : 'none' }} className="flex-1 overflow-hidden">
            <AIChat 
              sendToSidebar={handleSendToSidebar}
              createNewConversation={createNewConversation}
              storagePath={storagePath}
              currentConversation={currentConversation}
              conversations={conversations}
              onConversationSelect={handleConversationSelect}
              onConversationDelete={handleConversationDelete}
              onConversationRename={handleConversationRename}
              window={window}
              electron={window.electron}
              openInBrowserTab={openInBrowserTab}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              availableModels={availableModels}
              setAvailableModels={setAvailableModels}
              maxTokens={maxTokens}
              setMaxTokens={setMaxTokens}
              temperature={temperature}
              setTemperature={setTemperature}
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              isCompact={isCompact}
              sidebarOpen={sidebarOpen}
            />
          </div>

        </div>

        {/* All components need to be wrapped in the same parent element */}
        <div className="overlays">
          <ContextMenu
            contextMenu={contextMenu}
            onClose={() => setContextMenu({ visible: false, x: 0, y: 0 })}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
          />

          <ImageLightbox
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            images={lightboxImages}
            startIndex={lightboxIndex}
          />
        </div>
      </div>
      
      {/* 书签面板 - 移至应用根级别以实现真正的全屏效果 */}
      {showBookmarksPanel && (
        <BookmarksPanel 
          onClose={() => {
            setShowBookmarksPanel(false);
            window.electron.bookmarks.toggleBookmarksPanel(false);
          }}
        />
      )}

      {/* Modals and overlays */}
      {showSettings && (
        <div className="modal modal-open settings-modal">
          <div className="modal-box">
            <button 
              onClick={() => setShowSettings(false)}
              className="close-btn"
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
                    <div className="flex flex-col items-center gap-2">
                      <button className="shader-btn save-btn" onClick={() => handleSelectFolder(setStoragePath, currentConversation, messages, window, setConversations, setCurrentConversation)}>
                        Modify Folder
                      </button>
                      <span className="text-sm opacity-70 text-center">{storagePath || 'No folder selected'}</span>
                    </div>
                  </div>
              
                <div className="flex items-center justify-between">
                  <h3 className="text-lg">Update</h3>
                  <button className="shader-btn" onClick={() => handleUpdateFolders(storagePath, setConversations, window)}>
                    Update Folders
                  </button>
              </div>

                <div className="divider"></div>

                <div className="flex items-center justify-between">
                  <h3 className="text-lg">Theme</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-70">{currentTheme}</span>
                    <button onClick={() => toggleTheme(currentTheme, themes, setCurrentTheme)} className="shader-btn">
                      Change Theme
                    </button>
              </div>
                </div>
              </div>
              </div>
            </div>
          </div>
          <div 
            className="modal-backdrop" 
            onClick={() => setShowSettings(false)}
            style={{
              backdropFilter: 'blur(3px)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}
          ></div>
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
    </div>
  )
}