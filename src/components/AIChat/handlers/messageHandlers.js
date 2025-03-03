import { v4 as uuidv4 } from 'uuid';
import { callModelAPI } from '../../../services/modelProviders';
import { MESSAGE_STATES } from '../constants';
import { searchService } from '../../../services/searchService';

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
  editContent,
  abortController,
  setAbortController,
  isNetworkEnabled,
  handleSendMessage,
  systemPrompt,
  systemPromptEnabled
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
      
      // 保存更新后的消息列表到 messages.json
      if (currentConversation?.path) {
        try {
          console.log('正在保存消息列表:', {
            path: currentConversation.path,
            id: currentConversation.id,
            messages: newMessages
          });
          await window.electron.saveMessages(
            currentConversation.path,
            currentConversation.id,
            newMessages
          );
          console.log('消息列表保存成功');
        } catch (error) {
          console.error('保存消息列表失败:', error);
          throw error;
        }
      }

      // 更新状态
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
  const saveEdit = async (messageId, newContent) => {
    try {
      // 获取要编辑的消息
      const message = messages.find(msg => msg.id === messageId);
      if (!message) return;

      // 检查编辑内容
      if (newContent === undefined || newContent === null) {
        throw new Error('编辑内容不能为空');
      }

      // 创建更新后的消息对象，保留所有原始属性
      const updatedMessage = {
        ...message,
        content: newContent,
        timestamp: new Date().toISOString(),  // 更新时间戳
        history: message.history || [],
        currentHistoryIndex: message.currentHistoryIndex || 0,
        reasoning_content: message.reasoning_content || '',
        files: message.files || [],
        model: message.model,
        type: message.type
      };

      // 更新消息列表
      const updatedMessages = messages.map(msg =>
        msg.id === messageId ? updatedMessage : msg
      );

      // 保存到本地文件
      if (currentConversation?.path) {
        try {
          // 更新 txt 文件
          const txtFile = await window.electron.saveMessageAsTxt(
            currentConversation.path,
            {
              ...updatedMessage,
              fileName: message.txtFile?.displayName || `message_${message.id}`
            }
          );

          // 更新消息对象的 txtFile 属性
          updatedMessage.txtFile = txtFile;

          // 保存到 messages.json
          await window.electron.saveMessages(
            currentConversation.path,
            currentConversation.id,
            updatedMessages
          );

        } catch (error) {
          console.error('保存文件失败:', error);
          throw new Error('保存文件失败: ' + error.message);
        }
      }

      // 更新状态
      setMessages(updatedMessages);

      // 退出编辑模式
      setEditingMessageId(null);
      setEditContent('');

    } catch (error) {
      console.error('保存编辑失败:', error, {
        newContent,
        messageId,
        currentConversation
      });
      alert(error.message);
      throw error;
    }
  };

  // 重试失败的消息
  const handleRetry = async (messageId) => {
    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);

    try {
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

      // 获取用户消息
      const userMessageIndex = messages.findIndex(msg => msg.id === messageId) - 1;
      if (userMessageIndex < 0) return;
      const userMessage = messages[userMessageIndex];

      // 检查是否是图片生成消息
      if (aiMessage.originalPrompt) {
        // 如果是图片消息，构建命令字符串
        const imageCommand = `/image ${aiMessage.originalPrompt}`;
        
        // 使用原始提示词重试，传递字符串作为内容
        await handleSendMessage(true, imageCommand);
        return;
      }

      // 如果是文字消息，继续原有的重试逻辑
      // 尝试进行网络搜索
      let systemMessage = '';
      let searchResults = null;
      
      // 只在网络搜索开启时执行搜索
      if (isNetworkEnabled) {
        try {
          console.log('重试时进行网络搜索:', userMessage.content);
          const searchResponse = await searchService.searchAndFetchContent(userMessage.content);
          console.log('搜索结果:', searchResponse);
          
          if (searchResponse.results && searchResponse.results.length > 0) {
            systemMessage = `以下是与问题相关的网络搜索结果：\n\n${
              searchResponse.results.map((result, index) => (
                `[${index + 1}] ${result.title}\n${result.snippet}\n${result.content}\n---\n`
              )).join('\n')
            }\n\n请基于以上搜索结果回答用户的问题："${userMessage.content}"。如果搜索结果不足以完整回答问题，也可以使用你自己的知识来补充。请在回答末尾列出使用的参考来源编号。`;
            
            searchResults = searchResponse.results;
            console.log('搜索结果处理完成');
          }
        } catch (error) {
          console.error('搜索失败:', error);
          // 搜索失败时继续对话，但不使用搜索结果
        }
      }

      // 构建消息历史
      const messagesHistory = [];
      
      // 如果启用了系统提示词，添加到消息列表开头
      if (systemPromptEnabled && systemPrompt) {
        messagesHistory.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // 如果有搜索系统消息，添加到消息列表
      if (systemMessage) {
        messagesHistory.push({
          role: 'system',
          content: systemMessage
        });
      }

      // 获取历史消息数量设置
      const maxHistoryMessages = parseInt(localStorage.getItem('aichat_max_history_messages')) || 5;
      
      // 添加历史对话消息
      const recentMessages = messages
        .slice(
          maxHistoryMessages === 21 ? 0 : Math.max(0, userMessageIndex - maxHistoryMessages + 1),
          userMessageIndex + 1
        )
        .filter(msg => msg.type === 'user' || msg.type === 'assistant')
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content || ''
        }));

      messagesHistory.push(...recentMessages);

      // 调用 AI API
      const response = await callModelAPI({
        provider: selectedProvider,
        apiKey,
        apiHost,
        model: selectedModel,
        messages: messagesHistory,
        maxTokens,
        temperature,
        signal: controller.signal,
        onUpdate: (update) => {
          setMessages(prev => {
            const newMessages = [...prev];
            const index = newMessages.findIndex(msg => msg.id === messageId);
            if (index === -1) return prev;

            // 更新消息内容
            newMessages[index] = {
              ...newMessages[index],
              content: update.content,
              reasoning_content: update.reasoning_content,
              generating: !update.done,
              searchResults: searchResults
            };

            return newMessages;
          });
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
          reasoning_content: response.reasoning_content || currentMessage.reasoning_content, // 保留推理内容
          searchResults: searchResults // 添加搜索结果
        };

        return newMessages;
      });

      // 更新消息状态
      setMessageStates(prev => ({
        ...prev,
        [messageId]: MESSAGE_STATES.COMPLETED
      }));

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('生成已被用户中止');
        return;
      }
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
    } finally {
      setAbortController(null);
    }
  };

  // 添加停止生成功能
  const handleStop = async (messageId) => {
    try {
      // 中断当前的请求
      if (abortController) {
        abortController.abort();
        setAbortController(null);
      }

      // 更新消息状态
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(msg => msg.id === messageId);
        if (index === -1) return prev;

        newMessages[index] = {
          ...newMessages[index],
          generating: false,
          content: newMessages[index].content + '\n\n[已停止生成]'
        };
        return newMessages;
      });

      setMessageStates(prev => ({
        ...prev,
        [messageId]: MESSAGE_STATES.COMPLETED
      }));
    } catch (error) {
      console.error('停止生成失败:', error);
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
    handleStop,
    handleHistoryNavigation
  };
}; 