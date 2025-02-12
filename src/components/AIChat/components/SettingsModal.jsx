import React, { useEffect } from 'react';
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

        {/* 模型设置 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">模型</h2>
          
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
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
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
                    📋
                  </button>
                  <button 
                    type="button"
                    className="btn rounded-none border-l-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "隐藏密钥" : "显示密钥"}
                  >
                    {showApiKey ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                <div className="flex flex-col gap-1 text-xs opacity-70">
                  <div className="settings-text">
                    支持快捷键 {navigator.platform.includes('Mac') ? '⌘+V' : 'Ctrl+V'} 粘贴
                  </div>
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
                                className="text-primary hover:text-primary-focus"
                                onClick={() => window.electron.openExternal(part.trim())}
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
      </div>
    </div>
  );
}; 