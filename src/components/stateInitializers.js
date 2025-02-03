 // 浏览器状态初始化
export const initializeBrowserState = () => ({
    browserTabs: [],
    activeTabId: null,
    currentUrl: '',
    isLoading: false,
    pageTitle: '新标签页'
  })
  
  // 聊天状态初始化
  export const initializeChatState = () => ({
    conversations: [],
    currentConversation: null,
    messages: [],
    messageInput: '',
    selectedFiles: [],
    editingMessage: null,
    editingFileName: null,
    fileNameInput: '',
    editingFolderName: null,
    folderNameInput: '',
    deletingConversation: null,
    deletingMessageId: null,
    shouldScrollToBottom: false
  })
  
  // 编辑器状态初始化
  export const initializeEditorState = () => ({
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
  
  // 图片预览状态初始化
  export const initializeImagePreviewState = () => ({
    lightboxOpen: false,
    lightboxImages: [],
    lightboxIndex: 0
  })
  
  // 侧边栏状态初始化
  export const initializeSidebarState = () => ({
    sidebarOpen: true,
    sidebarMode: 'default',
    previousMode: null
  })
  
  // 其他UI状态初始化
  export const initializeUIState = () => ({
    showSettings: false,
    isCtrlPressed: false,
    contextMenu: { visible: false, x: 0, y: 0 },
    selectedText: '',
    selectedElement: null
  })
  
  // 画布状态初始化
  export const initializeCanvasState = () => ({
    canvasSize: { width: 1920, height: 1080 },
    tempCanvasSize: { width: 1920, height: 1080 },
    imageSize: { width: 0, height: 0 }
  })
  
  // 存储路径初始化
  export const initializeStoragePath = () => 
    localStorage.getItem('storagePath') || ''