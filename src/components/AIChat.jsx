import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { a11yDark, atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { callModelAPI } from '../services/modelProviders';

// 导入 KaTeX 样式
import 'katex/dist/katex.min.css'

// 定义本地存储的键名
const STORAGE_KEYS = {
  API_KEY: 'aichat_api_key',
  API_HOST: 'aichat_api_host',
  PROVIDER: 'aichat_provider',
  MODEL: 'aichat_model'
};

// 定义支持的模型提供方
const MODEL_PROVIDERS = {
  openai: {
    name: 'OpenAI API',
    models: ['gpt-3.5-turbo', 'gpt-4'],
    needsApiKey: true,
    apiHost: 'https://api.openai.com'
  },
  claude: {
    name: 'Claude API',
    models: ['claude-2.1', 'claude-instant-1.2'],
    needsApiKey: true,
    apiHost: 'https://api.anthropic.com'
  },
  siliconflow: {
    name: 'SiliconFlow API',
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-14B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'ChatGLM/ChatGLM3-6B',
      'ChatGLM/ChatGLM2-6B',
      'ChatGLM/ChatGLM-6B'
    ],
    needsApiKey: true,
    apiHost: 'https://api.siliconflow.cn'
  }
};

// 代码块组件
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  
  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }

  return (
    <div className="relative">
      <div className="flex justify-between items-center bg-base-300 px-4 py-1 rounded-t-lg">
        <span className="text-sm opacity-50">{language}</span>
        <button 
          className="btn btn-ghost btn-xs"
          onClick={() => {
            navigator.clipboard.writeText(String(children))
          }}
        >
          复制
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={atomDark}
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  )
}

export const AIChat = () => {
  // 从本地存储初始化状态
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
    return savedProvider && MODEL_PROVIDERS[savedProvider] ? savedProvider : 'openai';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
    if (savedProvider && MODEL_PROVIDERS[savedProvider] && savedModel) {
      return MODEL_PROVIDERS[savedProvider].models.includes(savedModel) 
        ? savedModel 
        : MODEL_PROVIDERS[savedProvider].models[0];
    }
    return MODEL_PROVIDERS.openai.models[0];
  });
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.API_KEY) || ''
  );
  const [apiHost, setApiHost] = useState(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
    const savedHost = localStorage.getItem(STORAGE_KEYS.API_HOST);
    return savedHost || (MODEL_PROVIDERS[savedProvider]?.apiHost || MODEL_PROVIDERS.openai.apiHost);
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const apiKeyRef = useRef(null);

  // 当模型提供方改变时更新默认值和保存到本地存储
  useEffect(() => {
    const provider = MODEL_PROVIDERS[selectedProvider];
    if (provider) {
      const newApiHost = localStorage.getItem(`${STORAGE_KEYS.API_HOST}_${selectedProvider}`) || provider.apiHost;
      setApiHost(newApiHost);
      setSelectedModel(prev => {
        const savedModel = localStorage.getItem(`${STORAGE_KEYS.MODEL}_${selectedProvider}`);
        return savedModel && provider.models.includes(savedModel) ? savedModel : provider.models[0];
      });
      
      // 保存到本地存储
      localStorage.setItem(STORAGE_KEYS.PROVIDER, selectedProvider);
      localStorage.setItem(STORAGE_KEYS.API_HOST, newApiHost);
    }
  }, [selectedProvider]);

  // 当设置窗口打开时，将当前的 apiKey 值设置到输入框
  useEffect(() => {
    if (showSettings && apiKeyRef.current) {
      apiKeyRef.current.value = apiKey;
    }
  }, [showSettings]);

  // 当设置窗口关闭时，更新 apiKey 状态并保存到本地存储
  const handleSettingsClose = () => {
    if (apiKeyRef.current) {
      const newApiKey = apiKeyRef.current.value;
      setApiKey(newApiKey);
      localStorage.setItem(STORAGE_KEYS.API_KEY, newApiKey);
    }
    setShowSettings(false);
  };

  // 更新 API Host 时保存到本地存储
  const handleApiHostChange = (value) => {
    setApiHost(value);
    localStorage.setItem(STORAGE_KEYS.API_HOST, value);
    localStorage.setItem(`${STORAGE_KEYS.API_HOST}_${selectedProvider}`, value);
  };

  // 更新模型时保存到本地存储
  const handleModelChange = (value) => {
    setSelectedModel(value);
    localStorage.setItem(STORAGE_KEYS.MODEL, value);
    localStorage.setItem(`${STORAGE_KEYS.MODEL}_${selectedProvider}`, value);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      content: messageInput,
      type: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessageInput('');

    try {
      // 添加 AI 正在输入的提示
      const loadingMessage = {
        id: Date.now() + 1,
        content: '正在思考...',
        type: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, loadingMessage]);

      // 调用 AI API
      const response = await callModelAPI({
        provider: selectedProvider,
        apiKey,
        apiHost,
        model: selectedModel,
        messages: [...messages, userMessage]
      });

      // 更新 AI 回复
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          id: Date.now() + 1,
          content: response.content,
          type: 'assistant',
          timestamp: new Date(),
          usage: response.usage
        }
      ]);
    } catch (error) {
      console.error('发送消息失败:', error);
      // 显示错误消息
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          id: Date.now() + 1,
          content: `发送消息失败: ${error.message}`,
          type: 'assistant',
          timestamp: new Date()
        }
      ]);
    }
  };

  // 添加粘贴处理函数
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (apiKeyRef.current) {
        apiKeyRef.current.value = text;
      }
    } catch (error) {
      console.error('粘贴失败:', error);
    }
  };

  // 添加键盘快捷键处理函数
  const handleKeyDown = (e) => {
    // 检查是否是粘贴快捷键 (Ctrl+V 或 Command+V)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      handlePaste();
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
              {MODEL_PROVIDERS[selectedProvider]?.models.map(model => (
                <option key={model} value={model}>{model}</option>
              )) || <option value="">请先选择模型提供方</option>}
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
              <div className="flex w-full gap-0">
                <input
                  ref={apiKeyRef}
                  type={showApiKey ? "text" : "password"}
                  className="input input-bordered flex-1 rounded-r-none"
                  defaultValue={apiKey}
                  placeholder="请输入API密钥..."
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
              <div className="mt-1 text-xs opacity-70">
                支持快捷键 {navigator.platform.includes('Mac') ? '⌘+V' : 'Ctrl+V'} 粘贴
              </div>
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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code: CodeBlock,
                    // 自定义链接在新窗口打开
                    a: ({node, ...props}) => (
                      <a target="_blank" rel="noopener noreferrer" {...props} />
                    )
                  }}
                >
                  {message.content}
                </ReactMarkdown>
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