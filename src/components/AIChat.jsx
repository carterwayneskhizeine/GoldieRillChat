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

// 添加 API 密钥存储函数
const saveApiKey = (provider, key) => {
  localStorage.setItem(`${STORAGE_KEYS.API_KEY}_${provider}`, key);
};

// 添加 API 密钥获取函数
const getApiKey = (provider) => {
  return localStorage.getItem(`${STORAGE_KEYS.API_KEY}_${provider}`) || '';
};

// 在文件顶部添加辅助函数
const getRelativeOffsetTop = (child, parent) => {
  let offset = 0;
  while (child && child !== parent) {
    offset += child.offsetTop;
    child = child.offsetParent;
  }
  return offset;
};

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
  // 添加折叠消息状态
  const [collapsedMessages, setCollapsedMessages] = useState(new Set());
  
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
  const [apiKey, setApiKey] = useState(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'openai';
    return getApiKey(savedProvider);
  });
  
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

  // 添加编辑相关状态
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');

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
          
          // 确保每个 AI 消息都有必要的历史记录字段
          const processedMessages = loadedMessages?.map(msg => {
            if (msg.type === 'assistant') {
              return {
                ...msg,
                history: msg.history || [],
                currentHistoryIndex: msg.currentHistoryIndex || 0,
                currentContent: msg.currentContent || msg.content
              };
            }
            return msg;
          }) || [];
          
          setMessages(processedMessages);
          
          // 初始化消息状态
          const initialStates = {};
          processedMessages.forEach(message => {
            if (message.type === 'assistant') {
              initialStates[message.id] = message.error ? 
                MESSAGE_STATES.ERROR : 
                MESSAGE_STATES.COMPLETED;
            }
          });
          setMessageStates(prev => ({
            ...prev,
            ...initialStates
          }));
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
      
      // 加载对应提供商的 API 密钥
      const savedApiKey = getApiKey(selectedProvider);
      setApiKey(savedApiKey);
      if (apiKeyRef.current) {
        apiKeyRef.current.value = savedApiKey;
      }
      
      // 从缓存加载模型列表
      const cachedModels = getModelListFromCache(selectedProvider);
      if (cachedModels) {
        setAvailableModels(cachedModels);
        if (!cachedModels.includes(selectedModel)) {
          setSelectedModel(cachedModels[0]);
          localStorage.setItem(STORAGE_KEYS.MODEL, cachedModels[0]);
        }
      } else {
        setAvailableModels(provider.models);
        setSelectedModel(provider.models[0]);
        localStorage.setItem(STORAGE_KEYS.MODEL, provider.models[0]);
      }
      
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
      // 保存到对应提供商的存储中
      saveApiKey(selectedProvider, newApiKey);
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

    // 创建 AI 消息对象（移到 try 块外面）
    const aiMessage = {
      id: Date.now() + 1,
      content: '',
      type: 'assistant',
      timestamp: new Date(),
      generating: true
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
        txtFile: aiTxtFile,
        model: selectedModel,
        tokens: response.usage?.total_tokens || 0
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
      
      // 更新消息列表，将错误信息添加到 AI 回复中
      setMessages(prev => {
        const newMessages = [...prev];
        const aiMessageIndex = newMessages.findIndex(msg => msg.generating);
        if (aiMessageIndex !== -1) {
          newMessages[aiMessageIndex] = {
            ...newMessages[aiMessageIndex],
            content: `**错误信息**:\n\`\`\`\n${error.message}\n\`\`\``,
            generating: false,
            error: true
          };
        } else {
          // 如果找不到正在生成的消息，添加一个新的错误消息
          newMessages.push({
            ...aiMessage,
            content: `**错误信息**:\n\`\`\`\n${error.message}\n\`\`\``,
            generating: false,
            error: true
          });
        }
        return newMessages;
      });

      // 更新消息状态
      setMessageStates(prev => ({
        ...prev,
        [aiMessage.id]: MESSAGE_STATES.ERROR
      }));
    }
  };

  // 修改 handleRetry 函数
  const handleRetry = async (messageId) => {
    const aiMessage = messages.find(msg => msg.id === messageId);
    if (!aiMessage || aiMessage.type !== 'assistant') return;

    // 保存当前回复到历史记录
    setMessages(prev => {
      const newMessages = [...prev];
      const index = newMessages.findIndex(msg => msg.id === messageId);
      if (index === -1) return prev;

      const currentMessage = newMessages[index];
      const history = currentMessage.history || [];
      
      // 只有当当前内容不为空且不是错误消息，且与最后一条历史记录不同时才保存
      if (currentMessage.content && 
          !currentMessage.error && 
          (!history.length || history[history.length - 1].content !== currentMessage.content)) {
        history.push({
          content: currentMessage.content,
          timestamp: new Date(),
          model: currentMessage.model,
          tokens: currentMessage.tokens
        });
      }

      newMessages[index] = {
        ...currentMessage,
        history: history,
        currentHistoryIndex: history.length, // 设置为最新的索引
        currentContent: null // 重置当前内容
      };
      return newMessages;
    });

    // 设置消息状态为思考中
    setMessageStates(prev => ({
      ...prev,
      [messageId]: MESSAGE_STATES.THINKING
    }));

    try {
      // 获取用户消息
      const userMessageIndex = messages.findIndex(msg => msg.id === messageId) - 1;
      if (userMessageIndex < 0) return;
      const userMessage = messages[userMessageIndex];

      // 调用 AI API
      const response = await callModelAPI({
        provider: selectedProvider,
        apiKey,
        apiHost,
        model: selectedModel,
        messages: messages.slice(0, userMessageIndex + 1),
        onUpdate: (update) => {
          if (update.type === 'content') {
            setMessages(prev => {
              const newMessages = [...prev];
              const index = newMessages.findIndex(msg => msg.id === messageId);
              if (index === -1) return prev;

              // 更新消息内容
              newMessages[index] = {
                ...newMessages[index],
                content: update.content,
                generating: !update.done
              };

              return newMessages;
            });
          }
        }
      });

      // 更新最终消息
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(msg => msg.id === messageId);
        if (index === -1) return prev;

        const currentMessage = newMessages[index];
        newMessages[index] = {
          ...currentMessage,
          content: response.content,
          generating: false,
          usage: response.usage,
          model: selectedModel,
          tokens: response.usage?.total_tokens || 0,
          currentHistoryIndex: currentMessage.history.length // 设置为最新的索引
        };

        return newMessages;
      });

      // 更新消息状态
      setMessageStates(prev => ({
        ...prev,
        [messageId]: MESSAGE_STATES.COMPLETED
      }));

      // 保存到 messages.json
      await window.electron.saveMessages(
        currentConversation.path,
        currentConversation.id,
        messages
      );

    } catch (error) {
      console.error('重试失败:', error);
      
      // 更新消息列表，将错误信息添加到 AI 回复中
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(msg => msg.id === messageId);
        if (index === -1) return prev;

        newMessages[index] = {
          ...newMessages[index],
          content: `**错误信息**:\n\`\`\`\n${error.message}\n\`\`\``,
          generating: false,
          error: true,
          currentHistoryIndex: newMessages[index].history.length // 保持在最新的索引
        };
        return newMessages;
      });

      // 更新消息状态
      setMessageStates(prev => ({
        ...prev,
        [messageId]: MESSAGE_STATES.ERROR
      }));
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

  // 修改删除消息的处理函数
  const handleDeleteMessage = async (messageId) => {
    try {
      // 找到要删除的消息
      const message = messages.find(msg => msg.id === messageId);
      if (!message) return;

      // 如果消息有关联的文件，删除它们
      if (message.txtFile) {
        await window.electron.removeFile(message.txtFile.path);
      }
      if (message.files?.length) {
        for (const file of message.files) {
          await window.electron.removeFile(file.path);
        }
      }

      // 从消息列表中移除消息
    const newMessages = messages.filter(m => m.id !== messageId);
    setMessages(newMessages);

      // 保存更新后的消息列表到 messages.json
      if (currentConversation) {
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          newMessages
        );
      }
    } catch (error) {
      console.error('删除消息失败:', error);
      alert('删除消息失败: ' + error.message);
    }
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
              <div className="flex flex-col gap-2">
              <div className="flex w-full gap-0">
                <input
                  ref={apiKeyRef}
                  type={showApiKey ? "text" : "password"}
                  className="input input-bordered flex-1 rounded-r-none"
                  defaultValue={apiKey}
                    placeholder={`请输入 ${MODEL_PROVIDERS[selectedProvider].name} API 密钥...`}
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
                  {MODEL_PROVIDERS[selectedProvider].needsApiKey && (
                    <div className="settings-help-text text-warning">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>
                        此提供商需要 API 密钥才能使用
                      </span>
          </div>
                  )}
                  {MODEL_PROVIDERS[selectedProvider].apiKeyHelp && (
                    <div className="settings-help-text mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {MODEL_PROVIDERS[selectedProvider].apiKeyHelp.split(': ').map((part, index, array) => {
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

  // 创建新会话的函数
  const createNewConversationLocal = async () => {
    if (!storagePath) {
      alert('请先在设置中选择存储文件夹');
      return;
    }

    try {
      // 生成新会话ID和名称
      const newId = Date.now().toString();
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // 获取年份后两位
      const month = now.toLocaleString('en-US', { month: 'short' }); // 获取月份英文缩写
      const day = now.getDate().toString().padStart(2, '0'); // 获取日期，补零
      const hours = now.getHours().toString().padStart(2, '0'); // 获取小时，补零
      const minutes = now.getMinutes().toString().padStart(2, '0'); // 获取分钟，补零
      const seconds = now.getSeconds().toString().padStart(2, '0'); // 获取秒数，补零
      const newName = `${day}${month}${year}_${hours}${minutes}${seconds}`;

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

  // 修改历史导航函数
  const handleHistoryNavigation = (messageId, direction) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const index = newMessages.findIndex(msg => msg.id === messageId);
      if (index === -1) return prev;

      const message = newMessages[index];
      if (!message.history?.length) return prev;

      let newIndex;
      if (direction === 'prev') {
        // 如果当前是最新回复，先保存它
        if (message.currentHistoryIndex === message.history.length) {
          message.currentContent = message.content;
        }
        newIndex = Math.max(0, (message.currentHistoryIndex || message.history.length) - 1);
      } else {
        newIndex = Math.min(message.history.length, (message.currentHistoryIndex || 0) + 1);
      }

      // 如果是最后一个索引，显示当前回复
      if (newIndex === message.history.length) {
        newMessages[index] = {
          ...message,
          content: message.currentContent || message.content,
          currentHistoryIndex: newIndex
        };
      } else {
        // 显示历史回复
        const historyItem = message.history[newIndex];
        newMessages[index] = {
          ...message,
          content: historyItem.content,
          currentHistoryIndex: newIndex
        };
      }

      return newMessages;
    });

    // 保存到 messages.json
    window.electron.saveMessages(
      currentConversation.path,
      currentConversation.id,
      messages
    ).catch(error => {
      console.error('保存消息失败:', error);
    });
  };

  // 添加编辑处理函数
  const handleEditStart = (message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleEditSave = async (messageId) => {
    try {
      // 找到要编辑的消息
      const updatedMessages = messages.map(msg => 
        msg.id === messageId ? { ...msg, content: editContent } : msg
      );

      // 更新消息列表
      setMessages(updatedMessages);

      // 保存到文件
      if (currentConversation) {
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          updatedMessages
        );
      }

      // 重置编辑状态
      setEditingMessageId(null);
      setEditContent('');
    } catch (error) {
      console.error('保存编辑失败:', error);
      alert('保存编辑失败: ' + error.message);
    }
  };

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

          /* 设置面板文字样式 */
          .settings-text {
            user-select: text;
            cursor: text;
          }
          
          .settings-text a {
            color: var(--p);
            text-decoration: underline;
            cursor: pointer;
          }

          .settings-help-text {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            user-select: text;
            cursor: text;
          }

          .settings-help-text svg {
            flex-shrink: 0;
            margin-top: 2px;
          }

          .settings-help-text span {
            flex: 1;
          }

          /* 消息容器基础样式 */
          .message-container {
            position: relative;
            padding-bottom: 32px;
          }

          .message-content {
            position: relative;
          }

          /* 消息内容样式 */
          .chat-bubble .prose {
            color: inherit;
          }

          /* 消息操作按钮基础样式 */
          .message-actions {
            position: absolute;
            bottom: 8px;
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

          /* AI消息操作按钮位置 */
          .chat-start .message-actions {
            left: 4px;
          }

          /* 用户消息操作按钮位置 */
          .chat-end .message-actions {
            right: 4px;
            flex-direction: row-reverse;
          }

          .message-container:hover .message-actions {
            opacity: 1;
          }

          /* 消息气泡基础样式 */
          .chat-bubble {
            position: relative;
            max-width: 80%;
            padding: 1rem;
            border-radius: 1rem;
            margin: 0.5rem;
          }

          /* AI消息气泡样式 */
          .chat-start .chat-bubble {
            background-color: var(--b2) !important;
            color: var(--bc) !important;
            border-bottom-left-radius: 0.25rem;
            margin-right: auto;
          }

          /* 用户消息气泡样式 */
          .chat-end .chat-bubble {
            background-color: var(--primary) !important;
            color: var(--primary-content) !important;
            border-bottom-right-radius: 0.25rem;
            margin-left: auto;
          }

          /* 操作按钮样式 */
          .message-actions button {
            background-color: var(--b1);
            border: 1px solid var(--b3);
            transition: all 0.2s;
            padding: 0 8px;
            height: 24px;
            min-height: 24px;
            font-size: 12px;
          }

          .message-actions button:hover {
            transform: scale(1.05);
            background-color: var(--b2);
          }

          #ai-chat-messages-main {
            position: relative;
            overflow-y: auto;
            height: 100%;
            scroll-behavior: smooth;
          }
          
          .message-container {
            position: relative;
            scroll-margin-top: 20px;
          }
          
          .message-collapsed {
            max-height: 100px !important;
            overflow: hidden;
          }
          
          .response-content {
            transition: max-height 0.3s ease-out;
          }

          .collapse-button {
            position: sticky;
            top: 2px;
            float: right;
            margin-left: 8px;
            margin-right: 0px;
            z-index: 100;
            pointer-events: all;
          }
          
          .collapse-button button {
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
            background-color: var(--b1);
            border: 1px solid var(--b3);
          }
          
          .collapse-button button:hover {
            transform: scale(1.1);
            background-color: var(--b2);
          }
          
          .mask-bottom {
            mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
          }
        `}
      </style>

      {/* 右侧主聊天区域 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 顶部标题栏 */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-100">
          {/* 左侧模型选择 */}
          <div className="flex-none">
            <select 
              className="select select-bordered select-xs w-[300px]"
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                localStorage.setItem(STORAGE_KEYS.MODEL, e.target.value);
              }}
            >
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {/* 中间对话名称 */}
          <h2 className="text-xs opacity-70 flex-1 text-center">
            {currentConversation?.name || '当前会话'}
          </h2>

          {/* 右侧设置按钮 */}
          <button 
            className="btn btn-ghost btn-sm btn-circle flex-none"
            onClick={() => setShowSettings(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* 消息列表容器 */}
        <div className="flex-1 overflow-hidden bg-base-100">
          <div 
            id="ai-chat-messages-main"
            className="h-full overflow-y-auto" 
            style={{ 
              paddingBottom: '145px',
              isolation: 'isolate',
              position: 'relative',
              scrollBehavior: 'smooth'  // 添加平滑滚动
            }}
          >
            <div className="space-y-4 max-w-[1200px] mx-auto p-4">
            {messages.map(message => (
              <div
                key={message.id}
                  className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container`}
                  data-message-id={message.id}
              >
                  {/* 消息头部 */}
                <div className="chat-header opacity-70">
                  <span className="text-xs">
                    {new Date(message.timestamp).toLocaleString()}
                    {message.type === 'assistant' && (
                      <>
                          {' • '}模型: {message.model || selectedModel}
                          {message.tokens ? ` • Token: ${message.tokens}` : message.usage?.total_tokens ? ` • Token: ${message.usage.total_tokens}` : ''}
                          {message.error && ' • 错误'}
                      </>
                    )}
                  </span>
                </div>

                  {/* 消息内容 */}
                  <div className={`chat-bubble ${
                    message.type === 'user' ? 'chat-bubble-primary' : 
                    message.error ? 'chat-bubble-error' : 'chat-bubble-secondary'
                  }`}>
                    <div className="message-content">
                      {/* 折叠按钮 */}
                      {message.content && (message.content.split('\n').length > 6 || message.content.length > 300) && (
                        <div className="collapse-button">
                          <button 
                            className="btn btn-xs btn-ghost btn-circle bg-base-100 hover:bg-base-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isCollapsed = collapsedMessages.has(message.id);
                              const newSet = new Set([...collapsedMessages]);
                              // 获取 AIChat 消息容器
                              const messageElement = document.querySelector('#ai-chat-messages-main')?.querySelector(`[data-message-id="${message.id}"]`);
                              
                              if (isCollapsed) {
                                // 展开消息
                                newSet.delete(message.id);
                                setCollapsedMessages(newSet);
                                // 等待状态更新后滚动到顶部
                                setTimeout(() => {
                                  if (messageElement) {
                                    const container = document.querySelector('#ai-chat-messages-main');
                                    if (container) {
                                      const elementTop = messageElement.offsetTop;
                                      container.scrollTo({
                                        top: elementTop,
                                        behavior: 'smooth'
                                      });
                                    }
                                  }
                                }, 100);
                              } else {
                                // 折叠消息
                                newSet.add(message.id);
                                setCollapsedMessages(newSet);
                                // 等待状态更新后滚动到中间
                                setTimeout(() => {
                                  if (messageElement) {
                                    const container = document.querySelector('#ai-chat-messages-main');
                                    if (container) {
                                      const elementTop = messageElement.offsetTop;
                                      const elementHeight = messageElement.offsetHeight;
                                      const containerHeight = container.clientHeight;
                                      const scrollTop = elementTop - (containerHeight - elementHeight) / 2;
                                      container.scrollTo({
                                        top: scrollTop,
                                        behavior: 'smooth'
                                      });
                                    }
                                  }
                                }, 100);
                              }
                            }}
                          >
                            {collapsedMessages.has(message.id) ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}

                      <div className={`response-content ${collapsedMessages.has(message.id) ? 'message-collapsed' : ''}`}>
                        {editingMessageId === message.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="textarea textarea-bordered w-full min-h-[100px]"
                              placeholder="编辑消息内容..."
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn btn-sm"
                                onClick={() => handleEditCancel()}
                              >
                                取消
                              </button>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEditSave(message.id)}
                              >
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`prose max-w-none ${
                            collapsedMessages.has(message.id) ? 'max-h-[100px] overflow-hidden mask-bottom' : ''
                          }`}>
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
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                {/* 消息操作按钮 */}
                  {!editingMessageId && (
                    <div className="message-actions">
                    <button
                      className="btn btn-ghost btn-xs"
                        onClick={() => handleEditStart(message)}
                      >
                        编辑
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
                      {message.type === 'assistant' && (
                    <button
                      className="btn btn-ghost btn-xs"
                          onClick={() => handleRetry(message.id)}
                        >
                          重试
                    </button>
                      )}
                      {message.history?.length > 0 && (
                        <>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleHistoryNavigation(message.id, 'prev')}
                            disabled={!message.currentHistoryIndex}
                          >
                            上一个
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleHistoryNavigation(message.id, 'next')}
                            disabled={message.currentHistoryIndex === message.history.length}
                          >
                            下一个
                          </button>
                          <span className="text-xs opacity-70">
                            {message.currentHistoryIndex === message.history.length ? 
                              '当前' : 
                              `${message.currentHistoryIndex + 1}/${message.history.length + 1}`}
                          </span>
                        </>
                      )}
                  </div>
                )}
              </div>
            ))}
            </div>
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