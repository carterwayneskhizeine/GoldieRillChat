import { v4 as uuidv4 } from 'uuid';
import { callModelAPI } from '../../../services/modelProviders';
import { MESSAGE_STATES } from '../constants';

// 格式化时间函数
const formatAIChatTime = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear().toString().slice(-2);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${day}${month}${year}_${hours}${minutes}${seconds}`;
};

export const createMessageHandlers = ({
  messages,
  setMessages,
  setEditingMessageId,
  setEditContent,
  setRetryingMessageId,
  setFailedMessages,
  selectedModel,
  selectedProvider,
  apiKey,
  apiHost,
  setMessageStates,
  currentConversation,
  window,
  maxTokens,
  temperature,
  editContent
}) => {
  // 添加新消息
  const addMessage = (content, type = 'user') => {
    const newMessage = {
      id: uuidv4(),
      content,
      type,
      timestamp: Date.now(),
      model: type === 'assistant' ? selectedModel : undefined,
      history: [],
      currentHistoryIndex: 0,
      reasoning_content: ''  // 添加推理内容字段
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  // 更新消息
  const updateMessage = (id, updates) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };

  // 删除消息
  const deleteMessage = async (id) => {
    try {
      // 找到要删除的消息
      const message = messages.find(msg => msg.id === id);
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
      const newMessages = messages.filter(m => m.id !== id);
      setMessages(newMessages);
    } catch (error) {
      console.error('删除消息失败:', error);
      alert('删除消息失败: ' + error.message);
    }
  };

  // 开始编辑消息
  const startEditing = (message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  // 保存编辑
  const saveEdit = async (messageId) => {
    try {
      if (!editContent) {
        throw new Error('编辑内容不能为空');
      }

      // 更新消息
      const updatedMessages = messages.map(msg =>
        msg.id === messageId ? { ...msg, content: editContent } : msg
      );

      // 保存到本地文件
      if (currentConversation?.path) {
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          updatedMessages
        );
      }

      // 更新状态
      setMessages(updatedMessages);
      setEditingMessageId(null);
      setEditContent('');
    } catch (error) {
      console.error('保存编辑失败:', error);
      alert('保存编辑失败: ' + error.message);
    }
  };

  // 重试失败的消息
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
          tokens: currentMessage.tokens,
          reasoning_content: currentMessage.reasoning_content  // 保存推理内容到历史记录
        });
      }

      newMessages[index] = {
        ...currentMessage,
        history: history,
        currentHistoryIndex: history.length, // 设置为最新的索引
        currentContent: null, // 重置当前内容
        reasoning_content: '' // 重置推理内容
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
        maxTokens,
        temperature,
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
          } else if (update.type === 'reasoning') {
            // 更新推理内容
            setMessages(prev => {
              const newMessages = [...prev];
              const index = newMessages.findIndex(msg => msg.id === messageId);
              if (index === -1) return prev;

              newMessages[index] = {
                ...newMessages[index],
                reasoning_content: update.content
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
        
        // 更新 txt 文件内容
        if (currentMessage.txtFile) {
          window.electron.saveMessageAsTxt(
            currentConversation.path,
            {
              ...currentMessage,
              content: `${response.reasoning_content ? `推理过程:\n${response.reasoning_content}\n\n回答:\n` : ''}${response.content}`,
              fileName: `${currentMessage.txtFile.displayName}`
            }
          ).catch(error => {
            console.error('保存消息到txt文件失败:', error);
          });
        }

        newMessages[index] = {
          ...currentMessage,
          content: response.content,
          generating: false,
          usage: response.usage,
          model: selectedModel,
          tokens: response.usage?.total_tokens || 0,
          currentHistoryIndex: currentMessage.history.length, // 设置为最新的索引
          reasoning_content: response.reasoning_content || currentMessage.reasoning_content // 保留推理内容
        };

        return newMessages;
      });

      // 更新消息状态
      setMessageStates(prev => ({
        ...prev,
        [messageId]: MESSAGE_STATES.COMPLETED
      }));

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

  // 处理消息历史导航
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
          message.currentReasoningContent = message.reasoning_content;  // 保存当前推理内容
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
          reasoning_content: message.currentReasoningContent || message.reasoning_content,  // 恢复当前推理内容
          currentHistoryIndex: newIndex
        };
      } else {
        // 显示历史回复
        const historyItem = message.history[newIndex];
        newMessages[index] = {
          ...message,
          content: historyItem.content,
          reasoning_content: historyItem.reasoning_content || '',  // 显示历史推理内容
          currentHistoryIndex: newIndex
        };
      }

      return newMessages;
    });
  };

  return {
    addMessage,
    updateMessage,
    deleteMessage,
    startEditing,
    cancelEditing,
    saveEdit,
    handleRetry,
    handleHistoryNavigation
  };
}; 