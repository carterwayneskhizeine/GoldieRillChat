import React, { useState, useEffect, useRef, useMemo } from 'react'
import { toggleTheme, themes } from '../components/themeHandlers'

export default function TitleBar({ 
  activeTool, 
  currentUrl, 
  setCurrentUrl, 
  isLoading, 
  currentTheme, 
  setCurrentTheme,
  // 添加书签相关属性
  onAddBookmark,
  onToggleBookmarksPanel,
  showBookmarksPanel,
  // 添加导入书签功能
  onImportBookmarks,
  // 添加活动标签页ID
  activeTabId,
  // 添加AI Chat相关属性
  selectedModel,
  setSelectedModel,
  availableModels,
  currentConversation,
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature,
  systemPromptEnabled,
  setShowSettings,
  // 添加模型供应商相关属性
  selectedProvider
}) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [iconPath, setIconPath] = useState('')
  const [currentChatName, setCurrentChatName] = useState('')
  const [isNavigating, setIsNavigating] = useState(false) // 添加导航状态
  const [isImageBackground, setIsImageBackground] = useState(false) // 添加图片背景状态
  
  // 使用ref记录初始化状态和上一次的值
  const initializedRef = useRef(false);
  const lastProviderRef = useRef(selectedProvider);
  
  // 确保maxTokens和temperature有默认值，防止undefined错误
  const safeMaxTokens = maxTokens || 2000;
  const safeTemperature = temperature !== undefined ? temperature : 0.7;

  useEffect(() => {
    // 初始化窗口状态
    window.electron.window.isMaximized().then(setIsMaximized)

    // 获取图标路径
    const iconName = 'GoldieRillicon.png'
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
        setCurrentChatName(conversation?.name || '');
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

  return (
    <div className="h-7 flex items-center bg-base-300 select-none app-drag-region">
      {/* 应用图标和名称 */}
      <div className="flex items-center px-2 gap-2 app-drag-region w-[200px]">
        <img src={iconPath} alt="logo" className="w-3.5 h-3.5 app-drag-region" />
        <span className="text-xs font-semibold app-drag-region">GoldieRillChat</span>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={() => window.electron.browser.forward()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
              
              {/* 导入书签按钮 - 新增 */}
              <button
                className="join-item btn btn-xs btn-ghost px-1.5 h-5 min-h-0 flex items-center justify-center"
                onClick={onImportBookmarks}
                title="导入书签文件"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
          <div className="w-full flex items-center gap-1 no-drag">
            {/* 左侧模型选择 */}
            <div className="flex-none" style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}>
              <select 
                className="select select-bordered select-xs w-[300px]"
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

            {/* 中间对话名称 */}
            <div className="flex items-center gap-2 mx-2" style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}>
              <h2 className="text-xs opacity-70" 
                  style={isImageBackground ? { 
                    textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  } : {}}>
                {currentConversation?.name || '当前会话'}
              </h2>
            </div>

            {/* 右侧设置区域 */}
            <div className="flex items-center gap-4 ml-auto" style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}>
              {/* Max Tokens 控制 */}
              <div className="flex items-center gap-1">
                <span className="text-xs opacity-70" 
                      style={isImageBackground ? { 
                        color: 'white', 
                        textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        padding: '1px 4px',
                        borderRadius: '2px'
                      } : {}}>Max:</span>
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
                  }}
                  className="range range-xs range-primary w-[60px]"
                  style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}
                />
                <span className="text-xs opacity-70 min-w-[25px]" 
                      style={isImageBackground ? { 
                        color: 'white', 
                        textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        padding: '1px 4px',
                        borderRadius: '2px'
                      } : {}}>{safeMaxTokens === 999999 ? '∞' : safeMaxTokens}</span>
                <button
                  className="btn btn-xs btn-ghost btn-circle"
                  onClick={() => {
                    const value = safeMaxTokens === 999999 ? 2000 : 999999;
                    setMaxTokens && setMaxTokens(value);
                    localStorage.setItem('aichat_max_tokens', value.toString());
                  }}
                  title={safeMaxTokens === 999999 ? "点击设置为默认值" : "点击设置为无限制"}
                  style={isImageBackground ? { 
                    position: 'relative', 
                    zIndex: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  } : {}}
                >
                  {safeMaxTokens === 999999 ? "↺" : "∞"}
                </button>
              </div>

              {/* Temperature 控制 */}
              <div className="flex items-center gap-1 mr-2">
                <span className="text-xs opacity-70" 
                      style={isImageBackground ? { 
                        color: 'white', 
                        textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        padding: '1px 4px',
                        borderRadius: '2px'
                      } : {}}>Temp:</span>
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
                  }}
                  className="range range-xs range-primary w-[60px]"
                  style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}
                />
                <span className="text-xs opacity-70 min-w-[25px]" 
                      style={isImageBackground ? { 
                        color: 'white', 
                        textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        padding: '1px 4px',
                        borderRadius: '2px'
                      } : {}}>{safeTemperature.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 右侧按钮组 */}
      <div className="flex items-center space-x-2 no-drag">
        {/* 主题切换按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 hover:rounded-none"
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
          className="btn btn-ghost btn-xs w-6 h-6 hover:rounded-none"
          onClick={() => window.electron.window.minimize()}
        >
          ─
        </button>

        {/* 最大化按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 hover:rounded-none"
          onClick={() => window.electron.window.maximize()}
        >
          {isMaximized ? '❐' : '□'}
        </button>

        {/* 关闭按钮 */}
        <button
          className="btn btn-ghost btn-xs w-6 h-6 hover:rounded-none text-base-content hover:bg-error hover:text-error-content"
          onClick={() => window.electron.window.close()}
        >
          ×
        </button>
      </div>
    </div>
  )
} 