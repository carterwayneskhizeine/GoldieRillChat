import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { toggleTheme, themes } from '../components/themeHandlers'
import { openUrl, openUrlDirectly } from '../utils/browserUtils'
import { TextareaState } from '../components/DaisyTextarea'
// 移除 react-hot-toast 导入
// import { toast } from 'react-hot-toast'

// 导入翻译服务
// import { translateText, getGoogleTranslateConfig } from '../services/webTranslationService'

// 更新滑动条进度的辅助函数
const updateRangeProgress = (rangeElement) => {
  if (!rangeElement) return;
  const min = parseFloat(rangeElement.min) || 0;
  const max = parseFloat(rangeElement.max) || 100;
  const value = parseFloat(rangeElement.value) || min;
  const percentage = ((value - min) / (max - min)) * 100;
  rangeElement.style.setProperty('--range-shdw', `${percentage}%`);
  
  // 设置黄金色的进度条颜色，增加透明度
  rangeElement.style.background = `linear-gradient(to right, rgba(255, 215, 0, 0.35) 0%, rgba(255, 215, 0, 0.35) ${percentage}%, rgba(0, 0, 0, 0.15) ${percentage}%, rgba(0, 0, 0, 0.15) 100%)`;
};

// 通知显示函数 - 移动到外部成为独立函数
  const showNotification = (message, type = 'info') => {
    console.log(`[${type}] ${message}`);
    
    // 先删除可能存在的旧容器
    const existingContainer = document.getElementById('title-bar-notifications');
    if (existingContainer) {
      document.body.removeChild(existingContainer);
    }
    
    // 创建新的通知容器
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'title-bar-notifications';
    Object.assign(notificationContainer.style, {
      position: 'fixed',
      top: '60px',
      left: '20px', // 确保显示在左侧
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '180px', // 设置最大宽度
      transition: 'all 0.3s ease-in-out'
    });
    
    // 创建Alert元素
    const alertElement = document.createElement('div');
    
    // 使用DaisyUI的alert样式类
    alertElement.className = `alert ${
      type === 'error' ? 'alert-error' : 
      type === 'success' ? 'alert-success' : 
      'alert-info'
    } shadow-lg`;
    
    // 设置Alert元素样式
    Object.assign(alertElement.style, {
      width: '180px', // 固定宽度
      opacity: '0',
      transition: 'opacity 0.3s ease-in-out',
      padding: '0.75rem',
      borderRadius: '0.5rem'
    });
    
    // 根据不同类型设置不同的图标
    let iconSvg = '';
    if (type === 'error') {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    } else if (type === 'success') {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    } else {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    }
    
    // 设置Alert内容
    alertElement.innerHTML = `
      <div class="flex items-center">
        ${iconSvg}
        <span class="ml-2">${message}</span>
      </div>
    `;
    
    // 添加到容器并附加到文档
    notificationContainer.appendChild(alertElement);
    document.body.appendChild(notificationContainer);
    
    // 强制重排以确保动画效果
    void alertElement.offsetWidth;
    
    // 淡入效果
    setTimeout(() => {
      alertElement.style.opacity = '1';
    }, 10);
    
    // 定时移除通知
    setTimeout(() => {
      alertElement.style.opacity = '0';
      
      setTimeout(() => {
        if (document.body.contains(notificationContainer)) {
          document.body.removeChild(notificationContainer);
        }
      }, 300);
    }, 3000);
  };

// 添加简化的翻译按钮组件
const TranslateButton = ({ currentUrl, activeTabId }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  
  const handleTranslate = async () => {
    try {
      setIsTranslating(true);
      
      // 统一使用Google翻译服务（免费方式），固定翻译为中文
      const url = currentUrl || window.location.href;
      
      // 检查URL是否有效
      if (!url || url.startsWith('file:') || url.startsWith('electron:') || url.startsWith('about:')) {
        showNotification('当前页面无法翻译', 'error');
        setIsTranslating(false);
        return;
      }
      
      // 使用Google翻译服务在新窗口打开
      showNotification('正在使用Google翻译服务...');
      openGoogleTranslateInNewWindow(url, 'zh-CN');
      
      setIsTranslating(false);
    } catch (error) {
      console.error('翻译失败:', error);
      showNotification(`翻译失败: ${error.message}`, 'error');
      setIsTranslating(false);
    }
  };

  // 辅助函数：在新窗口打开Google翻译
  const openGoogleTranslateInNewWindow = (url, targetLang) => {
    const googleTranslateUrl = `https://translate.google.com/translate?sl=auto&tl=${targetLang}&u=${encodeURIComponent(url)}`;
    openUrlDirectly(googleTranslateUrl);
    showNotification('网页翻译中...', 'success');
  };

  return (
    <button 
      className={`btn btn-xs btn-ghost ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleTranslate}
      disabled={isTranslating}
      title="翻译当前页面为中文"
    >
      {isTranslating ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      )}
    </button>
  );
};

export default function TitleBar({ 
  title, 
  onBackClick,
  onNewChat,
  onRetry,
  showBackButton = false,
  onAction,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  onRenameChat,
  onDeleteChat,
  onUpdateImage,
  onClose,
  activeTool,
  currentUrl,
  setCurrentUrl,
  isLoading,
  currentTheme,
  setCurrentTheme,
  onAddBookmark,
  onToggleBookmarksPanel,
  showBookmarksPanel,
  onImportBookmarks,
  activeTabId,
  selectedModel,
  setSelectedModel,
  availableModels,
  currentConversation,
  systemPromptEnabled,
  setShowSettings,
  selectedProvider,
  sidebarOpen
}) {
  const [isNavigating, setIsNavigating] = useState(false); // 添加导航状态
  const [isImageBackground, setIsImageBackground] = useState(false); // 添加图片背景状态
  const [chatTitle, setChatTitle] = useState(title || '新对话');
  const [isEditing, setIsEditing] = useState(false);
  const titleInputRef = useRef(null);
  const [iconPath, setIconPath] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const initializedRef = useRef(false);
  const lastProviderRef = useRef(null);
  
  // 添加语音识别相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  
  // 添加maxHistoryMessages状态
  const [maxHistoryMessages, setMaxHistoryMessages] = useState(() => {
    return parseInt(localStorage.getItem('aichat_max_history_messages') || '5');
  });
  
  // 安全的temperature和maxTokens值
  const safeMaxTokens = maxTokens || parseInt(localStorage.getItem('aichat_max_tokens') || '4096');
  const safeTemperature = temperature !== undefined ? temperature : parseFloat(localStorage.getItem('aichat_temperature') || '0.7');
  
  // 在组件挂载后和参数变化时更新滑动条
  useEffect(() => {
    const updateAllRanges = () => {
      document.querySelectorAll('.range.range-xs').forEach(rangeElement => {
        updateRangeProgress(rangeElement);
      });
    };
    
    // 延迟执行，确保DOM已渲染
    const timer = setTimeout(updateAllRanges, 100);
    
    return () => clearTimeout(timer);
  }, [safeMaxTokens, safeTemperature, maxHistoryMessages]);

  useEffect(() => {
    // 初始化窗口状态
    window.electron.window.isMaximized().then(setIsMaximized)

    // 获取图标路径
    const iconName = 'favicon.png'
    setIconPath(`app-resource://${iconName}`)

    // 监听窗口最大化状态变化
    const unsubscribe = window.electron.window.onMaximizedStateChanged((state) => {
      setIsMaximized(state)
    })

    // 监听当前会话变化
    const handleStorageChange = () => {
      const savedConversation = localStorage.getItem('aichat_current_conversation');
      if (savedConversation) {
        const conversation = JSON.parse(savedConversation);
        setChatTitle(conversation?.name || '新对话');
      }
    };

    // 初始化当前会话名称
    handleStorageChange();

    // 添加 storage 事件监听器
    window.addEventListener('storage', handleStorageChange);

    // 检查是否为图片背景模式
    const checkImageBackgroundMode = () => {
      if (window.isImageBackgroundMode !== undefined) {
        setIsImageBackground(window.isImageBackgroundMode);
      }
    };
    
    // 立即检查一次
    checkImageBackgroundMode();
    
    // 监听背景模式变化的事件
    const handleBackgroundModeChange = (event) => {
      if (event.detail && event.detail.isImageBackground !== undefined) {
        setIsImageBackground(event.detail.isImageBackground);
      }
    };
    
    window.addEventListener('backgroundModeChange', handleBackgroundModeChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('backgroundModeChange', handleBackgroundModeChange);
    }
  }, [])

  // 使用useMemo代替useState+useEffect来计算可用模型列表
  const localAvailableModels = useMemo(() => {
    // 默认模型列表映射 - 内联定义，避免外部依赖
    const defaultModelsMap = {
      openai: [
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ],
      claude: [
        'claude-3-5-sonnet-latest',
        'claude-3-5-haiku-latest',
        'claude-3-opus-latest',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ],
      siliconflow: [
        'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
        'Qwen/Qwen2.5-7B-Instruct',
        'Qwen/Qwen2.5-Coder-7B-Instruct',
        'internlm/internlm2_5-7b-chat',
        'meta-llama/Meta-Llama-3.1-8B-Instruct',
        'THUDM/glm-4-9b-chat'
      ],
      deepseek: [
        'deepseek-chat',
        'deepseek-reasoner'
      ],
      openrouter: [
        'google/gemini-2.0-flash-thinking-exp:free',
        'deepseek/deepseek-chat:free',
        'google/gemini-2.0-pro-exp-02-05:free',
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o'
      ],
      stepfun: [
        'step-2-16k',
        'step-1-8k',
        'step-1-32k',
        'step-1-128k'
      ]
    };
    
    // 获取默认模型列表的内联函数
    const getDefaultModels = (provider) => {
      return defaultModelsMap[provider] || [
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ];
    };
  
    // 初始化时记录provider
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastProviderRef.current = selectedProvider;
    }
    
    // 检查provider是否发生变化
    const providerChanged = selectedProvider !== lastProviderRef.current;
    if (providerChanged) {
      lastProviderRef.current = selectedProvider;
    }
    
    // 如果有有效的模型列表，使用它
    if (availableModels && availableModels.length > 0) {
      // 保存到localStorage
      try {
        localStorage.setItem(`aichat_available_models_${selectedProvider}`, JSON.stringify(availableModels));
      } catch (e) {
        // 忽略localStorage错误
      }
      return availableModels;
    }
    
    // provider变化或没有可用模型时，尝试从localStorage获取
    if (providerChanged || !availableModels || availableModels.length === 0) {
      try {
        const savedModelsStr = localStorage.getItem(`aichat_available_models_${selectedProvider}`);
        if (savedModelsStr) {
          const savedModels = JSON.parse(savedModelsStr);
          if (Array.isArray(savedModels) && savedModels.length > 0) {
            return savedModels;
          }
        }
      } catch (e) {
        // 解析错误时忽略
      }
      
      // 返回默认模型
      return getDefaultModels(selectedProvider);
    }
    
    // 其他情况返回空数组
    return [];
  }, [availableModels, selectedProvider]); // 只依赖availableModels和selectedProvider

  // 处理导航请求
  const handleNavigation = (url) => {
    if (isNavigating) return; // 如果正在导航中，忽略请求
    
    // 确保URL格式正确
    let formattedUrl = url.trim();
    if (!formattedUrl) return;
    
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://') && !formattedUrl.startsWith('file://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    setIsNavigating(true); // 设置导航状态为正在进行
    
    try {
      if (!activeTabId) {
        // 如果没有活动标签页，直接创建新标签页并导航到URL
        console.log('没有活动标签页，创建新标签页:', formattedUrl);
        window.electron.browser.newTab(formattedUrl).finally(() => {
          // 无论成功失败，500ms后重置导航状态
          setTimeout(() => {
            setIsNavigating(false);
          }, 500);
        });
      } else {
        // 有活动标签页，直接导航
        console.log('导航到:', formattedUrl);
        window.electron.browser.navigate(formattedUrl).finally(() => {
          // 无论成功失败，500ms后重置导航状态
          setTimeout(() => {
            setIsNavigating(false);
          }, 500);
        });
      }
    } catch (error) {
      console.error('导航错误:', error);
      setIsNavigating(false); // 出错时立即重置状态
    }
  };

  // 跳转到谷歌翻译
  const openGoogleTranslate = () => {
    const text = editorRef.current?.getValue() || '';
    if (!text.trim()) return;
    
    const googleTranslateUrl = `https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(text)}&op=translate`;
    openUrl(googleTranslateUrl, true, true);
  };

  // 处理maxHistoryMessages变更
  const handleMaxHistoryMessagesChange = (value) => {
    const numValue = parseInt(value);
    
    // 有效性检查
    if (isNaN(numValue) || numValue < 0 || numValue > 21) {
      return;
    }
    
    // 更新状态
    setMaxHistoryMessages(numValue);
    
    // 先存储旧值以便在事件中使用
    const oldValue = localStorage.getItem('aichat_max_history_messages');
    
    // 更新localStorage
    localStorage.setItem('aichat_max_history_messages', numValue.toString());
    
    // 触发自定义storage事件以通知其他组件设置已更改
    try {
    const storageEvent = new CustomEvent('aichat-settings-change', {
      detail: {
        key: 'aichat_max_history_messages',
        newValue: numValue.toString(),
          oldValue: oldValue
      }
    });
    window.dispatchEvent(storageEvent);
      
      // 额外触发原生storage事件作为备份方法
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'aichat_max_history_messages',
        newValue: numValue.toString(),
        oldValue: oldValue,
        storageArea: localStorage
      }));
    } catch (error) {
      console.error('触发事件失败:', error);
    }
    
    // 显示提示消息
    if (window.message) {
      window.message.success({
        content: `历史消息数量已设置为${numValue === 21 ? '全部' : numValue}条`,
        duration: 2
      });
    } else {
      // 使用备用通知方法
      showNotification(`历史消息数量已设置为${numValue === 21 ? '全部' : numValue}条`, 'success');
    }
  };

  // 测试Flask连接
  const testFlaskConnection = async () => {
    if (isCheckingServer) return;
    
    setIsCheckingServer(true);
    
    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      console.log('正在连接语音服务器...');
      
      const response = await fetch('http://127.0.0.1:2047/api/speech/test', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        showNotification('语音服务器连接成功', 'success');
        setIsCheckingServer(false);
        return true;
      } else {
        showNotification(`语音服务器响应异常: ${data.message || '未知错误'}`, 'error');
        setIsCheckingServer(false);
        return false;
      }
    } catch (error) {
      console.error('连接Flask服务器失败:', error);
      
      // 区分不同类型的错误
      if (error.name === 'AbortError') {
        showNotification('连接语音服务器超时，请确保服务器已启动', 'error');
      } else if (error.message.includes('Failed to fetch')) {
        showNotification('无法连接到语音服务器，请确保服务器已启动', 'error');
      } else {
        showNotification(`连接语音服务器失败: ${error.message}`, 'error');
      }
      
      setIsCheckingServer(false);
      setIsRecording(false);
      return false;
    }
  };

  // 添加需要的状态变量
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [recordedText, setRecordedText] = useState('');
  const audioContext = useRef(null);
  const mediaStream = useRef(null);
  const mediaRecorder = useRef(null);
  const pollingInterval = useRef(null);

  // 开始录音功能
  const startRecording = async () => {
    try {
      // 首先测试服务器连接
      const serverOk = await testFlaskConnection();
      if (!serverOk) {
        return;
      }
      
      console.log('开始语音识别...');
      
      // 生成会话ID
      const sessionId = Date.now().toString();
      console.log(`开始识别会话 ID: ${sessionId}`);
      
      // 调用后端API启动识别会话
      const startResponse = await fetch('http://127.0.0.1:2047/api/speech/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      
      if (!startResponse.ok) {
        throw new Error(`启动识别会话失败: ${startResponse.status} ${startResponse.statusText}`);
      }
      
      const startData = await startResponse.json();
      if (startData.status !== 'success') {
        throw new Error(startData.message || '启动语音识别失败');
      }
      
      console.log('识别会话已启动');
      
      // 清除可能存在的旧轮询
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // 重要：先设置会话ID，再设置录音状态
      setCurrentSessionId(sessionId);
      
      // 设置录音状态为true - 重要，直接使用useState的函数形式保证状态更新
      setIsRecording(true);
      
      // 重置识别文字
      setRecordedText('');
      
      // 使用本地变量和setTimeout确保正确的会话ID被使用
      setTimeout(() => {
        console.log(`使用会话ID准备轮询: ${sessionId}`);
        
        // 立即执行一次获取结果，确保连接正常
        fetchTranscriptionResultsWithSessionId(sessionId);
        
        // 开始轮询获取识别结果 - 使用闭包捕获正确的sessionId
        console.log('设置结果轮询间隔: 300ms');
        pollingInterval.current = setInterval(() => {
          fetchTranscriptionResultsWithSessionId(sessionId);
        }, 300);
        
        // 设置轮询安全超时（5分钟后自动停止）
        setTimeout(() => {
          if (pollingInterval.current) {
            console.log('轮询安全超时（5分钟）触发，自动停止录音');
            stopRecording();
          }
        }, 5 * 60 * 1000);
      }, 100);
      
      // 显示开始录音通知
      showNotification('语音识别已开始，请说话...', 'success');
    } catch (error) {
      console.error('启动语音识别失败:', error);
      showNotification(`启动语音识别失败: ${error.message}`, 'error');
      setIsRecording(false);
    }
  };
  
  // 专用函数：使用特定会话ID获取转录结果，避免依赖状态
  const fetchTranscriptionResultsWithSessionId = async (sessionId) => {
    if (!sessionId) {
      console.warn('会话ID为空，无法获取结果');
      return;
    }
    
    console.log(`使用会话ID [${sessionId}] 获取识别结果`);
    
    try {
      // 使用AbortController实现超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      console.log(`发送获取结果请求: http://127.0.0.1:2047/api/speech/results?session_id=${sessionId}`);
      
      const response = await fetch(`http://127.0.0.1:2047/api/speech/results?session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // 清除超时
      
      if (!response.ok) {
        throw new Error(`API返回错误: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('获取到的语音识别API响应:', data);
      
      if (data.status === 'success' && data.results && data.results.length > 0) {
        console.log(`收到 ${data.results.length} 条识别结果`);
        
        // 创建一个临时变量存储未完成的句子
        let tempRecognizedText = '';
        
        // 处理所有结果
        for (const result of data.results) {
          // 打印结果的完整内容以便调试
          console.log('原始结果对象:', JSON.stringify(result));
          
          const resultType = result.type || '';
          const resultText = result.text || '';
          const isEnd = result.is_end || false;
          
          // 记录识别的文本和是否结束
          console.log(`识别结果: "${resultText}", 类型: ${resultType}, 是否句末: ${isEnd}`);
          
          // 只处理文本类型的结果
          if (resultType === 'text') {
            // 保存临时文本
            if (resultText) {
              tempRecognizedText = resultText;
              
              // 只在句子结束时插入文本
              if (isEnd) {
                console.log(`句子已结束，准备插入最终文本: "${tempRecognizedText}"`);
                
                // 尝试插入文本到活跃元素
                const inserted = insertTextToActiveElement(tempRecognizedText, true);
                
                // 如果插入成功，清空已记录的文本
                if (inserted) {
                  setRecordedText('');
                  console.log('文本插入成功，已清空已记录文本');
                  showNotification(`已将文本"${tempRecognizedText}"插入到输入框`, 'success');
                } else {
                  console.log('插入文本失败，尝试备用方法');
                  
                  // 备用方法：尝试复制到剪贴板
                  try {
                    await navigator.clipboard.writeText(tempRecognizedText);
                    showNotification(`无法插入文本，但已复制到剪贴板: "${tempRecognizedText}"`, 'info');
                  } catch (clipboardError) {
                    console.error('复制到剪贴板失败:', clipboardError);
                    showNotification(`识别成功但无法插入或复制: "${tempRecognizedText}"`, 'warning');
                  }
                }
              } else {
                // 对于未完成的句子，只显示在状态中
                console.log(`句子未结束，更新状态显示: "${tempRecognizedText}"`);
                setRecordedText(tempRecognizedText);
              }
            }
          } else if (resultType === 'complete') {
            console.log('收到完成事件，识别会话已结束');
          } else if (resultType === 'error') {
            console.error('收到错误事件:', result.message);
            showNotification(`语音识别错误: ${result.message}`, 'error');
          } else {
            // 尝试处理可能缺少type字段的结果
            if (resultText) {
              console.log(`处理未标明类型的结果: "${resultText}"`);
              tempRecognizedText = resultText;
              
              if (isEnd) {
                const inserted = insertTextToActiveElement(tempRecognizedText, true);
                if (inserted) {
                  setRecordedText('');
                  showNotification(`已将文本"${tempRecognizedText}"插入到输入框`, 'success');
                }
              } else {
                setRecordedText(tempRecognizedText);
              }
            }
          }
        }
      } else if (data.status === 'error') {
        console.error('语音识别错误:', data.message);
        showNotification(`语音识别错误: ${data.message}`, 'error');
      } else {
        console.log('未收到识别结果');
      }
    } catch (error) {
      // 忽略AbortError，这只是超时
      if (error.name === 'AbortError') {
        console.log('获取识别结果超时');
      } else {
        console.error('获取识别结果错误:', error);
        showNotification(`获取识别结果错误: ${error.message}`, 'error');
      }
    }
  };
  
  // 停止录音功能
  const stopRecording = async () => {
    try {
      console.log('开始停止录音过程...');
      
      // 停止轮询
      if (pollingInterval.current) {
        console.log('清除结果轮询间隔');
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      
      // 确保在设置isRecording=false之前调用stop API
      if (isRecording && currentSessionId) {
        try {
          console.log(`调用后端API停止识别会话: ${currentSessionId}`);
          const response = await fetch('http://127.0.0.1:2047/api/speech/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
          });
          
          const data = await response.json();
          console.log('后端响应停止请求:', data);
          
          if (!response.ok) {
            console.warn(`停止识别会话API错误: ${response.status} ${response.statusText}`);
            console.warn('错误详情:', data);
          }
        } catch (error) {
          console.error('停止识别会话API调用失败:', error);
        }
      } else {
        console.log('当前没有录音会话，无需调用停止API');
      }
      
      // 设置状态
      setIsRecording(false);
      
      // 显示停止录音通知
      showNotification('语音识别已停止', 'info');
      
      // 如果有识别结果，显示最终文本
      if (recordedText) {
        showNotification(`识别结果: ${recordedText}`, 'success');
      }
      
      console.log('录音停止过程完成');
    } catch (error) {
      console.error('停止语音识别失败:', error);
      showNotification(`停止语音识别失败: ${error.message}`, 'error');
      // 强制重置状态
      setIsRecording(false);
    }
  };
  
  // 获取转录结果的函数
  const fetchTranscriptionResults = async () => {
    // 在函数开始处添加更多日志
    console.log(`尝试获取转录结果，当前录音状态: ${isRecording ? '录音中' : '未录音'}, 会话ID: ${currentSessionId}`);
    
    if (!isRecording) {
      console.log('未处于录音状态，跳过获取结果');
      return;
    }

    // 确保session_id有效
    if (!currentSessionId) {
      console.warn('会话ID为空，无法获取结果');
      return;
    }

    // 使用新的专用函数，传入当前会话ID
    await fetchTranscriptionResultsWithSessionId(currentSessionId);
  };
  
  // 辅助函数：将文本插入到当前活跃的输入框
  const insertTextToActiveElement = (text, isEnd) => {
    try {
      if (!text || text.trim() === '') {
        console.log('文本为空，不需要插入');
        return false;
      }
      
      console.log(`准备插入最终文本: "${text}", 是否句末: ${isEnd}`);
      
      // 获取当前活跃的元素
      let activeElement = document.activeElement;
      console.log(`当前活跃元素: ${activeElement?.tagName || '无'}, ID: ${activeElement?.id || '无'}, 类: ${activeElement?.className || '无'}`);
      
      // 检查活跃元素是否是文本输入框
      if (activeElement && 
          (activeElement.tagName === 'TEXTAREA' || 
           (activeElement.tagName === 'INPUT' && 
            (activeElement.type === 'text' || activeElement.type === 'search')))) {
        
        console.log('找到有效的活跃输入框元素');
        
        // 获取当前选中的文本范围
        const startPos = activeElement.selectionStart || 0;
        const endPos = activeElement.selectionEnd || 0;
        
        // 当前输入框的值
        const currentValue = activeElement.value || '';
        console.log(`当前值长度: ${currentValue.length}, 选中范围: ${startPos}-${endPos}`);
        
        // 如果是句子结束，添加空格
        const newText = isEnd ? text + ' ' : text;
        
        // 构建新的文本值（替换选中的文本或在光标位置插入）
        // 如果有选中文本则替换，否则在光标位置插入
        const newValue = endPos > startPos 
          ? currentValue.substring(0, startPos) + newText + currentValue.substring(endPos)
          : currentValue.substring(0, startPos) + newText + currentValue.substring(startPos);
        
        console.log(`组装新值，长度: ${newValue.length}`);
        
        // 记住原始值用于调试
        const originalValue = activeElement.value;
        
        // 更新输入框的值
        activeElement.value = newValue;
        
        // 打印值是否真的改变
        console.log(`值是否改变: ${originalValue !== activeElement.value}, 新值: "${activeElement.value}"`);
        
        // 更新光标位置
        const newCursorPos = startPos + newText.length;
        activeElement.setSelectionRange(newCursorPos, newCursorPos);
        
        console.log('准备派发事件...');
        
        // 创建并触发input事件（对所有类型的输入框）
        const inputEvent = new Event('input', { bubbles: true, composed: true });
        activeElement.dispatchEvent(inputEvent);
        console.log('已派发input事件');
        
        // 创建并触发change事件
        const changeEvent = new Event('change', { bubbles: true, composed: true });
        activeElement.dispatchEvent(changeEvent);
        console.log('已派发change事件');
        
        // 尝试使用React的合成事件方法更新值
        // 这对于有些React组件是必要的
        if (activeElement._valueTracker) {
          console.log('检测到React的_valueTracker，应用React特定更新');
          activeElement._valueTracker.setValue('');
        }
        
        // 特殊处理ChatView.jsx和InputArea.jsx的输入框
        if (activeElement.classList.contains('aichat-input') || 
            activeElement.closest('.textarea-bordered') || 
            activeElement.id === 'chat-input') {
          
          console.log('特殊处理特定组件的输入框');
          
          // 使用原生DOM属性设置器更新值
          try {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              activeElement.tagName === 'TEXTAREA' ? 
                window.HTMLTextAreaElement.prototype : 
                window.HTMLInputElement.prototype, 
              "value"
            ).set;
            
            // 使用原生setter更新值
            nativeInputValueSetter.call(activeElement, newValue);
            console.log('已使用原生setter更新值');
            
            // 再次触发事件以确保React捕获了变化
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            activeElement.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) {
            console.error('使用原生setter失败:', e);
          }
        }
        
        // 尝试额外的React绑定更新方法
        if (typeof activeElement.onInput === 'function') {
          console.log('调用元素自身的onInput方法');
          activeElement.onInput({ target: activeElement });
        }
        
        if (typeof activeElement.onChange === 'function') {
          console.log('调用元素自身的onChange方法');
          activeElement.onChange({ target: activeElement });
        }
        
        // 再次验证值是否更新
        console.log(`最终验证 - 值是否正确更新: "${activeElement.value}" === "${newValue}" ? ${activeElement.value === newValue}`);
        
        console.log('文本插入过程完成');
        return true;
      } else {
        // 如果没有活跃的文本输入框，尝试找到一个并聚焦到它
        console.log('未找到活跃的文本输入框，尝试查找页面上的输入框');
        
        // 首先尝试找到常见的输入元素
        const inputs = [
          ...document.querySelectorAll('textarea'), 
          ...document.querySelectorAll('input[type="text"]'),
          ...document.querySelectorAll('.aichat-input'),
          ...document.querySelectorAll('.textarea-bordered'),
          document.getElementById('chat-input')
        ].filter(Boolean); // 过滤掉null和undefined
        
        console.log(`找到${inputs.length}个潜在输入框元素`);
        
        if (inputs.length > 0) {
          // 找到第一个可见的输入框
          for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const style = window.getComputedStyle(input);
            
            console.log(`检查输入框 #${i}: ${input.tagName}, ID: ${input.id || '无ID'}, display: ${style.display}, visibility: ${style.visibility}`);
            
            if (style.display !== 'none' && style.visibility !== 'hidden' && input.offsetParent !== null) {
              console.log(`找到可见输入框: ${input.tagName}, ID: ${input.id || '无ID'}`);
              
              // 保存当前活跃元素
              const previousActive = document.activeElement;
              
              // 聚焦到这个输入框
              try {
                console.log('尝试聚焦到输入框');
                input.focus();
                // 确保DOM更新完成
                setTimeout(() => {
                  // 验证聚焦是否成功
                  if (document.activeElement === input) {
                    console.log('聚焦成功，递归调用自己');
                    // 递归调用自己，现在已经有活跃元素了
                    insertTextToActiveElement(text, isEnd);
                  } else {
                    console.log(`聚焦失败: 当前活跃元素=${document.activeElement?.tagName || '无'}, 目标=${input.tagName}`);
                  }
                }, 50);
                return true;
              } catch (focusError) {
                console.error('聚焦到输入框失败:', focusError);
                // 尝试回到原来的活跃元素
                if (previousActive) {
                  previousActive.focus();
                }
              }
            }
          }
          
          console.log('未找到可以聚焦的输入框，尝试强制插入到第一个输入框');
          
          // 如果没有可聚焦的输入框，尝试强制插入到第一个输入框
          for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            // 只尝试文本框和文本区域
            if (input.tagName === 'TEXTAREA' || (input.tagName === 'INPUT' && input.type === 'text')) {
              console.log(`尝试强制插入到: ${input.tagName}, ID: ${input.id || '无ID'}`);
              
              try {
                // 插入最终文本
                const finalText = text + (isEnd ? ' ' : '');
                const originalValue = input.value || '';
                input.value = finalText;
                
                console.log(`强制插入 - 原值: "${originalValue}", 新值: "${input.value}"`);
                
                // 触发事件以通知React
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                
                // 特殊处理React组件
                if (input._valueTracker) {
                  input._valueTracker.setValue('');
                  console.log('应用React特定更新到强制插入的输入框');
                }
                
                showNotification(`已强制将文本"${text}"插入到输入框`, 'success');
                return true;
              } catch (err) {
                console.error('强制插入失败:', err);
              }
              
              break;
            }
          }
        }
        
        // 如果没有找到输入框，显示通知
        console.log('未找到可用的输入框，将文本复制到剪贴板');
        
        // 尝试复制到剪贴板
        try {
          navigator.clipboard.writeText(text);
          showNotification(`识别结果已复制到剪贴板: "${text}"`, 'info');
          return false;
        } catch (clipboardError) {
          console.error('复制到剪贴板失败:', clipboardError);
          showNotification(`识别结果: ${text}`, 'info');
          return false;
        }
      }
    } catch (error) {
      console.error('插入文本到活跃元素失败:', error);
      showNotification(`插入文本失败: ${error.message}`, 'error');
      return false;
    }
  };
  
  // 初始化组件
  useEffect(() => {
    // 添加键盘快捷键监听
    const handleVoiceShortcut = (e) => {
      // 检查是否为Ctrl+Shift+M组合键
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        console.log('检测到语音识别快捷键');
        // 防止默认行为和事件冒泡
        e.preventDefault();
        
        // 获取当前录音状态
        const currentlyRecording = isRecording;
        console.log(`当前录音状态: ${currentlyRecording ? '录音中' : '未录音'}`);
        
        // 切换录音状态
        if (currentlyRecording) {
          console.log('快捷键触发停止录音');
          stopRecording();
        } else {
          console.log('快捷键触发开始录音');
          startRecording();
        }
      }
    };

    // 添加键盘事件监听
    window.addEventListener('keydown', handleVoiceShortcut);

    // 清理函数
    return () => {
      // 移除键盘事件监听
      window.removeEventListener('keydown', handleVoiceShortcut);
      
      // 确保清理录音相关资源
      if (isRecording) {
        console.log('组件卸载时停止录音');
        
        // 清除轮询
        if (pollingInterval.current) {
          console.log('清除轮询间隔');
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        
        // 重置录音状态
        setIsRecording(false);
        
        // 尝试调用后端停止API，但不等待结果
        if (currentSessionId) {
          try {
            console.log(`发送停止录音请求，会话ID: ${currentSessionId}`);
            fetch('http://127.0.0.1:2047/api/speech/stop', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: currentSessionId })
            }).catch(e => console.warn('停止请求发送失败，但这是在清理阶段，可以忽略:', e));
          } catch (e) {
            console.warn('发送停止请求时出错，但这是在清理阶段，可以忽略:', e);
          }
        } else {
          console.warn('无法停止录音：会话ID为空');
        }
      }
    };
  }, [isRecording, currentSessionId]);

  return (
    <div className="h-11 flex items-center bg-base-300 select-none" style={{ WebkitAppRegion: 'drag' }}>
      {/* 应用图标和名称 */}
      <div className="flex items-center px-3 gap-3 w-[260px]">
        <div className="app-logo-container" style={{
          position: 'relative',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: isImageBackground ? '4px 16px 4px 4px' : '3px',
          margin: isImageBackground ? '3px 0' : '0',
          borderRadius: '6px',
          backdropFilter: isImageBackground ? 'blur(4px)' : 'none',
          WebkitBackdropFilter: isImageBackground ? 'blur(4px)' : 'none',
          border: isImageBackground ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
          transform: isImageBackground ? 'translateX(3px)' : 'none',
        }}>
          <img 
            src={iconPath} 
            alt="logo" 
            className="w-5 h-5" 
            style={{
              filter: isImageBackground ? 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.8)) brightness(1.2)' : 'none',
            }}
          />
          <span 
            className="text-sm font-semibold ml-2" 
            style={{
              color: isImageBackground ? 'white' : 'inherit',
              textShadow: isImageBackground ? '0px 0px 3px rgba(0, 0, 0, 0.8)' : 'none',
              fontWeight: isImageBackground ? '600' : 'inherit',
            }}
          >
            GoldieRillChat
          </span>
        </div>
        
        {/* 添加向左向右导航箭头按钮 - 仅在侧边栏关闭时显示 */}
        {!sidebarOpen && (
          <div className="flex items-center ml-3 gap-2">
            <button 
              className="btn btn-ghost px-1.5"
              onClick={() => onAction && onAction('switchTool', 'prev')}
              style={{
                WebkitAppRegion: 'no-drag',
                transition: 'all 0.3s ease',
                borderRadius: '4px',
                height: '26px',
                minHeight: '26px',
                lineHeight: '1'
              }}
              title="Previous"
              onMouseOver={(e) => {
                e.currentTarget.style.color = 'rgb(255, 215, 0)';
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
                e.currentTarget.style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '';
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.textShadow = '';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              className="btn btn-ghost px-1.5"
              onClick={() => onAction && onAction('switchTool', 'next')}
              style={{
                WebkitAppRegion: 'no-drag',
                transition: 'all 0.3s ease',
                borderRadius: '4px',
                height: '26px',
                minHeight: '26px',
                lineHeight: '1'
              }}
              title="Next"
              onMouseOver={(e) => {
                e.currentTarget.style.color = 'rgb(255, 215, 0)';
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
                e.currentTarget.style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '';
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.textShadow = '';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
        
        {/* 添加话筒按钮 - 用于实时语音输入 */}
        <div className="flex items-center ml-3 gap-2">
          <button 
            className={`btn btn-ghost px-1.5 ${isRecording ? 'btn-error text-white' : ''}`}
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            style={{
              WebkitAppRegion: 'no-drag',
              transition: 'all 0.3s ease',
              borderRadius: '4px',
              height: '26px',
              minHeight: '26px',
              lineHeight: '1',
              zIndex: 5,
              position: 'relative'
            }}
            title={isRecording ? "停止语音输入 (Ctrl+Shift+M)" : "开始语音输入 (Ctrl+Shift+M)"}
            onMouseOver={(e) => {
              if (!isRecording) {
              e.currentTarget.style.color = 'rgb(255, 215, 0)';
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
              e.currentTarget.style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              if (!isRecording) {
              e.currentTarget.style.color = '';
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.textShadow = '';
              }
            }}
          >
            {isRecording ? (
              <span className="relative flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="4" cy="12" r="1.5" strokeWidth="0" fill="currentColor" />
                  <line x1="8" y1="16" x2="8" y2="8" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="18" x2="12" y2="6" strokeWidth="3" strokeLinecap="round" />
                  <line x1="16" y1="16" x2="16" y2="8" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="20" cy="12" r="1.5" strokeWidth="0" fill="currentColor" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </span>
            ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="4" cy="12" r="1.5" strokeWidth="0" fill="currentColor" />
              <line x1="8" y1="16" x2="8" y2="8" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="18" x2="12" y2="6" strokeWidth="3" strokeLinecap="round" />
              <line x1="16" y1="16" x2="16" y2="8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="12" r="1.5" strokeWidth="0" fill="currentColor" />
            </svg>
            )}
          </button>
          {/* 录音状态提示 */}
          {isRecording && (
            <span 
              className="text-xs font-medium text-error animate-pulse"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              正在录音...
            </span>
          )}
        </div>

        {/* 便签按钮 - 切换DaisyTextarea的可见性（无论侧边栏状态如何都显示） */}
        <div className="flex items-center ml-3 gap-2">
          <button 
            className="btn btn-ghost px-1.5"
            onClick={() => {
              // 直接调用已导入的TextareaState
              TextareaState.toggleVisibility();
            }}
            style={{
              WebkitAppRegion: 'no-drag',
              transition: 'all 0.3s ease',
              borderRadius: '4px',
              height: '26px',
              minHeight: '26px',
              lineHeight: '1',
              zIndex: 5
            }}
            title="Notes (Ctrl + Q)"
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'rgb(255, 215, 0)';
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
              e.currentTarget.style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '';
              e.currentTarget.style.borderColor = '';
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.textShadow = '';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
              <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2" />
              <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2" />
              <line x1="7" y1="16" x2="12" y2="16" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* 中间区域：浏览器控制栏或聊天标题 */}
      <div className="flex-1 flex justify-center items-center">
        {activeTool === 'browser' ? (
          <div className="w-[700px] flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="join h-8 flex items-center">
              <button 
                className="join-item btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.back()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="10,7 5,12 10,17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
              <button 
                className="join-item btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.forward()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="14,7 19,12 14,17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
              <button 
                className="join-item btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.refresh()}
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
              
              {/* 添加翻译按钮 */}
              <TranslateButton currentUrl={currentUrl} activeTabId={activeTabId} />
            </div>
            <input
              type="text"
              className="input input-bordered flex-1 h-8 min-h-[28px] px-3 text-sm"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isNavigating) {
                  handleNavigation(currentUrl);
                }
              }}
              disabled={isNavigating}
              placeholder="输入网址..."
            />
            
            {/* 书签按钮区域 */}
            <div className="join h-8 flex items-center ml-2">
              {/* 添加书签按钮 */}
              <button
                className="join-item btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
                onClick={onAddBookmark}
                title="添加当前页面到书签"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
                  />
                </svg>
              </button>
              
              {/* 显示书签面板按钮 */}
              <button
                className={`join-item btn ${showBookmarksPanel ? 'btn-primary' : 'btn-ghost'} px-2 h-8 min-h-0 flex items-center justify-center`}
                onClick={onToggleBookmarksPanel}
                title="显示书签"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : activeTool === 'aichat' ? (
          <div className="w-full flex items-center">
            {/* 中间会话名称区域 - 保持拖拽 */}
            <div className="flex-1 h-full flex items-center justify-center">
              <h2 className="text-sm opacity-70 truncate text-center" style={{ maxWidth: '500px' }}>
                {currentConversation?.name || 'Current session'}
              </h2>
            </div>

            {/* 右侧控制区域 */}
            <div className="flex-none flex items-center gap-4 mr-4" style={{ WebkitAppRegion: 'no-drag' }}>
              {/* 中间右侧模型选择 */}
              <div className="flex-none" style={{ width: '280px' }}>
                <select 
                  className="select select-bordered select-sm w-full"
                  value={selectedModel || ''}
                  onChange={(e) => {
                    setSelectedModel && setSelectedModel(e.target.value);
                    localStorage.setItem('aichat_model', e.target.value);
                  }}
                  style={{
                    ...isImageBackground ? { 
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    } : {},
                  }}
                >
                  {localAvailableModels.map(model => (
                    <option 
                      key={model} 
                      value={model} 
                      style={isImageBackground ? { backgroundColor: 'rgba(0, 0, 0, 0.9)', color: 'white' } : {}}
                    >
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* 参数控制下拉菜单 */}
              <div className="dropdown dropdown-bottom dropdown-end">
                <label tabIndex={0} className="btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center" style={isImageBackground ? { 
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                } : {}}>
                  {/* T形SVG图标代表Tokens */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                    <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2"/>
                    <line x1="12" y1="8" x2="12" y2="16" strokeWidth="2"/>
                  </svg>
                </label>
                <div tabIndex={0} className="dropdown-content z-[99] menu p-2 shadow bg-base-100 rounded-md w-[380px]" 
                  style={isImageBackground ? { 
                    backgroundColor: 'rgba(0, 0, 0, 0.25)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    right: 0
                  } : {
                    right: 0
                  }}
                >
                  <div className="p-2">
                    {/* 消息历史记录数量控制 */}
                    <div className="flex flex-col gap-1 mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium" style={isImageBackground ? { 
                          color: 'white', 
                          textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)'
                        } : {}}>Number of message:</span>
                        <span className="text-sm min-w-[40px] text-right" 
                          style={isImageBackground ? { 
                            color: 'white', 
                            textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            padding: '2px 6px',
                            borderRadius: '3px'
                          } : {}}
                        >{maxHistoryMessages === 21 ? '全部' : maxHistoryMessages}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="21"
                        value={maxHistoryMessages}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleMaxHistoryMessagesChange(value);
                          // 更新滑动条进度效果
                          updateRangeProgress(e.target);
                        }}
                        className="range range-xs w-full"
                        step="1"
                        style={{
                          position: 'relative', 
                          zIndex: 5,
                          "--range-shdw": `${((maxHistoryMessages - 0) / (21 - 0)) * 100}%`,
                          // 自定义滑动条样式，增加透明度
                          backgroundColor: 'rgba(0, 0, 0, 0.15)',
                          borderRadius: '4px',
                          height: '6px',
                          // 自定义滑动圆点
                          '--range-thumb-bg': 'rgb(255, 215, 0)',
                          '--range-thumb-shadow': '0 0 8px rgba(255, 215, 0, 0.5)'
                        }}
                        onInput={(e) => updateRangeProgress(e.target)}
                      />
                    </div>

                    {/* Temperature 控制 */}
                    <div className="flex flex-col gap-0.5 mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium" style={isImageBackground ? { 
                          color: 'white', 
                          textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)'
                        } : {}}>Temperature:</span>
                        <span className="text-sm min-w-[40px] text-right" 
                          style={isImageBackground ? { 
                            color: 'white', 
                            textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            padding: '2px 6px',
                            borderRadius: '3px'
                          } : {}}
                        >{safeTemperature.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={safeTemperature}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setTemperature && setTemperature(value);
                          localStorage.setItem('aichat_temperature', e.target.value);
                          updateRangeProgress(e.target);
                        }}
                        className="range range-xs w-full"
                        style={{
                          position: 'relative', 
                          zIndex: 5,
                          "--range-shdw": `${(safeTemperature / 2) * 100}%`,
                          // 自定义滑动条样式，增加透明度
                          backgroundColor: 'rgba(0, 0, 0, 0.15)',
                          borderRadius: '4px',
                          height: '6px',
                          // 自定义滑动圆点
                          '--range-thumb-bg': 'rgb(255, 215, 0)',
                          '--range-thumb-shadow': '0 0 8px rgba(255, 215, 0, 0.5)'
                        }}
                        onInput={(e) => updateRangeProgress(e.target)}
                      />
                    </div>

                    {/* Max Tokens 控制 */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium" style={isImageBackground ? { 
                          color: 'white', 
                          textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)'
                        } : {}}>Max Tokens:</span>
                        <span className="text-sm min-w-[40px] text-right" 
                          style={isImageBackground ? { 
                            color: 'white', 
                            textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            padding: '2px 6px',
                            borderRadius: '3px'
                          } : {}}
                        >{safeMaxTokens === 999999 ? '∞' : safeMaxTokens}</span>
                      </div>
                      <input
                        type="range"
                        min="1024"
                        max="8192"
                        step="128"
                        value={safeMaxTokens > 8192 ? 8192 : safeMaxTokens}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setMaxTokens && setMaxTokens(value);
                          localStorage.setItem('aichat_max_tokens', value.toString());
                          updateRangeProgress(e.target);
                        }}
                        className="range range-xs w-full"
                        style={{
                          position: 'relative', 
                          zIndex: 5,
                          "--range-shdw": `${((Math.min(safeMaxTokens, 8192) - 1024) / (8192 - 1024)) * 100}%`,
                          // 自定义滑动条样式，增加透明度
                          backgroundColor: 'rgba(0, 0, 0, 0.15)',
                          borderRadius: '4px',
                          height: '6px',
                          // 自定义滑动圆点
                          '--range-thumb-bg': 'rgb(255, 215, 0)',
                          '--range-thumb-shadow': '0 0 8px rgba(255, 215, 0, 0.5)'
                        }}
                        onInput={(e) => updateRangeProgress(e.target)}
                      />
                      <div className="flex justify-end mt-0.5">
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            const value = safeMaxTokens === 999999 ? 4096 : 999999;
                            setMaxTokens && setMaxTokens(value);
                            localStorage.setItem('aichat_max_tokens', value.toString());
                            
                            // 手动更新滑动条样式
                            const rangeElement = document.querySelector('.dropdown-content input[type="range"][min="1024"]');
                            if (rangeElement) {
                              // 更新滑动条的值
                              rangeElement.value = Math.min(value, 8192);
                              // 更新滑动条的进度效果
                              updateRangeProgress(rangeElement);
                            }
                          }}
                          title={safeMaxTokens === 999999 ? "点击设置为默认值" : "点击设置为无限制"}
                          style={isImageBackground ? { 
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                          } : {}}
                        >
                          {safeMaxTokens === 999999 ? "default" : "unlimited"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTool === 'chat' ? (
          <div className="w-full flex items-center">
            {/* 中间会话名称区域 - 保持拖拽 */}
            <div className="flex-1 h-full flex items-center justify-center">
              <h2 className="text-sm opacity-70 truncate text-center" style={{ maxWidth: '500px' }}>
                {currentConversation?.name || 'Current session'}
              </h2>
            </div>
          </div>
        ) : null}
      </div>

      {/* 右侧按钮组 */}
      <div className="flex items-center space-x-2 mr-1" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* 主题切换按钮 */}
        <button
          className="btn btn-ghost btn-xs"
          onClick={async () => {
            try {
              await toggleTheme(currentTheme, themes, setCurrentTheme);
            } catch (error) {
              console.error('切换主题失败:', error);
            }
          }}
          title="切换主题"
          style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '18px',
            fontWeight: '300',
            transition: 'all 0.3s ease',
            padding: '0',
            minHeight: '32px',
            cursor: 'pointer',
            WebkitAppRegion: 'no-drag'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'rotate(180deg)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          ∞
        </button>
        
        {/* 最小化按钮 */}
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => window.electron.window.minimize()}
          title="最小化"
          style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '18px',
            fontWeight: '300',
            transition: 'all 0.3s ease',
            padding: '0',
            minHeight: '32px',
            cursor: 'pointer',
            WebkitAppRegion: 'no-drag'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'rotate(180deg)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          ─
        </button>

        {/* 最大化按钮 */}
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => window.electron.window.maximize()}
          title={isMaximized ? "还原" : "最大化"}
          style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '18px',
            fontWeight: '300',
            transition: 'all 0.3s ease',
            padding: '0',
            minHeight: '32px',
            cursor: 'pointer',
            WebkitAppRegion: 'no-drag'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'rotate(180deg)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          {isMaximized ? '❐' : '□'}
        </button>

        {/* 关闭按钮 - 使用DaisyTextarea的完整样式和动画 */}
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => window.electron.window.close()}
          style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '18px',
            fontWeight: '300',
            transition: 'all 0.3s ease',
            padding: '0',
            minHeight: '32px',
            cursor: 'pointer',
            WebkitAppRegion: 'no-drag'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'rotate(90deg)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          ✕
        </button>
        
        {/* 添加透明占位块，防止关闭按钮旋转时导致滚动条出现 */}
        <div style={{
          width: '8px',
          height: '32px',
          opacity: 0,
          pointerEvents: 'none', // 确保不会捕获任何鼠标事件
          WebkitAppRegion: 'drag' // 保持可拖拽
        }}></div>
      </div>
    </div>
  )
} 