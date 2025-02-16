import React, { useEffect, useState } from 'react';
import '../styles/settings.css';

export const SettingsModal = ({
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  handleModelChange,
  availableModels,
  apiHost,
  handleApiHostChange,
  apiKey,
  setApiKey,
  showApiKey,
  setShowApiKey,
  handleSettingsClose,
  MODEL_PROVIDERS
}) => {
  // 确保 selectedProvider 是有效的
  const currentProvider = MODEL_PROVIDERS[selectedProvider] || MODEL_PROVIDERS.openai;

  // 添加 tabs 状态
  const [activeTab, setActiveTab] = useState('model');
  
  // 添加 Google Search 相关状态
  const [googleApiKey, setGoogleApiKey] = useState(() => {
    return localStorage.getItem('aichat_google_api_key') || '';
  });
  const [searchEngineId, setSearchEngineId] = useState(() => {
    return localStorage.getItem('aichat_search_engine_id') || '';
  });
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);
  
  // 添加最大搜索数量状态
  const [maxSearchResults, setMaxSearchResults] = useState(() => {
    return parseInt(localStorage.getItem('aichat_max_search_results')) || 5;
  });

  // 添加消息历史记录数量状态
  const [maxHistoryMessages, setMaxHistoryMessages] = useState(() => {
    const saved = localStorage.getItem('aichat_max_history_messages');
    return saved ? parseInt(saved) : 5;  // 默认5条
  });

  // 添加生图模型状态
  const [imageModel, setImageModel] = useState(() => {
    return localStorage.getItem('aichat_image_model') || 'black-forest-labs/FLUX.1-schnell';
  });

  // 添加图片分辨率状态
  const [imageSize, setImageSize] = useState(() => {
    return localStorage.getItem('aichat_image_size') || '1024x576';
  });

  // 生图模型列表
  const IMAGE_MODELS = [
    'black-forest-labs/FLUX.1-schnell',
    'black-forest-labs/FLUX.1-dev',
    'black-forest-labs/FLUX.1-pro',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'stabilityai/stable-diffusion-3-5-large',
    'stabilityai/stable-diffusion-3-5-large-turbo',
    'deepseek-ai/Janus-Pro-7B',
    'stabilityai/stable-diffusion-3-medium',
    'stabilityai/stable-diffusion-2-1',
    'Pro/black-forest-labs/FLUX.1-schnell',
    'LoRA/black-forest-labs/FLUX.1-dev'
  ];

  // 图片分辨率列表
  const IMAGE_SIZES = [
    { value: '1024x576', label: '1024×576 (16:9 横版)' },
    { value: '576x1024', label: '576×1024 (9:16 竖版)' },
    { value: '1024x1024', label: '1024×1024 (1:1 方形)' },
    { value: '768x512', label: '768×512 (3:2 横版)' },
    { value: '512x768', label: '512×768 (2:3 竖版)' },
    { value: '768x1024', label: '768×1024 (3:4 竖版)' }
  ];

  // 处理 Google API 密钥变更
  const handleGoogleApiKeyChange = (value) => {
    setGoogleApiKey(value);
    localStorage.setItem('aichat_google_api_key', value);
  };

  // 处理搜索引擎 ID 变更
  const handleSearchEngineIdChange = (value) => {
    setSearchEngineId(value);
    localStorage.setItem('aichat_search_engine_id', value);
  };

  // 处理 Google API 密钥粘贴
  const handleGoogleApiKeyPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleGoogleApiKeyChange(text);
    } catch (error) {
      console.error('粘贴失败:', error);
    }
  };

  // 处理 API 密钥变更
  const handleApiKeyChange = (value) => {
    setApiKey(value);
  };

  // 处理粘贴
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKey(text);
    } catch (error) {
      console.error('粘贴失败:', error);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      e.preventDefault();
      handlePaste();
    }
  };

  // 处理最大搜索数量变更
  const handleMaxSearchResultsChange = (value) => {
    const numValue = parseInt(value);
    setMaxSearchResults(numValue);
    localStorage.setItem('aichat_max_search_results', numValue.toString());
  };

  // 处理消息历史记录数量变更
  const handleMaxHistoryMessagesChange = (value) => {
    const numValue = parseInt(value);
    setMaxHistoryMessages(numValue);
    localStorage.setItem('aichat_max_history_messages', numValue.toString());
  };

  // 处理生图模型变更
  const handleImageModelChange = (value) => {
    setImageModel(value);
    localStorage.setItem('aichat_image_model', value);
  };

  // 处理图片分辨率变更
  const handleImageSizeChange = (value) => {
    setImageSize(value);
    localStorage.setItem('aichat_image_size', value);
  };

  const openExternalLink = (url) => {
    try {
      // 首选使用 electron 的 shell.openExternal
      if (window.electron?.shell?.openExternal) {
        window.electron.shell.openExternal(url);
      }
      // 回退到 window.open
      else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('打开链接失败:', error);
      // 最后的回退方案
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto settings-panel">
        {/* 标题和关闭按钮 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">设置</h1>
          <button 
            type="button"
            className="btn btn-ghost btn-circle"
            onClick={handleSettingsClose}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="space-y-4">
          {/* 标签页 */}
          <div className="tabs tabs-bordered w-full">
            <a 
              className={`tab ${activeTab === 'model' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('model')}
            >
              模型
            </a>
            <a 
              className={`tab ${activeTab === 'search' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              搜索
            </a>
            {selectedProvider === 'siliconflow' && (
              <a 
                className={`tab ${activeTab === 'image' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('image')}
              >
                图片
              </a>
            )}
            <a 
              className={`tab ${activeTab === 'other' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('other')}
            >
              其它
            </a>
          </div>
          
          {/* Tab 1: 模型设置 */}
          <div className={activeTab === 'model' ? '' : 'hidden'}>
            {/* 模型提供方 */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">模型提供方</h3>
              <select 
                className="select select-bordered w-full"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                {Object.entries(MODEL_PROVIDERS).map(([key, provider]) => (
                  <option key={key} value={key}>{provider.name}</option>
                ))}
              </select>
            </div>

            {/* 具体模型选择 */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">模型</h3>
              <select 
                className="select select-bordered w-full"
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {availableModels
                  .filter(model => !IMAGE_MODELS.includes(model))
                  .map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))
                }
              </select>
            </div>

            {/* API 设置 */}
            <div className="space-y-4">
              {/* API Host */}
              <div>
                <h3 className="text-lg font-medium mb-2">API 地址</h3>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={apiHost}
                  onChange={(e) => handleApiHostChange(e.target.value)}
                  placeholder="请输入 API 地址..."
                />
              </div>

              {/* API Key */}
              <div>
                <h3 className="text-lg font-medium mb-2">API 密钥</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex w-full gap-0">
                    <input
                      type={showApiKey ? "text" : "password"}
                      className="input input-bordered flex-1 rounded-r-none"
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder={`请输入 ${currentProvider.name} API 密钥...`}
                      onKeyDown={handleKeyDown}
                    />
                    <button 
                      type="button"
                      className="btn rounded-l-none"
                      onClick={handlePaste}
                      title="点击粘贴"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                    <button 
                      type="button"
                      className="btn btn-ghost rounded-none border-l-0"
                      onClick={() => setShowApiKey(!showApiKey)}
                      title={showApiKey ? "隐藏密钥" : "显示密钥"}
                    >
                      {showApiKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 text-xs opacity-70">
                    <div className="settings-help-text">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        API 密钥已为每个提供商单独保存，切换提供商时会自动加载对应的密钥
                      </span>
                    </div>
                    {currentProvider.needsApiKey && (
                      <div className="settings-help-text text-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>
                          此提供商需要 API 密钥才能使用
                        </span>
                      </div>
                    )}
                    {currentProvider.apiKeyHelp && (
                      <div className="settings-help-text mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {currentProvider.apiKeyHelp.split(': ').map((part, index, array) => {
                            if (index === array.length - 1) {
                              return (
                                <a
                                  key={index}
                                  className="text-primary hover:text-primary-focus cursor-pointer"
                                  onClick={() => openExternalLink(part.trim())}
                                >
                                  {part.trim()}
                                </a>
                              );
                            }
                            return part + ': ';
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 2: 搜索设置 */}
          <div className={activeTab === 'search' ? '' : 'hidden'}>
            <div className="space-y-4">
              {/* Google Search API Key */}
              <div>
                <h3 className="text-lg font-medium mb-2">Google Custom Search JSON API</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex w-full gap-0">
                    <input
                      type={showGoogleApiKey ? "text" : "password"}
                      className="input input-bordered flex-1 rounded-r-none"
                      value={googleApiKey}
                      onChange={(e) => handleGoogleApiKeyChange(e.target.value)}
                      placeholder="Google Custom Search JSON API..."
                    />
                    <button 
                      type="button"
                      className="btn rounded-l-none"
                      onClick={handleGoogleApiKeyPaste}
                      title="点击粘贴"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                    <button 
                      type="button"
                      className="btn btn-ghost rounded-none border-l-0"
                      onClick={() => setShowGoogleApiKey(!showGoogleApiKey)}
                      title={showGoogleApiKey ? "隐藏密钥" : "显示密钥"}
                    >
                      {showGoogleApiKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Engine ID */}
              <div>
                <h3 className="text-lg font-medium mb-2">搜索引擎 ID</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex w-full gap-0">
                    <input
                      type="text"
                      className="input input-bordered flex-1"
                      value={searchEngineId}
                      onChange={(e) => handleSearchEngineIdChange(e.target.value)}
                      placeholder="请输入搜索引擎 ID..."
                    />
                  </div>
                </div>
              </div>

              {/* 最大搜索数量滑块 */}
              <div>
                <h3 className="text-lg font-medium mb-2">最大搜索结果数量</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={maxSearchResults}
                      onChange={(e) => handleMaxSearchResultsChange(e.target.value)}
                      className="range range-primary"
                      step="1"
                    />
                    <span className="text-lg font-medium min-w-[3ch]">{maxSearchResults}</span>
                  </div>
                  <div className="text-xs opacity-70">
                    设置每次搜索返回的最大结果数量（1-10），免费用户每次搜索最多返回10条结果
                  </div>
                </div>
              </div>

              {/* 帮助信息 */}
              <div className="text-xs opacity-70 space-y-2">
                <div className="settings-help-text">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    每天免费提供100次搜索查询，超出部分按每1000次查询收费$5
                  </span>
                </div>
                <div className="settings-help-text">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    获取帮助：
                    <a
                      className="text-primary hover:text-primary-focus cursor-pointer"
                      onClick={() => openExternalLink('https://developers.google.com/custom-search/v1/overview')}
                    >
                      Google Custom Search JSON API
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 3: 图片设置 */}
          {selectedProvider === 'siliconflow' && (
            <div className={activeTab === 'image' ? '' : 'hidden'}>
              <div className="space-y-4">
                {/* 生图模型选择 */}
                <div>
                  <h3 className="text-lg font-medium mb-2">生图模型</h3>
                  <select 
                    className="select select-bordered w-full"
                    value={imageModel}
                    onChange={(e) => handleImageModelChange(e.target.value)}
                  >
                    {IMAGE_MODELS.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <div className="text-xs opacity-70 mt-2">
                    选择用于图片生成的模型，使用 /image 命令时会使用此模型
                  </div>
                </div>

                {/* 图片分辨率选择 */}
                <div>
                  <h3 className="text-lg font-medium mb-2">默认分辨率</h3>
                  <select 
                    className="select select-bordered w-full"
                    value={imageSize}
                    onChange={(e) => handleImageSizeChange(e.target.value)}
                  >
                    {IMAGE_SIZES.map(size => (
                      <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                  </select>
                  <div className="text-xs opacity-70 mt-2">
                    选择图片生成的默认分辨率，也可以使用 /image 命令时通过 --size 参数指定其他分辨率
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: 其他设置 */}
          <div className={activeTab === 'other' ? '' : 'hidden'}>
            <div className="space-y-4">
              {/* 消息历史记录数量设置 */}
              <div>
                <h3 className="text-lg font-medium mb-2">消息历史记录数量</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="5"
                      max="21"
                      value={maxHistoryMessages}
                      onChange={(e) => handleMaxHistoryMessagesChange(e.target.value)}
                      className="range range-primary"
                      step="1"
                    />
                    <span className="text-lg font-medium min-w-[5ch]">
                      {maxHistoryMessages === 21 ? '全部' : maxHistoryMessages}
                    </span>
                  </div>
                  <div className="text-xs opacity-70">
                    设置每次重试时使用的历史消息数量（5-20条，或全部历史消息）
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 