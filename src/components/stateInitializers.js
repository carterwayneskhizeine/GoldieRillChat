// 浏览器状态初始化
export const initializeBrowserState = () => ({
    browserTabs: [],
    activeTabId: null,
    currentUrl: '',
    isLoading: false,
    pageTitle: '新标签页'
  })
  
  // 聊天状态初始化
  export const initializeChatState = () => {
    return {
      conversations: (() => {
        const savedConversations = localStorage.getItem('aichat_conversations');
        return savedConversations ? JSON.parse(savedConversations) : [];
      })(),
      currentConversation: (() => {
        const savedConversation = localStorage.getItem('aichat_current_conversation');
        return savedConversation ? JSON.parse(savedConversation) : null;
      })(),
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
      shouldScrollToBottom: false,
      draggedConversation: null
    };
  }
  
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
  
  // Monaco 编辑器笔记状态初始化
  export const initializeNotesState = () => {
    // 生成10个默认的笔记
    const defaultNotes = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Note${i + 1}`,
      filePath: `Notes/Note${i + 1}.txt`,
      content: ''
    }));

    return {
      notes: defaultNotes,
      currentNote: null,
      lastSavedTime: null
    };
  }
  
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