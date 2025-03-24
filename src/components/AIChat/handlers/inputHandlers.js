import { v4 as uuidv4 } from 'uuid';
import { callModelAPI } from '../../../services/modelProviders';
import { formatAIChatTime } from '../../../utils/AIChatTimeFormat';
import { MESSAGE_STATES } from '../constants';
import { tavilyService } from '../../../services/tavilyService';
import { handleVideoCommand } from './videoCommandHandler';
import { handleAudioCommand } from './audioCommandHandler';
import toastManager from '../../../utils/toastManager';
import { translateText } from '../../../services/translationService';
import { generateImage } from '../../../services/imageGenerationService';
import { getKnowledgeBaseReferences } from '../../../services/KnowledgeBaseService';
import { getWebSearchPrompt, FOOTNOTE_PROMPT } from '../../../utils/prompts';
import { formatISODate } from '../../../utils/dateUtils';
import { formatReferencesForModel, sortAndFilterReferences } from '../../../utils/referenceUtils';
import { useEffect } from 'react';

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
  imageSettings,
  systemPrompt,
  systemPromptEnabled
}) => {
  // 定义输入处理器变量包
  let inputHandlers = {};
  
  // 读取历史消息数量设置
  const getMaxHistoryMessages = () => {
    // 从localStorage获取值，如果没有则默认为5
    const savedValue = parseInt(localStorage.getItem('aichat_max_history_messages'));
    
    // 检查是否是有效数字，否则返回默认值5
    if (isNaN(savedValue)) {
      console.warn('历史消息数量设置无效，使用默认值5');
      return 5;
    }
    
    // 确保在有效的范围内(0-21)
    if (savedValue < 0) return 0;
    if (savedValue > 21) return 21;
    
    return savedValue;
  };

  // 添加重置方法
  inputHandlers.resetInputHandlers = () => {
    // 刷新历史消息数量设置缓存
    const currentMaxHistory = getMaxHistoryMessages();
  };

  // 处理发送消息
  const handleSendMessage = async (messageParams = {}, isRetry = false, retryContent = null, forceNetworkSearch = false) => {
    if (!messageInput.trim() && !isRetry) return;
    if (!currentConversation) {
      toastManager.warning('请先创建或选择一个会话');
      return;
    }

    // 获取要发送的内容
    const content = isRetry ? retryContent : messageInput;
    
    // 获取知识库IDs和网络搜索设置
    const knowledgeBaseIds = messageParams?.knowledgeBaseIds || [];
    let useWebSearch = messageParams?.useWebSearch !== undefined ? messageParams.useWebSearch : isNetworkEnabled;

    // 检查是否是语音生成命令
    if (content.startsWith('/tts ')) {
      try {
        await handleAudioCommand({
          content,
          currentConversation,
          apiKey,
          apiHost,
          addMessage,
          setMessages,
          window
        });
        
        // 清空输入框
        if (!isRetry) {
          setMessageInput('');
          const textarea = document.querySelector('.aichat-input');
          if (textarea) {
            textarea.style.height = '64px';
            textarea.style.overflowY = 'hidden';
          }
        }
        return;
      } catch (error) {
        console.error('语音生成失败:', error);
        toastManager.error('语音生成失败: ' + error.message);
        return;
      }
    }

    // 检查是否是视频生成命令
    if (content.startsWith('/video ')) {
      try {
        await handleVideoCommand({
          content,
          currentConversation,
          apiKey,
          apiHost,
          addMessage,
          setMessages,
          window
        });
        
        // 清空输入框
        if (!isRetry) {
          setMessageInput('');
          const textarea = document.querySelector('.aichat-input');
          if (textarea) {
            textarea.style.height = '64px';
            textarea.style.overflowY = 'hidden';
          }
        }
        return;
      } catch (error) {
        console.error('视频生成失败:', error);
        toastManager.error('视频生成失败: ' + error.message);
        return;
      }
    }

    // 检查是否是图片生成命令或图片重试
    if (content.startsWith('/image ') || (isRetry && retryContent.originalPrompt)) {
      try {
        // 添加全局设置日志
        console.log('全局图片设置状态:', imageSettings);

        const args = content.startsWith('/image ') ? content.slice(7).trim().split('--') : [];
        const prompt = content.startsWith('/image ') ? args[0].trim() : retryContent.originalPrompt;
        
        // 深度复制图片设置
        let params = JSON.parse(JSON.stringify(imageSettings));
        let model = params.model;

        // 验证模型参数
        if (!model) {
          model = 'black-forest-labs/FLUX.1-schnell';
          params.model = model;
        }

        // 添加参数复制日志
        console.log('初始参数复制:', {
          model,
          params,
          typeof_width: typeof params.width,
          width_value: params.width,
          is_width_multiple_of_32: params.width ? params.width % 32 === 0 : null
        });

        // 如果是新的图片生成命令，解析参数
        if (content.startsWith('/image ')) {
          // 解析其他参数
          for (let i = 1; i < args.length; i++) {
            const [key, value] = args[i].trim().split(' ');
            if (key === 'model' && value) {
              model = value;
              // 如果切换到了不同的模型，使用该模型的默认参数
              if (model !== params.model) {
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
                    prompt_upsampling: false
                  };
                  console.log('切换到 FLUX.1-pro 模型，新参数:', params);
                } else {
                  params = {
                    model,
                    image_size: '1024x576'
                  };
                  console.log('切换到其他模型，新参数:', params);
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
        }

        if (!prompt) {
          toastManager.warning('请输入图片生成提示词');
          return;
        }

        // 添加用户消息
        const userMessage = {
          id: Date.now(),
          content: content,
          type: 'user',
          timestamp: new Date(),
          knowledgeBaseIds: knowledgeBaseIds // 保存知识库IDs
        };

        // 保存用户消息到txt文件
        if (typeof window !== 'undefined' && window.electron && window.electron.saveMessageAsTxt) {
          const txtFile = await window.electron.saveMessageAsTxt(
            currentConversation.path,
            userMessage
          );
          userMessage.txtFile = txtFile;
        }

        // 更新消息列表
        setMessages(prev => [...prev, userMessage]);

        // 创建 AI 消息对象
        const aiMessage = {
          id: Date.now() + 1,
          content: '正在生成图片...',
          type: 'assistant',
          timestamp: new Date(),
          generating: true,
          model: model
        };

        // 更新消息列表
        setMessages(prev => [...prev, aiMessage]);

        // 构建 API 参数
        const apiParams = {
          prompt,
          model,
          conversationPath: currentConversation.path,
          apiKey,
          apiHost
        };

        // 根据模型类型添加不同的参数
        if (model === 'black-forest-labs/FLUX.1-pro') {
          Object.assign(apiParams, {
            width: params.width,
            height: params.height,
            steps: params.steps,
            guidance: params.guidance,
            safety_tolerance: params.safety_tolerance,
            interval: params.interval,
            prompt_upsampling: params.prompt_upsampling
          });
        } else {
          apiParams.image_size = params.image_size;
        }

        // 添加参数日志
        console.log('图片生成参数:', {
          model,
          params,
          apiParams,
          typeof_width: typeof params.width,
          width_value: params.width,
          is_width_multiple_of_32: model === 'black-forest-labs/FLUX.1-pro' ? params.width % 32 === 0 : null
        });

        // 使用新的图片生成服务
        const result = await generateImage(
          prompt,
          model,
          params.image_size,
          model === 'black-forest-labs/FLUX.1-pro' ? {
            width: params.width,
            height: params.height,
            steps: params.steps,
            guidance: params.guidance,
            safety_tolerance: params.safety_tolerance,
            interval: params.interval,
            prompt_upsampling: params.prompt_upsampling
          } : {},
          currentConversation.path,
          apiKey,
          apiHost
        );

        // 更新 AI 消息
        const finalContent = `**Prompt：** ${prompt}

**Model：** ${model}

**Seed：** ${result.seed}

<!-- 隐藏图片链接但仍然显示图片 -->
<div style="display:none">![Generated Image](local-file://${result.localPath})</div>`;
        const updatedAiMessage = {
          ...aiMessage,
          content: finalContent,
          generating: false,
          files: [{
            name: result.fileName,
            path: result.localPath,
            type: 'image/png'
          }],
          seed: result.seed,
          model: model,  // 添加模型信息
          originalPrompt: prompt,  // 保存原始提示词，方便重新生成
          knowledgeBaseIds: knowledgeBaseIds, // 保存知识库IDs
          searchImages: result.searchImages
        };

        // 更新消息列表
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id ? updatedAiMessage : msg
        ));

        // 保存 AI 消息到txt文件
        if (typeof window !== 'undefined' && window.electron && window.electron.saveMessageAsTxt) {
          await window.electron.saveMessageAsTxt(
            currentConversation.path,
            updatedAiMessage
          );
        }

        // 保存对话
        if (typeof window !== 'undefined' && window.electron && window.electron.saveConversation) {
          await window.electron.saveConversation(currentConversation.path, [
            ...messages,
            userMessage,
            updatedAiMessage
          ]);
        }

        return;
      } catch (error) {
        console.error('图片生成失败:', error);
        toastManager.error(`图片生成失败: ${error.message}`);
        
        // 更新错误消息
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.generating) {
            return [...prev.slice(0, -1), {
              ...lastMessage,
              content: `图片生成失败: ${error.message}`,
              generating: false
            }];
          }
          return prev;
        });
        
        return;
      }
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
        timestamp: new Date(),
        knowledgeBaseIds: knowledgeBaseIds // 保存知识库IDs
      };

      // 保存用户消息到txt文件
      if (typeof window !== 'undefined' && window.electron && window.electron.saveMessageAsTxt) {
        const txtFile = await window.electron.saveMessageAsTxt(
          currentConversation.path, 
          userMessage
        );
        userMessage.txtFile = txtFile;
      }
      
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

      // 尝试获取搜索结果或者知识库引用
      let searchResults = null;
      let knowledgeReferences = null;
      let systemMessage = '';
      
      // 检查是否有知识库引用
      if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
        try {
          console.log('开始获取知识库引用，知识库IDs:', knowledgeBaseIds);
          knowledgeReferences = await getKnowledgeBaseReferences({
            message: content,
            knowledgeBaseIds: knowledgeBaseIds,
            limit: 5,
            useCache: false  // 重要：禁用缓存，确保每次查询都是新结果
          });
          
          console.log('获取到知识库引用原始数据:', JSON.stringify(knowledgeReferences));
          
          if (knowledgeReferences && Array.isArray(knowledgeReferences) && knowledgeReferences.length > 0) {
            console.log('获取到知识库引用数量:', knowledgeReferences.length);
            
            // 对引用进行排序和过滤，降低相似度阈值
            const processedReferences = sortAndFilterReferences(knowledgeReferences, {
              similarityThreshold: 0, // 设置为0，接受所有结果
              removeDuplicates: true
            });
            console.log('处理后的引用数量:', processedReferences.length);
            
            // 格式化系统提示词
            if (Array.isArray(processedReferences) && processedReferences.length > 0) {
              try {
                // 直接生成一个简单的提示词，避免formatReferencesForModel可能的错误
                systemMessage = "以下是与用户问题相关的知识库内容，请根据这些内容回答问题，并注明引用来源：\n\n";
                
                // 手动格式化引用
                processedReferences.forEach((ref, index) => {
                  if (ref && ref.content) {
                    systemMessage += `[引用${index + 1}] ${ref.title || '未命名文档'}\n`;
                    systemMessage += `${ref.content.substring(0, 800)}\n`;
                    systemMessage += `来源: ${ref.source || '知识库'}\n\n`;
                  }
                });
                
                // 添加脚注提示
                systemMessage += `\n\n${FOOTNOTE_PROMPT}`;
              } catch (formatError) {
                console.error('格式化知识库引用失败:', formatError);
                // 创建简单的系统提示词
                systemMessage = '根据知识库内容回答以下问题，并引用来源。';
              }
            } else {
              console.log('处理后的引用为空或非数组');
              systemMessage = '根据知识库内容回答以下问题，并引用来源。';
            }
          } else {
            console.log('未获取到有效的知识库引用');
          }
        } catch (error) {
          console.error('获取知识库引用失败:', error);
          // 创建简单的系统提示词
          systemMessage = '根据知识库内容回答以下问题，并引用来源。';
        }
      }

      // 处理网络搜索
      if (useWebSearch || forceNetworkSearch) {
        try {
          console.log('正在执行网络搜索...');
          
          // 更新AI消息状态为"搜索中"
          setMessageStates(prev => ({
            ...prev,
            [aiMessage.id]: MESSAGE_STATES.SEARCHING
          }));

          // 更新AI消息内容为搜索中提示
          setMessages(prev => {
            const newMessages = [...prev];
            const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
            if (aiMessageIndex === -1) return prev;

            newMessages[aiMessageIndex] = {
              ...newMessages[aiMessageIndex],
              content: '正在搜索网络信息...',
              generating: true
            };
            return newMessages;
          });
          
          // 传递当前会话路径，用于保存图片
          const searchResponse = await tavilyService.searchAndFetchContent(content, currentConversation.path);
          console.log('搜索结果:', searchResponse);
          
          // 搜索完成后，更新消息状态为"思考中"
          setMessageStates(prev => ({
            ...prev,
            [aiMessage.id]: MESSAGE_STATES.THINKING
          }));

          // 更新AI消息内容为思考中提示
          setMessages(prev => {
            const newMessages = [...prev];
            const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
            if (aiMessageIndex === -1) return prev;

            newMessages[aiMessageIndex] = {
              ...newMessages[aiMessageIndex],
              content: '思考中...',
              generating: true
            };
            return newMessages;
          });
          
          if (searchResponse?.results?.length > 0) {
            // 添加搜索结果到提示词
            const searchPrompt = getWebSearchPrompt(userMessage, searchResponse.query, searchResponse.results, searchResponse.images);
            
            console.log('搜索提示词:', searchPrompt);
            
            // 如果已经有知识库提示词，合并提示词
            if (systemMessage) {
              systemMessage += '\n\n' + searchPrompt;
            } else {
              systemMessage = searchPrompt;
            }
            
            // 保存搜索结果
            searchResults = searchResponse.results;
            console.log('搜索结果处理完成');
          }
          
          // 处理搜索返回的图片
          if (searchResponse.images && searchResponse.images.length > 0) {
            console.log('搜索返回图片结果:', searchResponse.images);
            
            // 检查用户是否启用了包含图片选项
            const includeImages = localStorage.getItem('aichat_tavily_include_images') === 'true';
            
            if (includeImages) {
              // 确保searchResults对象存在
              searchResults = searchResults || {};
              // 添加图片到searchResults
              searchResults.images = searchResponse.images;
              console.log('根据用户设置，包含搜索图片结果');
            } else {
              console.log('根据用户设置，不包含搜索图片结果');
              // 如果用户禁用了图片，确保不添加图片数据
              if (searchResults && searchResults.images) {
                delete searchResults.images;
              }
            }
          }
        } catch (error) {
          console.error('搜索失败:', error);
          
          // 更新消息状态为错误
          setMessageStates(prev => ({
            ...prev,
            [aiMessage.id]: MESSAGE_STATES.ERROR
          }));
          
          // 更新消息内容为错误信息
          setMessages(prev => {
            const newMessages = [...prev];
            const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
            if (aiMessageIndex === -1) return prev;

            newMessages[aiMessageIndex] = {
              ...newMessages[aiMessageIndex],
              content: `搜索失败: ${error.message}`,
              generating: false
            };
            return newMessages;
          });
          
          return; // 搜索失败时退出
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
      
      // 如果有搜索系统消息或知识库引用，添加到消息列表
      if (systemMessage) {
        messagesHistory.push({
          role: 'system',
          content: systemMessage
        });
      }

      // 获取历史消息数量设置
      const maxHistoryMessages = getMaxHistoryMessages();
      
      // 调试输出
      console.log(`使用历史消息数量设置: ${maxHistoryMessages}，当前消息总数: ${messages.length}`);
      
      // 获取历史消息
      const recentMessages = maxHistoryMessages === 0 ? [] : messages
        .slice(maxHistoryMessages === 21 ? 0 : Math.max(0, messages.length - maxHistoryMessages))
        .filter(msg => msg.type === 'user' || msg.type === 'assistant')
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content || ''
        }));
      
      // 调试输出
      console.log(`过滤后历史消息数量: ${recentMessages.length}`);

      messagesHistory.push(...recentMessages);

      // 添加新的用户消息
      messagesHistory.push({
        role: 'user',
        content: content
      });

      // 调用AI接口
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
      let aiTxtFile = null;
      if (typeof window !== 'undefined' && window.electron && window.electron.saveMessageAsTxt) {
        aiTxtFile = await window.electron.saveMessageAsTxt(
          currentConversation.path,
          {
            ...aiMessage,
            content: `${response.reasoning_content ? `推理过程:\n${response.reasoning_content}\n\n回答:\n` : ''}${response.content}`,
            fileName: `${formatAIChatTime(aiMessage.timestamp)} • 模型: ${selectedModel} • Token: ${response.usage?.total_tokens || 0}`
          }
        );
      }

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
        searchResults: searchResults,
        knowledgeReferences: knowledgeReferences
      };
      
      // 如果搜索结果包含图片，添加到finalAiMessage
      if (searchResults && searchResults.images) {
        finalAiMessage.searchImages = searchResults.images;
      }

      // 更新消息列表
      const finalMessages = messagesWithAI.map(msg => 
        msg.id === aiMessage.id ? finalAiMessage : msg
      );
      setMessages(finalMessages);

      // 更新消息状态
      setMessageStates(prev => ({
        ...prev,
        [aiMessage.id]: MESSAGE_STATES.COMPLETED
      }));

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('生成已被用户中止');
        return;
      }
      console.error('发送消息失败:', error);
      
      if (aiMessage) {
        // 更新消息状态
        setMessageStates(prev => ({
          ...prev,
          [aiMessage.id]: MESSAGE_STATES.ERROR
        }));

        // 更新消息内容为错误信息
        setMessages(prev => {
          const newMessages = [...prev];
          const index = newMessages.findIndex(msg => msg.id === aiMessage.id);
          if (index === -1) return prev;

          newMessages[index] = {
            ...newMessages[index],
            content: `**错误信息**:\n\`\`\`\n${error.message}\n\`\`\``,
            generating: false,
            error: true
          };
          return newMessages;
        });
      }
    } finally {
      setAbortController(null);
      setIsGenerating(false);
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
      // 从localStorage中获取已选择的知识库
      const savedBasesStr = localStorage.getItem('aichat_selected_knowledge_bases');
      let knowledgeBaseIds = [];
      
      if (savedBasesStr) {
        try {
          const savedBases = JSON.parse(savedBasesStr);
          knowledgeBaseIds = savedBases.map(base => base.id);
        } catch (error) {
          console.error('解析已保存的知识库失败:', error);
        }
      }
      
      // 创建包含知识库信息的参数
      const messageParams = {
        knowledgeBaseIds: knowledgeBaseIds,
        useWebSearch: localStorage.getItem('aichat_use_web_search') === 'true'
      };
      
      // 调用发送消息函数并传递参数
      handleSendMessage(messageParams);
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
    handleStop,
    resetInputHandlers: inputHandlers.resetInputHandlers
  };
}; 