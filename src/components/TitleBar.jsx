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
};

// 添加简化的翻译按钮组件
const TranslateButton = ({ currentUrl, activeTabId }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  
  // 完全重写的通知函数
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
    setMaxHistoryMessages(numValue);
    localStorage.setItem('aichat_max_history_messages', numValue.toString());
    
    // 触发自定义storage事件以通知其他组件设置已更改
    const storageEvent = new CustomEvent('aichat-settings-change', {
      detail: {
        key: 'aichat_max_history_messages',
        newValue: numValue.toString(),
        oldValue: localStorage.getItem('aichat_max_history_messages')
      }
    });
    window.dispatchEvent(storageEvent);
    
    // 显示提示消息
    if (window.message) {
      window.message.success({
        content: `历史消息数量已设置为${numValue === 21 ? '全部' : numValue}条`,
        duration: 2
      });
    }
  };

  return (
    <div className="h-7 flex items-center bg-base-300 select-none app-drag-region">
      {/* 应用图标和名称 */}
      <div className="flex items-center px-2 gap-2 app-drag-region w-[200px]">
        <div className="app-logo-container" style={{
          position: 'relative',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: isImageBackground ? '3px 8px' : '2px',
          margin: isImageBackground ? '2px 0' : '0',
          borderRadius: '4px',
          backdropFilter: isImageBackground ? 'blur(4px)' : 'none',
          WebkitBackdropFilter: isImageBackground ? 'blur(4px)' : 'none',
          border: isImageBackground ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
        }}>
          <img 
            src={iconPath} 
            alt="logo" 
            className="w-3.5 h-3.5 app-drag-region" 
            style={{
              filter: isImageBackground ? 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.8)) brightness(1.2)' : 'none',
            }}
          />
          <span 
            className="text-xs font-semibold app-drag-region ml-2" 
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
          <div className="flex items-center ml-2 gap-1">
            <button 
              className="btn btn-xs btn-ghost px-1"
              onClick={() => onAction && onAction('switchTool', 'prev')}
              style={{
                transition: 'all 0.3s ease',
                borderRadius: '3px',
                height: '20px',
                minHeight: '20px',
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              className="btn btn-xs btn-ghost px-1"
              onClick={() => onAction && onAction('switchTool', 'next')}
              style={{
                transition: 'all 0.3s ease',
                borderRadius: '3px',
                height: '20px',
                minHeight: '20px',
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
        
        {/* 便签按钮 - 切换DaisyTextarea的可见性（无论侧边栏状态如何都显示） */}
        <div className="flex items-center ml-2 gap-1">
          <button 
            className="btn btn-xs btn-ghost px-1"
            onClick={() => {
              // 直接调用已导入的TextareaState
              TextareaState.toggleVisibility();
            }}
            style={{
              transition: 'all 0.3s ease',
              borderRadius: '3px',
              height: '20px',
              minHeight: '20px',
              lineHeight: '1'
            }}
            title="Notes (Ctrl + X)"
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
              <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2" />
              <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2" />
              <line x1="7" y1="16" x2="12" y2="16" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* 中间区域：浏览器控制栏或聊天标题 */}
      <div className="flex-1 flex justify-center items-center app-drag-region">
        {activeTool === 'browser' ? (
          <div className="w-[600px] flex items-center gap-1 no-drag">
            <div className="join h-5 flex items-center">
              <button 
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.back()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="10,7 5,12 10,17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
              <button 
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.forward()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="14,7 19,12 14,17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
              <button 
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.refresh()}
              >
                {isLoading ? (
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
              
              {/* 添加翻译按钮 */}
              <TranslateButton currentUrl={currentUrl} activeTabId={activeTabId} />
            </div>
            <input
              type="text"
              className="input input-xs input-bordered flex-1 h-5 min-h-[20px] px-2 text-xs"
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
            <div className="join h-5 flex items-center ml-1">
              {/* 添加书签按钮 */}
              <button
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={onAddBookmark}
                title="添加当前页面到书签"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                className={`join-item btn btn-xs ${showBookmarksPanel ? 'btn-primary' : 'btn-ghost'} px-1.5 h-5 min-h-0 flex items-center justify-center`}
                onClick={onToggleBookmarksPanel}
                title="显示书签"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
          <div className="w-full flex items-center gap-3 no-drag app-drag-region">
            {/* 左侧会话名称 */}
            <div className="flex-1 flex justify-start items-center ml-2 min-w-0 app-drag-region">
              <h2 className="text-xs opacity-70 truncate max-w-[200px] app-drag-region" style={{ marginLeft: '20px' }}>
                {currentConversation?.name || 'Current session'}
              </h2>
            </div>

            {/* 中间右侧模型选择 */}
            <div className="flex-none ml-auto mr-4" style={{ width: '220px' }}>
              <select 
                className="select select-bordered select-xs w-full"
                value={selectedModel || ''}
                onChange={(e) => {
                  setSelectedModel && setSelectedModel(e.target.value);
                  localStorage.setItem('aichat_model', e.target.value);
                }}
                style={isImageBackground ? { 
                  position: 'relative', 
                  zIndex: 10, 
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                } : {}}
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

            {/* 右侧参数控制 */}
            <div className="flex-none flex items-center gap-4">
              {/* 参数控制下拉菜单 */}
              <div className="dropdown dropdown-bottom dropdown-end">
                <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle m-1" style={isImageBackground ? { 
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  position: 'relative',
                  zIndex: 10
                } : {}}>
                  {/* T形SVG图标代表Tokens */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                    <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2"/>
                    <line x1="12" y1="8" x2="12" y2="16" strokeWidth="2"/>
                  </svg>
                </label>
                <div tabIndex={0} className="dropdown-content z-[1] menu p-1 shadow bg-base-100 rounded-md w-[350px]" 
                  style={isImageBackground ? { 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    right: 0
                  } : {
                    right: 0
                  }}
                >
                  <div className="p-1">
                    {/* 消息历史记录数量控制 */}
                    <div className="flex flex-col gap-0.5 mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium" style={isImageBackground ? { 
                          color: 'white', 
                          textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)'
                        } : {}}>Number of message:</span>
                        <span className="text-xs min-w-[35px] text-right" 
                          style={isImageBackground ? { 
                            color: 'white', 
                            textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            padding: '1px 4px',
                            borderRadius: '2px'
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
                        className="range range-xs range-primary w-full"
                        step="1"
                        style={{
                          ...isImageBackground ? { position: 'relative', zIndex: 10 } : {},
                          "--range-shdw": `${((maxHistoryMessages - 0) / (21 - 0)) * 100}%`
                        }}
                        onInput={(e) => updateRangeProgress(e.target)}
                      />
                    </div>

                    {/* Temperature 控制 */}
                    <div className="flex flex-col gap-0.5 mb-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium" style={isImageBackground ? { 
                          color: 'white', 
                          textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)'
                        } : {}}>Temperature:</span>
                        <span className="text-xs min-w-[35px] text-right" 
                          style={isImageBackground ? { 
                            color: 'white', 
                            textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            padding: '1px 4px',
                            borderRadius: '2px'
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
                        className="range range-xs range-primary w-full"
                        style={{
                          ...isImageBackground ? { position: 'relative', zIndex: 10 } : {},
                          "--range-shdw": `${(safeTemperature / 2) * 100}%`
                        }}
                        onInput={(e) => updateRangeProgress(e.target)}
                      />
                    </div>

                    {/* Max Tokens 控制 */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium" style={isImageBackground ? { 
                          color: 'white', 
                          textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)'
                        } : {}}>Max Tokens:</span>
                        <span className="text-xs min-w-[35px] text-right" 
                          style={isImageBackground ? { 
                            color: 'white', 
                            textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            padding: '1px 4px',
                            borderRadius: '2px'
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
                        className="range range-xs range-primary w-full"
                        style={{
                          ...isImageBackground ? { position: 'relative', zIndex: 10 } : {},
                          "--range-shdw": `${((Math.min(safeMaxTokens, 8192) - 1024) / (8192 - 1024)) * 100}%`
                        }}
                        onInput={(e) => updateRangeProgress(e.target)}
                      />
                      <div className="flex justify-end mt-0.5">
                        <button
                          className="btn btn-xs btn-ghost"
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
                          {safeMaxTokens === 999999 ? "设为默认值" : "设为无限制"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTool === 'chat' ? (
          <div className="w-full flex items-center gap-3 no-drag app-drag-region">
            {/* 只显示左侧会话名称 */}
            <div className="flex-1 flex justify-start items-center ml-2 min-w-0 app-drag-region">
              <h2 className="text-xs opacity-70 truncate max-w-[200px] app-drag-region" style={{ marginLeft: '20px' }}>
                {currentConversation?.name || 'Current session'}
              </h2>
            </div>
          </div>
        ) : null}
      </div>

      {/* 右侧按钮组 */}
      <div className="flex items-center space-x-2 no-drag">
        {/* 主题切换按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 window-control-btn"
          onClick={async () => {
            try {
              await toggleTheme(currentTheme, themes, setCurrentTheme);
            } catch (error) {
              console.error('切换主题失败:', error);
            }
          }}
          title="切换主题"
        >
          ∞
        </button>
        
        {/* 最小化按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 window-control-btn"
          onClick={() => window.electron.window.minimize()}
        >
          ─
        </button>

        {/* 最大化按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 window-control-btn"
          onClick={() => window.electron.window.maximize()}
        >
          {isMaximized ? '❐' : '□'}
        </button>

        {/* 关闭按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 window-control-btn window-close-btn"
          onClick={() => window.electron.window.close()}
        >
          ×
        </button>
      </div>
    </div>
  )
} 