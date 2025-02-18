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
  deleteMessage,
  imageSettings
}) => {
  // 处理发送消息
  const handleSendMessage = async (isRetry = false, retryContent = null, forceNetworkSearch = false) => {
    if (!messageInput.trim() && !isRetry) return;
    if (!currentConversation) {
      alert('请先创建或选择一个会话');
      return;
    }

    // 获取要发送的内容
    const content = isRetry ? retryContent : messageInput;

    // 检查是否是图片生成命令或图片重试
    if (content.startsWith('/image ') || (isRetry && retryContent.originalPrompt)) {
      // 添加全局设置日志
      console.log('全局图片设置状态:', {
        imageSettings,
        typeof_width: typeof imageSettings.width,
        width_value: imageSettings.width,
        is_width_multiple_of_32: imageSettings.width % 32 === 0
      });

      const args = content.startsWith('/image ') ? content.slice(7).trim().split('--') : [];
      const prompt = content.startsWith('/image ') ? args[0].trim() : retryContent.originalPrompt;
      let model = imageSettings.model;
      let params = { ...imageSettings };

      // 添加参数复制日志
      console.log('初始参数复制:', {
        model,
        params,
        typeof_width: typeof params.width,
        width_value: params.width,
        is_width_multiple_of_32: params.width % 32 === 0
      });

      // 如果是新的图片生成命令，解析参数
      if (content.startsWith('/image ')) {
        // 解析其他参数
        for (let i = 1; i < args.length; i++) {
          const [key, value] = args[i].trim().split(' ');
          if (key === 'model' && value) {
            model = value;
            // 如果切换到了不同的模型，使用该模型的默认参数
            if (model !== imageSettings.model) {
              if (model === 'black-forest-labs/FLUX.1-pro') {
                // 确保宽度和高度是32的倍数
                params = {
                  model,
                  width: Math.floor(1024 / 32) * 32,
                  height: Math.floor(768 / 32) * 32,
                  steps: 20,
                  guidance: 3,
                  safety_tolerance: 2,
                  interval: 2,
                  prompt_upsampling: false,
                  seed: imageSettings.seed  // 保持使用全局设置的 seed
                };
                // 添加模型切换日志
                console.log('切换到 FLUX.1-pro 模型:', {
                  params,
                  typeof_width: typeof params.width,
                  width_value: params.width,
                  is_width_multiple_of_32: params.width % 32 === 0
                });
              } else {
                params = {
                  model,
                  image_size: '1024x576',
                  seed: imageSettings.seed  // 保持使用全局设置的 seed
                };
                // 添加模型切换日志
                console.log('切换到其他模型:', params);
              }
            }
          }
          if (key === 'size' && value && model !== 'black-forest-labs/FLUX.1-pro') {
            // 验证尺寸是否有效
            const validSizes = ['1024x1024', '512x1024', '768x512', '768x1024', '1024x576', '576x1024', '512x768'];
            if (validSizes.includes(value)) {
              params.image_size = value;
              console.log('更新图片尺寸:', value);
            }
          }
        }
      } else if (isRetry && retryContent.seed) {
        // 如果是重试，使用原始的 seed
        params.seed = retryContent.seed;
      }

      if (!prompt) {
        alert('请输入图片生成提示词');
        return;
      }

      // 添加用户消息
      const userMessage = {
        id: Date.now(),
        content: isRetry && retryContent.originalPrompt ? `/image ${retryContent.originalPrompt}` : content,
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
      setMessages(prev => [...prev, userMessage]);

      // 清空输入框
      if (!isRetry) {
        setMessageInput('');
        const textarea = document.querySelector('.aichat-input');
        if (textarea) {
          textarea.style.height = '64px';
          textarea.style.overflowY = 'hidden';
        }
      }

      // 创建 AI 消息对象
      const aiMessage = {
        id: Date.now() + 1,
        content: '',
        type: 'assistant',
        timestamp: new Date(),
        generating: true,
        thinking: true,  // 添加 thinking 标记来触发动画效果
        thinkingText: '正在生成图片'  // 自定义思考文本
      };

      // 设置消息状态
      setMessageStates(prev => ({
        ...prev,
        [aiMessage.id]: MESSAGE_STATES.THINKING
      }));

      // 更新消息列表
      setMessages(prev => [...prev, aiMessage]);

      try {
        // 在构建 API 参数之前添加日志
        console.log('构建 API 参数前的状态:', {
          model,
          params,
          typeof_width: typeof params.width,
          width_value: params.width,
          is_width_multiple_of_32: model === 'black-forest-labs/FLUX.1-pro' ? params.width % 32 === 0 : null
        });

        // 只有在使用 FLUX.1-pro 模型时才进行宽度和高度的预处理
        if (model === 'black-forest-labs/FLUX.1-pro') {
          // 预处理宽度和高度，确保是32的倍数
          const finalWidth = Number(Math.floor(Number(params.width) / 32) * 32);
          const finalHeight = Number(Math.floor(Number(params.height) / 32) * 32);

          // 添加预处理后的参数日志
          console.log('预处理后的宽度和高度:', {
            finalWidth,
            finalHeight,
            finalWidth_is_multiple: finalWidth % 32 === 0,
            finalHeight_is_multiple: finalHeight % 32 === 0,
            finalWidth_type: typeof finalWidth,
            finalHeight_type: typeof finalHeight
          });

          // 验证预处理后的参数
          if (finalWidth < 256 || finalWidth > 1440 || finalWidth % 32 !== 0) {
            throw new Error(`宽度 ${finalWidth} 必须是32的倍数，且在256-1440之间`);
          }
          if (finalHeight < 256 || finalHeight > 1440 || finalHeight % 32 !== 0) {
            throw new Error(`高度 ${finalHeight} 必须是32的倍数，且在256-1440之间`);
          }

          // 更新参数
          params.width = finalWidth;
          params.height = finalHeight;
        }

        // 调用图片生成 API
        const apiParams = {
          prompt,
          model,
          seed: params.seed,  // 使用全局设置中的 seed
          ...(model === 'black-forest-labs/FLUX.1-pro' ? {
            width: params.width,
            height: params.height,
            steps: Number(params.steps),
            guidance: Number(params.guidance),
            safety_tolerance: Number(params.safety_tolerance),
            interval: Number(params.interval),
            prompt_upsampling: params.prompt_upsampling
          } : {
            image_size: params.image_size
          }),
          conversationPath: currentConversation.path,
          apiKey,
          apiHost
        };

        // 添加最终 API 参数日志
        console.log('最终 API 参数:', {
          ...apiParams,
          typeof_width: typeof apiParams.width,
          width_value: apiParams.width,
          is_width_multiple_of_32: model === 'black-forest-labs/FLUX.1-pro' ? apiParams.width % 32 === 0 : null,
          typeof_height: typeof apiParams.height,
          height_value: apiParams.height,
          is_height_multiple_of_32: model === 'black-forest-labs/FLUX.1-pro' ? apiParams.height % 32 === 0 : null
        });

        const result = await window.electron.generateImage(apiParams);

        // 更新 AI 消息
        const finalContent = `**Prompt：** ${prompt}

**Model：** ${model}

**Seed：** ${params.seed}

![${prompt}](local-file://${result.localPath})`;
        const updatedAiMessage = {
          ...aiMessage,
          content: finalContent,
          generating: false,
          files: [{
            name: result.fileName,
            path: result.localPath,
            type: 'image/png'
          }],
          seed: params.seed,
          model: model,
          originalPrompt: prompt
        };

        // 更新消息列表
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id ? updatedAiMessage : msg
        ));

        // 保存消息到文件
        const aiTxtFile = await window.electron.saveMessageAsTxt(
          currentConversation.path,
          {
            ...updatedAiMessage,
            fileName: `${formatAIChatTime(aiMessage.timestamp)} • 图片生成 • Seed: ${params.seed}`
          }
        );

        // 更新最终消息
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id ? { ...updatedAiMessage, txtFile: aiTxtFile } : msg
        ));

        // 更新消息状态
        setMessageStates(prev => ({
          ...prev,
          [aiMessage.id]: MESSAGE_STATES.COMPLETED
        }));

      } catch (error) {
        console.error('图片生成失败:', error);
        
        // 更新消息内容为错误信息
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id ? {
            ...msg,
            content: `图片生成失败: ${error.message}`,
            generating: false,
            error: true
          } : msg
        ));

        // 更新消息状态
        setMessageStates(prev => ({
          ...prev,
          [aiMessage.id]: MESSAGE_STATES.ERROR
        }));
      }

      return;
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);

    let aiMessage = null;

    try {
      // 添加用户消息
      const userMessage = {
        id: Date.now(),
        content: isRetry && retryContent.originalPrompt ? `/image ${retryContent.originalPrompt}` : content,
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
          setMessages(prev => {
            const newMessages = [...prev];
            const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
            if (aiMessageIndex === -1) return prev;

            const updatedAiMessage = {
              ...newMessages[aiMessageIndex],
              content: update.content,
              reasoning_content: update.reasoning_content,
              generating: !update.done,
              searchResults: searchResults
            };

            newMessages[aiMessageIndex] = updatedAiMessage;
            return newMessages;
          });
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
        reasoning_content: response.reasoning_content,
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