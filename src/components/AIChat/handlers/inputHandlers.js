import { callModelAPI } from '../../../services/modelProviders';
import { formatAIChatTime } from '../../../utils/AIChatTimeFormat';
import { MESSAGE_STATES } from '../constants';

export const createInputHandlers = ({
  messageInput,
  setMessageInput,
  setIsGenerating,
  selectedFile,
  setSelectedFile,
  addToHistory,
  handleHistoryNavigation,
  addMessage,
  currentConversation,
  messages,
  setMessages,
  selectedProvider,
  selectedModel,
  apiKey,
  apiHost,
  setMessageStates,
  setAnimationStates,
  setFailedMessages,
  setRetryingMessageId,
  maxTokens,
  temperature
}) => {
  // 处理发送消息
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

    // 创建 AI 消息对象
    const aiMessage = {
      id: Date.now() + 1,
      content: '',
      type: 'assistant',
      timestamp: new Date(),
      generating: true,
      reasoning_content: '',  // 初始化推理内容字段
      history: [],
      currentHistoryIndex: 0
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
        [aiMessage.id]: 'fade_in'
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
        maxTokens,
        temperature,
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

              newMessages[aiMessageIndex] = updatedAiMessage;
              return newMessages;
            });
          } else if (update.type === 'reasoning') {
            // 更新推理内容
            setMessages(prev => {
              const newMessages = [...prev];
              const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
              if (aiMessageIndex === -1) return prev;

              console.log('更新推理内容:', update.content); // 添加日志

              const updatedAiMessage = {
                ...newMessages[aiMessageIndex],
                reasoning_content: update.content || ''
              };

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
          content: `${response.reasoning_content ? `推理过程:\n${response.reasoning_content}\n\n回答:\n` : ''}${response.content}`,
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
        tokens: response.usage?.total_tokens || 0,
        reasoning_content: response.reasoning_content || ''  // 添加推理内容
      };

      // 更新消息列表
      const finalMessages = messagesWithAI.map(msg => 
        msg.id === aiMessage.id ? finalAiMessage : msg
      );
      setMessages(finalMessages);

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

  // 处理键盘事件
  const handleKeyDown = (e) => {
    // 处理历史记录导航
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleHistoryNavigation('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleHistoryNavigation('down');
    }
    
    // 处理发送消息快捷键
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理文件选择
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // 读取文件内容
      const reader = new FileReader();
      reader.onload = (e) => {
        setMessageInput(prev => prev + '\n```' + file.name + '\n' + e.target.result + '\n```');
      };
      reader.readAsText(file);
    }
  };

  return {
    handleSendMessage,
    handleKeyDown,
    handleFileSelect
  };
}; 