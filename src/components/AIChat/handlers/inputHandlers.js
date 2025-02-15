import { callModelAPI } from '../../../services/modelProviders';
import { formatAIChatTime } from '../../../utils/AIChatTimeFormat';
import { MESSAGE_STATES } from '../constants';
import { searchService } from '../../../services/searchService';

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
  temperature,
  setError,
  abortController,
  setAbortController,
  isNetworkEnabled,
  updateMessage,
  deleteMessage
}) => {
  // 处理发送消息
  const handleSendMessage = async (isRetry = false, retryContent = null, forceNetworkSearch = false) => {
    if (!messageInput.trim() && !isRetry) return;
    if (!currentConversation) {
      alert('请先创建或选择一个会话');
      return;
    }
    
    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);

    // 获取要发送的内容
    const content = isRetry ? retryContent : messageInput;
    let aiMessage = null;

    try {
      // 添加用户消息
      const userMessage = {
        id: Date.now(),
        content: content,
        type: 'user',
        timestamp: new Date()
      };

      // 保存用户消息到txt文件
      const txtFile = await window.electron.saveMessageAsTxt(
        currentConversation.path, 
        userMessage
      );
      userMessage.txtFile = txtFile;
      
      // 更新消息列表
      const messagesWithUser = isRetry ? messages : [...messages, userMessage];
      if (!isRetry) {
        setMessages(messagesWithUser);
      }

      if (!isRetry) {
        setMessageInput('');
        // 重置输入框高度
        const textarea = document.querySelector('.aichat-input');
        if (textarea) {
          textarea.style.height = '64px';
          textarea.style.overflowY = 'hidden';
        }
      }

      // 创建 AI 消息对象
      aiMessage = {
        id: Date.now() + 1,
        content: '',
        type: 'assistant',
        timestamp: new Date(),
        generating: true,
        reasoning_content: '',
        history: [],
        currentHistoryIndex: 0
      };

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

      // 如果启用了网络搜索或强制搜索，进行搜索
      let systemMessage = '';
      let searchResults = null;

      if (isNetworkEnabled || forceNetworkSearch) {
        try {
          console.log('开始网络搜索:', content);
          const searchResponse = await searchService.searchAndFetchContent(content);
          console.log('搜索结果:', searchResponse);
          
          if (searchResponse.results && searchResponse.results.length > 0) {
            // 构建搜索结果上下文
            systemMessage = `以下是与问题相关的网络搜索结果：\n\n${
              searchResponse.results.map((result, index) => (
                `[${index + 1}] ${result.title}\n${result.snippet}\n${result.content}\n---\n`
              )).join('\n')
            }\n\n请基于以上搜索结果回答用户的问题："${content}"。如果搜索结果不足以完整回答问题，也可以使用你自己的知识来补充。请在回答末尾列出使用的参考来源编号。`;
            
            searchResults = searchResponse.results;
            console.log('搜索结果处理完成');
          }
        } catch (error) {
          console.error('搜索失败:', error);
          // 搜索失败时继续对话，但不使用搜索结果
        }
      }

      // 构建消息历史
      const maxHistoryMessages = parseInt(localStorage.getItem('aichat_max_history_messages')) || 5;
      
      // 获取历史消息
      const recentMessages = messages
        .slice(maxHistoryMessages === 21 ? 0 : Math.max(0, messages.length - maxHistoryMessages))
        .map(msg => ({
          role: msg.type,
          content: msg.content,
        }));

      // 如果有系统消息，添加到消息列表开头
      if (systemMessage) {
        recentMessages.unshift({
          role: 'system',
          content: systemMessage,
        });
      }

      // 添加新的用户消息
      recentMessages.push({
        role: 'user',
        content: content,
      });

      // 调用AI接口
      const response = await callModelAPI({
        provider: selectedProvider,
        apiKey,
        apiHost,
        model: selectedModel,
        messages: recentMessages,
        maxTokens,
        temperature,
        signal: controller.signal,
        onUpdate: (update) => {
          if (update.type === 'content') {
            setMessages(prev => {
              const newMessages = [...prev];
              const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
              if (aiMessageIndex === -1) return prev;

              const updatedAiMessage = {
                ...newMessages[aiMessageIndex],
                content: update.content,
                generating: !update.done,
                searchResults: searchResults
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
        tokens: response.usage?.total_tokens || 0,
        searchResults: searchResults
      };

      // 更新消息列表
      const finalMessages = messagesWithAI.map(msg => 
        msg.id === aiMessage.id ? finalAiMessage : msg
      );
      setMessages(finalMessages);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('生成已被用户中止');
        return;
      }
      console.error('发送消息失败:', error);
      setError(error.message);
      
      if (aiMessage) {
        // 更新消息状态
        setMessageStates(prev => ({
          ...prev,
          [aiMessage.id]: MESSAGE_STATES.ERROR
        }));
      }
    } finally {
      setAbortController(null);
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

  return {
    handleSendMessage,
    handleKeyDown,
    handleFileSelect,
    handleStop
  };
}; 