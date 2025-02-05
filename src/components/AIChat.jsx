import React, { useState, useRef, useEffect } from 'react';

export const AIChat = () => {
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const apiKeyRef = useRef(null);

  // 当设置窗口打开时，将当前的 apiKey 值设置到输入框
  useEffect(() => {
    if (showSettings && apiKeyRef.current) {
      apiKeyRef.current.value = apiKey;
    }
  }, [showSettings]);

  // 当设置窗口关闭时，更新 apiKey 状态
  const handleSettingsClose = () => {
    if (apiKeyRef.current) {
      setApiKey(apiKeyRef.current.value);
    }
    setShowSettings(false);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    // 添加新消息
    setMessages([
      ...messages,
      {
        id: Date.now(),
        content: messageInput,
        type: 'user',
        timestamp: new Date()
      }
    ]);
    setMessageInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 设置页面组件
  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
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
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="openai">OpenAI API</option>
              <option value="claude">Claude API</option>
              <option value="silliconcloud">SilliconCloud API</option>
            </select>
          </div>

          {/* API密钥 */}
          <div>
            <h3 className="text-lg font-medium mb-2">API 密钥</h3>
            <div className="flex w-full gap-0">
              <input
                ref={apiKeyRef}
                type={showApiKey ? "text" : "password"}
                className="input input-bordered flex-1 rounded-r-none"
                defaultValue={apiKey}
                placeholder="请输入API密钥..."
              />
              <button 
                type="button"
                className="btn rounded-l-none"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* 左侧边栏 */}
      <div className="w-60 bg-base-200 border-r border-base-300">
        {/* 会话列表 */}
        <div className="p-2">
          <button className="btn btn-primary w-full mb-4">
            + 新建会话
          </button>
          
          <div className="space-y-2">
            {/* 会话列表项 */}
            <div className="bg-base-100 rounded-lg p-3 cursor-pointer hover:bg-base-300">
              <h3 className="font-medium">默认会话</h3>
              <p className="text-sm opacity-70 truncate">上次聊天内容...</p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="absolute bottom-0 w-60 border-t border-base-300">
          <button 
            className="btn btn-ghost w-full normal-case"
            onClick={() => setShowSettings(true)}
          >
            ⚙️ 设置
          </button>
        </div>
      </div>

      {/* 右侧主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部标题栏 */}
        <div className="p-4 border-b border-base-300">
          <h2 className="text-xl font-semibold">当前会话</h2>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'}`}
            >
              <div className={`chat-bubble ${
                message.type === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'
              }`}>
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {/* 底部输入框 */}
        <div className="border-t border-base-300 p-4">
          <div className="flex items-center space-x-2">
            <textarea
              className="textarea textarea-bordered flex-1 resize-none"
              rows="3"
              placeholder="输入消息..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button 
              className="btn btn-circle btn-primary"
              onClick={handleSendMessage}
            >
              ➤
            </button>
          </div>
          <div className="mt-2 text-xs opacity-70">
            按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      {showSettings && <SettingsModal />}
    </div>
  );
}; 