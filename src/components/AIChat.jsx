import React, { useState, useRef, useEffect, useCallback } from 'react';
import { callModelAPI } from '../services/modelProviders';
import { formatAIChatTime } from '../utils/AIChatTimeFormat';
import { MODEL_PROVIDERS, fetchModels } from '../config/modelConfig';
import { getModelListFromCache, saveModelListToCache } from '../utils/modelListCache';
import '../styles/message.css';
import { MarkdownRenderer } from './shared/MarkdownRenderer';

// 定义本地存储的键名
const STORAGE_KEYS = {
  API_KEY: 'aichat_api_key',
  API_HOST: 'aichat_api_host',
  PROVIDER: 'aichat_provider',
  MODEL: 'aichat_model',
  MESSAGES: 'aichat_messages',  // 添加消息存储的键名
  CURRENT_CONVERSATION: 'aichat_current_conversation'  // 添加当前会话的键名
};

// 在文件顶部添加显示阶段的常量
const DISPLAY_STAGES = {
  REASONING: 'reasoning',      // 正在接收推理过程
  TYPING_REASONING: 'typing_reasoning', // 打印推理过程
  TYPING_RESULT: 'typing_result',    // 打印结果
  COMPLETED: 'completed'      // 显示最终的Markdown格式
};

// 在文件顶部添加新的状态常量
const MESSAGE_STATES = {
  IDLE: 'idle',
  THINKING: 'thinking',
  COMPLETED: 'completed',
  ERROR: 'error'
};

const ANIMATION_STATES = {
  FADE_IN: 'fade_in',
  FADE_OUT: 'fade_out',
  NONE: 'none'
};

// 估算 token 数（简单实现）
const estimateTokens = (text) => {
  return Math.ceil(text.length / 4);
}

export const AIChat = ({ 
  sendToSidebar,
  createNewConversation,
  storagePath,
  currentConversation,
  conversations,
  onConversationSelect,
  onConversationDelete,
  onConversationRename
}) => {
  // 从本地存储初始化状态
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // 初始化提供商和模型状态
  const [selectedProvider, setSelectedProvider] = useState(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
    return savedProvider && MODEL_PROVIDERS[savedProvider] ? savedProvider : 'openai';
  });

  // 初始化可用模型列表
  const [availableModels, setAvailableModels] = useState(() => {
    const provider = localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'openai';
    const cachedModels = getModelListFromCache(provider);
    return cachedModels || MODEL_PROVIDERS[provider]?.models || [];
  });

  // 初始化选中的模型
  const [selectedModel, setSelectedModel] = useState(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER);
    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
    const cachedModels = getModelListFromCache(savedProvider);
    
    if (savedModel && cachedModels?.includes(savedModel)) {
      return savedModel;
    }
    
    return MODEL_PROVIDERS[savedProvider]?.models[0] || '';
  });

  // 初始化API设置
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

  // 添加重试相关状态
  const [retryingMessageId, setRetryingMessageId] = useState(null);
  const [failedMessages, setFailedMessages] = useState(new Set());

  // 添加消息持久化的 effect
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  // 当 currentConversation 改变时加载对应的消息
  useEffect(() => {
    if (currentConversation) {
      const loadMessages = async () => {
        try {
          const loadedMessages = await window.electron.loadMessages(
            currentConversation.path,
            currentConversation.id
          );
          setMessages(loadedMessages || []);
        } catch (error) {
          console.error('加载消息失败:', error);
          setMessages([]);
        }
      };
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  // 在组件挂载时获取模型列表
  useEffect(() => {
    const loadModels = async () => {
      if (!apiKey) return;
      
      try {
        const models = await fetchModels(selectedProvider, apiKey, apiHost);
        if (models && models.length > 0) {
          setAvailableModels(models);
          saveModelListToCache(selectedProvider, models);
          
          // 如果当前选择的模型不在新的列表中，选择第一个可用的模型
          if (!models.includes(selectedModel)) {
            setSelectedModel(models[0]);
            localStorage.setItem(STORAGE_KEYS.MODEL, models[0]);
          }
        }
      } catch (error) {
        console.error('加载模型列表失败:', error);
      }
    };

    loadModels();
  }, [selectedProvider, apiKey, apiHost]);

  // 当提供商改变时更新默认值
  useEffect(() => {
    const provider = MODEL_PROVIDERS[selectedProvider];
    if (provider) {
      const newApiHost = localStorage.getItem(`${STORAGE_KEYS.API_HOST}_${selectedProvider}`) || provider.apiHost;
      setApiHost(newApiHost);
      
      // 从缓存加载模型列表
      const cachedModels = getModelListFromCache(selectedProvider);
      if (cachedModels) {
        setAvailableModels(cachedModels);
        
        // 如果当前选择的模型不在缓存列表中，选择第一个可用的模型
        if (!cachedModels.includes(selectedModel)) {
          setSelectedModel(cachedModels[0]);
          localStorage.setItem(STORAGE_KEYS.MODEL, cachedModels[0]);
        }
      } else {
        // 如果没有缓存，使用默认模型列表
        setAvailableModels(provider.models);
        setSelectedModel(provider.models[0]);
        localStorage.setItem(STORAGE_KEYS.MODEL, provider.models[0]);
      }
      
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

  // 添加重命名和删除相关状态
  const [editingFolderName, setEditingFolderName] = useState(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [deletingConversation, setDeletingConversation] = useState(null);

  // 添加右键菜单处理函数
  const handleContextMenu = (e, items) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // 移除旧的菜单（如果存在）
    const oldMenu = document.querySelector('.context-menu');
    if (oldMenu) {
      oldMenu.remove();
    }
    
    // 显示自定义右键菜单
    const menu = document.createElement('div');
    menu.className = 'menu bg-base-200 rounded-box shadow-lg absolute z-50 context-menu';
    menu.style.left = `${rect.right}px`;
    menu.style.top = `${rect.top}px`;
    
    items.forEach(item => {
      const button = document.createElement('button');
      button.className = 'btn btn-ghost btn-sm w-full text-left';
      button.textContent = item.label;
      button.onclick = () => {
        item.onClick();
        menu.remove();
      };
      menu.appendChild(button);
    });
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  };

  const handleSendMessage = async (isRetry = false, retryContent = null) => {
    if (!messageInput.trim() && !isRetry) return;
    if (!currentConversation) {
      alert('请先创建或选择一个会话');
      return;
    }
    
    // 获取要发送的内容
    const content = isRetry ? retryContent : messageInput;
    
    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      content: content,
      type: 'user',
      timestamp: new Date()
    };
    
    try {
      // 保存用户消息到txt文件
      const txtFile = await window.electron.saveMessageAsTxt(
        currentConversation.path, 
        userMessage
      );
      userMessage.txtFile = txtFile;
      
      // 更新消息列表
      const messagesWithUser = [...messages, userMessage];
      setMessages(messagesWithUser);
      
      // 保存到messages.json
      await window.electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        messagesWithUser
      );

      if (!isRetry) {
        setMessageInput('');
        // 重置输入框高度
        const textarea = document.querySelector('.aichat-input');
        if (textarea) {
          textarea.style.height = '64px';
          textarea.style.overflowY = 'hidden';
        }
      }

      // 添加 AI 消息
      const aiMessage = {
        id: Date.now() + 1,
        content: '',
        type: 'assistant',
        timestamp: new Date(),
        generating: true
      };
      
      // 设置初始状态
      setMessageStates(prev => ({
        ...prev,
        [aiMessage.id]: MESSAGE_STATES.THINKING
      }));
      
      setAnimationStates(prev => ({
        ...prev,
        [aiMessage.id]: ANIMATION_STATES.FADE_IN
      }));

      // 更新消息列表
      const messagesWithAI = [...messagesWithUser, aiMessage];
      setMessages(messagesWithAI);

      // 调用 AI API
      const response = await callModelAPI({
        provider: selectedProvider,
        apiKey,
        apiHost,
        model: selectedModel,
        messages: messagesWithUser,
        onUpdate: (update) => {
          if (update.type === 'content') {
            setMessages(prev => {
              const newMessages = [...prev];
              const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
              if (aiMessageIndex === -1) return prev;

              const updatedAiMessage = {
                ...newMessages[aiMessageIndex],
                content: update.content,
                generating: !update.done
              };

              // 根据 update.done 直接更新状态
              setMessageStates(prev => ({
                ...prev,
                [aiMessage.id]: update.done ? MESSAGE_STATES.COMPLETED : MESSAGE_STATES.THINKING
              }));

              newMessages[aiMessageIndex] = updatedAiMessage;
              return newMessages;
            });
          }
        }
      });

      // 保存 AI 回复到txt文件
      const aiTxtFile = await window.electron.saveMessageAsTxt(
        currentConversation.path,
        {
          ...aiMessage,
          content: response.content,
          fileName: `${formatAIChatTime(aiMessage.timestamp)} • 模型: ${selectedModel} • Token: ${response.usage?.total_tokens || 0}`
        }
      );

      // 更新最终消息
      const finalAiMessage = {
        ...aiMessage,
        content: response.content,
        generating: false,
        usage: response.usage,
        txtFile: aiTxtFile
      };

      // 更新消息列表
      const finalMessages = messagesWithAI.map(msg => 
        msg.id === aiMessage.id ? finalAiMessage : msg
      );
      setMessages(finalMessages);
      
      // 保存到messages.json
      await window.electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        finalMessages
      );

      // 清除失败状态
      if (isRetry) {
        setFailedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(retryingMessageId);
          return newSet;
        });
        setRetryingMessageId(null);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessageStates(prev => ({
        ...prev,
        [aiMessage.id]: MESSAGE_STATES.ERROR
      }));
      alert('发送消息失败: ' + error.message);
    }
  };

  // 添加重试处理函数
  const handleRetry = (messageId, content) => {
    // 找到要重试的 AI 消息
    const aiMessageIndex = messages.findIndex(msg => msg.id === messageId);
    if (aiMessageIndex <= 0) return; // 确保不是第一条消息
    
    // 获取 AI 消息之前的用户消息
    const userMessage = messages[aiMessageIndex - 1];
    if (!userMessage || userMessage.type !== 'user') return;
    
    setRetryingMessageId(messageId);
    handleSendMessage(true, userMessage.content);
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

  // 修改删除消息的处理函数
  const handleDeleteMessage = (messageId) => {
    const newMessages = messages.filter(m => m.id !== messageId);
    setMessages(newMessages);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(newMessages));
  };

  // 添加清空聊天记录的函数
  const handleClearMessages = () => {
    setMessages([]);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, '[]');
  };

  // 修改设置页面组件
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

  // 创建新会话的函数
  const createNewConversationLocal = async () => {
    if (!storagePath) {
      alert('请先在设置中选择存储文件夹');
      return;
    }

    try {
      // 生成新会话ID和名称
      const newId = Date.now().toString();
      const conversationCount = conversations.length;
      const newName = `AIChat${(conversationCount + 1).toString().padStart(2, '0')}`;

      // 在选定的存储路径下创建新的会话文件夹
      const folderPath = window.electron.path.join(storagePath, newName);
      const result = await window.electron.createAIChatFolder(folderPath);
      
      // 构造新会话对象
      const newConversation = {
        id: newId,
        name: newName,
        timestamp: new Date().toISOString(),
        path: result.path,
        messages: []
      };
      
      // 调用父组件的处理函数
      createNewConversation(newConversation);
    } catch (error) {
      console.error('创建新会话失败:', error);
      alert('创建新会话失败: ' + error.message);
    }
  };

  // 将函数添加到全局对象中
  useEffect(() => {
    window.aichat = {
      createNewConversation: createNewConversationLocal
    };
    return () => {
      delete window.aichat;
    };
  }, [storagePath, conversations]);

  // 在AIChat组件中添加消息状态
  const [messageStates, setMessageStates] = useState({}); // 跟踪每条消息的显示阶段
  const [collapsedMessages, setCollapsedMessages] = useState(new Set()); // 跟踪消息折叠状态

  // 添加折叠状态管理
  const [collapsedReasoning, setCollapsedReasoning] = useState({});

  // 添加动画状态管理
  const [animationStates, setAnimationStates] = useState({});

  // 在组件加载时为现有消息设置状态
  useEffect(() => {
    const initialStates = {};
    messages.forEach(message => {
      if (message.type === 'assistant' && !messageStates[message.id]) {
        initialStates[message.id] = MESSAGE_STATES.COMPLETED;
      }
    });
    if (Object.keys(initialStates).length > 0) {
      setMessageStates(prev => ({
        ...prev,
        ...initialStates
      }));
    }
  }, [messages]);

  return (
    <div className="flex h-full w-full">
      <style>
        {`
          .ai-chat-message-actions {
            position: absolute;
            bottom: -24px;
            left: 4px;
            display: flex;
            gap: 2px;
            opacity: 0;
            transition: opacity 0.2s;
            background-color: var(--b1);
            padding: 4px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 10;
          }
          
          .ai-chat-group {
            margin-bottom: 32px;
            position: relative;
          }
          
          .ai-chat-group:hover .ai-chat-message-actions {
            opacity: 1;
          }
          
          .ai-chat-message-actions button {
            background-color: var(--b1);
            border: 1px solid var(--b3);
            transition: all 0.2s;
          }
          
          .ai-chat-message-actions button:hover {
            transform: scale(1.05);
            background-color: var(--b2);
          }

          /* 调整消息气泡的样式 */
          .chat-bubble {
            padding: 0.75rem 1rem;
            overflow: visible;
            line-height: 1.6;
          }

          /* 推理过程气泡的特殊样式 */
          .chat-bubble.chat-bubble-info {
            background-color: var(--b2);
            border: 1px solid var(--b3);
            font-size: 0.9em;
          }

          .chat-bubble.chat-bubble-info .prose {
            font-size: 0.9em;
            color: var(--bc);
          }

          /* 打字机效果 */
          .typing-effect {
            border-right: 2px solid var(--bc);
            animation: cursor-blink 0.8s step-end infinite;
          }

          @keyframes cursor-blink {
            from, to {
              border-color: transparent;
            }
            50% {
              border-color: var(--bc);
            }
          }

          .chat-bubble .prose {
            overflow: visible;
            margin: 0;
          }

          .chat-bubble p {
            margin: 0;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-break: break-word;
          }

          .chat-bubble > p:first-child {
            margin-top: 0;
          }
          
          .chat-bubble > p:last-child {
            margin-bottom: 0;
          }

          .chat-bubble .whitespace-pre-wrap {
            white-space: pre-wrap;
            overflow: visible;
            margin: 0;
          }

          /* 思考中动画样式 */
          .loading-dots {
            display: inline-flex;
            align-items: center;
            height: 1.5em;
          }

          .loading-dots::after {
            content: '';
            width: 0.5em;
            height: 0.5em;
            border-radius: 50%;
            animation: dots 1s infinite steps(1);
            margin-left: 0.25em;
          }

          @keyframes dots {
            25% { content: '.'; }
            50% { content: '..'; }
            75% { content: '...'; }
            100% { content: ''; }
          }
        `}
      </style>

      {/* 右侧主聊天区域 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-100">
          <h2 className="text-xl font-semibold">{currentConversation?.name || '当前会话'}</h2>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => setShowSettings(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* 消息列表容器 */}
        <div className="flex-1 overflow-y-auto p-4 bg-base-100">
          <div className="space-y-4 max-w-[1200px] mx-auto">
            {messages.map(message => (
              <div
                key={message.id}
                className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container`}
              >
                {/* 用户消息 */}
                {message.type === 'user' && (
                  <>
                    <div className="chat-header opacity-70">
                      <span className="text-xs">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="chat-bubble chat-bubble-primary">
                      <div className="prose">
                        {message.content}
                      </div>
                    </div>
                  </>
                )}

                {/* AI助手消息 */}
                {message.type === 'assistant' && (
                  <div className={`chat-group ${
                    animationStates[message.id] || ANIMATION_STATES.NONE
                  }`}>
                    {/* 消息头部 */}
                    <div className="chat-header opacity-70 mb-1">
                      <span className="text-xs">
                        {new Date(message.timestamp).toLocaleString()}
                        {' • '}模型: {selectedModel}
                        {message.usage && ` • Token: ${message.usage.total_tokens}`}
                      </span>
                    </div>

                    {/* 消息内容 */}
                    <div className={`chat-bubble ${
                      messageStates[message.id] === MESSAGE_STATES.ERROR ? 'chat-bubble-error' : 'chat-bubble-secondary'
                    }`}>
                      <div className="response-content">
                        {messageStates[message.id] === MESSAGE_STATES.THINKING ? (
                          <div className="flex items-center gap-2">
                            <span>思考中</span>
                            <span className="loading loading-dots loading-sm"></span>
                          </div>
                        ) : messageStates[message.id] === MESSAGE_STATES.COMPLETED ? (
                          <MarkdownRenderer
                            content={message.content || ''}
                            isCompact={false}
                            onCopyCode={(code) => {
                              console.log('Code copied:', code);
                            }}
                            onLinkClick={(href) => {
                              window.electron.openExternal(href);
                            }}
                          />
                        ) : null}
                      </div>
                    </div>

                    {/* 消息操作按钮 */}
                    {messageStates[message.id] === MESSAGE_STATES.COMPLETED && (
                      <div className="message-actions">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleRetry(message.id, message.content)}
                        >
                          重试
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          删除
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(message.content);
                          }}
                        >
                          复制
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部输入框 */}
        <div className="border-t border-base-300 p-4 bg-base-100">
          <div className="relative max-w-[750px] mx-auto">
            <textarea
              className="textarea textarea-bordered w-full min-h-[64px] max-h-[480px] rounded-3xl resize-none pr-24 bg-base-100 aichat-input"
              placeholder="输入消息..."
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
                if (e.target.scrollHeight > 480) {
                  e.target.style.overflowY = 'scroll';
                } else {
                  e.target.style.overflowY = 'hidden';
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                  e.target.style.height = '64px';
                  e.target.style.overflowY = 'hidden';
                }
              }}
              onKeyDown={handleKeyDown}
              rows="2"
            />
            <div className="absolute right-4 bottom-3 flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <button 
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => handleSendMessage()}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      {showSettings && <SettingsModal />}

    </div>
  );
} 