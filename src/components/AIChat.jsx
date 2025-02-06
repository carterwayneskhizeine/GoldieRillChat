import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { a11yDark, atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { callModelAPI } from '../services/modelProviders';
import { formatAIChatTime } from '../utils/AIChatTimeFormat'

// 导入 KaTeX 样式
import 'katex/dist/katex.min.css'

// 定义本地存储的键名
const STORAGE_KEYS = {
  API_KEY: 'aichat_api_key',
  API_HOST: 'aichat_api_host',
  PROVIDER: 'aichat_provider',
  MODEL: 'aichat_model',
  MESSAGES: 'aichat_messages',  // 添加消息存储的键名
  CURRENT_CONVERSATION: 'aichat_current_conversation'  // 添加当前会话的键名
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
      <code 
        className={className}
        style={{
          backgroundColor: 'var(--b2)',
          padding: '2px 4px',
          margin: '0 4px',
          borderRadius: '4px',
          border: '1px solid var(--b3)',
        }}
        {...props}
      >
        {children}
      </code>
    )
  }

  return (
    <div className="relative">
      <div className="flex justify-between items-center bg-base-300 px-4 py-1 rounded-t-lg">
        <span className="text-sm opacity-50">{'<' + language.toUpperCase() + '>'}</span>
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
          borderBottomLeftRadius: '0.3rem',
          borderBottomRightRadius: '0.3rem',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  )
}

// 自定义链接组件
const CustomLink = ({ node, ...props }) => (
  <a
    {...props}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
  />
)

// 估算 token 数（简单实现）
const estimateTokens = (text) => {
  return Math.ceil(text.length / 4);
}

export const AIChat = ({ sendToSidebar }) => {
  // 从本地存储初始化状态
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
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

  // 添加重试相关状态
  const [retryingMessageId, setRetryingMessageId] = useState(null);
  const [failedMessages, setFailedMessages] = useState(new Set());

  // 添加存储路径状态
  const [storagePath, setStoragePath] = useState(() => 
    localStorage.getItem('aichat_storage_path') || ''
  );

  // 添加选择存储路径的处理函数
  const handleSelectStoragePath = async () => {
    try {
      const result = await window.electron.selectFolder();
      if (result) {
        setStoragePath(result);
        localStorage.setItem('aichat_storage_path', result);
      }
    } catch (error) {
      console.error('选择存储路径失败:', error);
      alert('选择存储路径失败');
    }
  };

  // 添加消息持久化的 effect
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

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

  const [conversations, setConversations] = useState(() => {
    const savedConversations = localStorage.getItem('aichat_conversations');
    return savedConversations ? JSON.parse(savedConversations) : [];
  });

  const [currentConversation, setCurrentConversation] = useState(() => {
    const savedCurrentConversation = localStorage.getItem('aichat_current_conversation');
    return savedCurrentConversation ? JSON.parse(savedCurrentConversation) : null;
  });

  // 添加重命名和删除相关状态
  const [editingFolderName, setEditingFolderName] = useState(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [deletingConversation, setDeletingConversation] = useState(null);

  // 添加重命名处理函数
  const handleRenameConversation = async (conversation, newName) => {
    try {
      const result = await window.electron.renameChatFolder(conversation.path, newName);
      
      // 更新会话列表
      const updatedConversations = conversations.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, name: result.name, path: result.path }
          : conv
      );
      
      setConversations(updatedConversations);
      if (currentConversation?.id === conversation.id) {
        setCurrentConversation({ ...currentConversation, name: result.name, path: result.path });
      }
      
      // 更新存储
      localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
    } catch (error) {
      console.error('重命名失败:', error);
      alert('重命名失败: ' + error.message);
    }
    
    setEditingFolderName(null);
    setFolderNameInput('');
  };

  // 添加删除处理函数
  const handleDeleteConversation = async (conversation) => {
    try {
      // 移动文件夹到回收站
      await window.electron.moveFolderToRecycle(conversation.path);
      
      // 更新状态
      const updatedConversations = conversations.filter(c => c.id !== conversation.id);
      setConversations(updatedConversations);
      
      if (currentConversation?.id === conversation.id) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      // 更新存储
      localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
    } catch (error) {
      console.error('删除会话失败:', error);
      alert('删除会话失败: ' + error.message);
    }
    
    setDeletingConversation(null);
  };

  // 添加右键菜单处理函数
  const handleContextMenu = (e, conversation) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const items = [
      {
        label: '重命名',
        onClick: () => {
          setEditingFolderName(conversation.id);
          setFolderNameInput(conversation.name);
        }
      },
      {
        label: '删除',
        onClick: () => setDeletingConversation(conversation)
      }
    ];
    
    // 显示自定义右键菜单
    const menu = document.createElement('div');
    menu.className = 'menu bg-base-200 rounded-box shadow-lg absolute z-50';
    menu.style.left = `${rect.right}px`;
    menu.style.top = `${rect.top}px`;
    
    items.forEach(item => {
      const button = document.createElement('button');
      button.className = 'btn btn-ghost btn-sm w-full text-left';
      button.textContent = item.label;
      button.onclick = () => {
        item.onClick();
        document.body.removeChild(menu);
      };
      menu.appendChild(button);
    });
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  };

  const createNewConversation = async () => {
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
      
      // 更新状态
      const updatedConversations = [...conversations, newConversation];
      setConversations(updatedConversations);
      setCurrentConversation(newConversation);
      setMessages([]);
      
      // 保存到本地存储
      localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
      localStorage.setItem('aichat_current_conversation', JSON.stringify(newConversation));
    } catch (error) {
      console.error('创建新会话失败:', error);
      alert('创建新会话失败: ' + error.message);
    }
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

      // 添加 AI 正在输入的提示
      const loadingMessage = {
        id: Date.now() + 1,
        content: '正在思考...',
        type: 'assistant',
        timestamp: new Date(),
        generating: true
      };
      
      const messagesWithLoading = [...messagesWithUser, loadingMessage];
      setMessages(messagesWithLoading);

      // 调用 AI API
      const response = await callModelAPI({
        provider: selectedProvider,
        apiKey,
        apiHost,
        model: selectedModel,
        messages: messagesWithUser
      });

      // 构造 AI 回复消息
      const aiMessage = {
        id: loadingMessage.id, // 使用相同的ID以替换loading消息
        content: response.content,
        type: 'assistant',
        timestamp: new Date(),
        usage: response.usage
      };

      // 保存 AI 回复到txt文件
      const aiTxtFile = await window.electron.saveMessageAsTxt(
        currentConversation.path,
        {
          ...aiMessage,
          // 添加文件名格式
          fileName: `${formatAIChatTime(aiMessage.timestamp)} • 模型: ${selectedModel} • Token: ${estimateTokens(response.content)}`
        }
      );
      aiMessage.txtFile = aiTxtFile;

      // 更新最终消息列表，替换loading消息
      const finalMessages = messagesWithLoading.map(msg => 
        msg.id === loadingMessage.id ? aiMessage : msg
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
      alert('发送消息失败: ' + error.message);
    }
  };

  // 添加重试处理函数
  const handleRetry = (messageId, content) => {
    setRetryingMessageId(messageId);
    handleSendMessage(true, content);
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

        {/* 存储路径设置 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">存储路径</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="input input-bordered flex-1"
              value={storagePath}
              readOnly
              placeholder="请选择存储路径..."
            />
            <button
              className="btn"
              onClick={handleSelectStoragePath}
            >
              选择文件夹
            </button>
          </div>
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

          /* 调整消息气泡的内边距 */
          .chat-bubble {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }

          /* 调整 Markdown 内容的边距 */
          .chat-bubble > p:first-child {
            margin-top: 0;
          }
          
          .chat-bubble > p:last-child {
            margin-bottom: 0;
          }
        `}
      </style>
      {/* 左侧边栏 */}
      <div className="w-60 bg-base-200 border-r border-base-300 flex flex-col h-full">
        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          <button 
            className="btn btn-primary w-full mb-2"
            onClick={createNewConversation}
          >
            + 新建会话
          </button>
          
          <div className="space-y-2">
            {conversations.map(conversation => (
              <div 
                key={conversation.id}
                className={`bg-base-100 rounded-lg p-3 cursor-pointer hover:bg-base-300 ${
                  currentConversation?.id === conversation.id ? 'bg-base-300' : ''
                }`}
                onClick={() => {
                  if (editingFolderName === conversation.id) return;
                  setCurrentConversation(conversation);
                  localStorage.setItem('aichat_current_conversation', JSON.stringify(conversation));
                  // 加载会话消息
                  window.electron.loadMessages(conversation.path, conversation.id)
                    .then(loadedMessages => {
                      setMessages(loadedMessages || []);
                    })
                    .catch(error => {
                      console.error('加载消息失败:', error);
                      setMessages([]);
                    });
                }}
                onContextMenu={(e) => handleContextMenu(e, conversation)}
              >
                {editingFolderName === conversation.id ? (
                  <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={folderNameInput}
                      onChange={(e) => setFolderNameInput(e.target.value)}
                      className="input input-xs input-bordered w-full"
                      placeholder="输入新的文件夹名称"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameConversation(conversation, folderNameInput);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => handleRenameConversation(conversation, folderNameInput)}
                      >
                        确认
                      </button>
                      <button
                        className="btn btn-xs"
                        onClick={() => {
                          setEditingFolderName(null);
                          setFolderNameInput('');
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-medium">{conversation.name}</h3>
                    <p className="text-sm opacity-70 truncate">
                      {conversation.messages[conversation.messages.length - 1]?.content || '新的会话'}
                    </p>
                  </>
                )}
              </div>
            ))}
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
      <div className="flex-1 flex flex-col h-full">
        {/* 顶部标题栏 */}
        <div className="p-4 border-b border-base-300">
          <h2 className="text-xl font-semibold">当前会话</h2>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 messages-container">
          {messages.map(message => (
            <div
              key={message.id}
              className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative ai-chat-group`}
            >
              <div className="chat-header opacity-70">
                <span className="text-xs">
                  {new Date(message.timestamp).toLocaleString()}
                  {message.type === 'assistant' && (
                    <>
                      {' • '}模型: {selectedModel}
                      {' • '}Token: {estimateTokens(message.content)}
                    </>
                  )}
                </span>
              </div>
              <div className={`chat-bubble ${
                message.type === 'user' ? 'chat-bubble-primary' : 
                message.error ? 'chat-bubble-error' : 'chat-bubble-secondary'
              }`}>
                {message.generating ? (
                  <div className="flex items-center gap-2">
                    <span>正在思考</span>
                    <span className="loading loading-dots loading-xs"></span>
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code: CodeBlock,
                      a: CustomLink
                    }}
                    className="break-words"
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
                {message.error && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="btn btn-xs btn-outline"
                      onClick={() => handleRetry(message.id, message.originalContent)}
                      disabled={retryingMessageId === message.id}
                    >
                      {retryingMessageId === message.id ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        'Retry'
                      )}
                    </button>
                  </div>
                )}
              </div>
              {message.type === 'assistant' && !message.error && (
                <div className="ai-chat-message-actions">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleRetry(message.id, message.content)}
                    disabled={retryingMessageId === message.id}
                  >
                    {retryingMessageId === message.id ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      'Retry'
                    )}
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleDeleteMessage(message.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                    }}
                  >
                    Copy
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      if (sendToSidebar) {
                        sendToSidebar(message);
                      }
                    }}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 底部输入框 */}
        <div className="border-t border-base-300 p-4">
          <div className="flex items-center space-x-2">
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
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
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

      {/* 删除确认对话框 */}
      {deletingConversation && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">删除会话</h3>
            <p className="py-4">确定要删除这个会话吗？</p>
            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => setDeletingConversation(null)}
              >
                取消
              </button>
              <button 
                className="btn btn-error"
                onClick={() => handleDeleteConversation(deletingConversation)}
              >
                删除
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeletingConversation(null)}></div>
        </div>
      )}
    </div>
  );
}; 