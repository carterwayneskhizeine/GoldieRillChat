import { MODEL_PROVIDERS } from '../constants';

// 解析语音命令参数
const parseAudioCommand = (content) => {
  const args = content.slice(5).trim().split('--');
  const text = args[0].trim();
  const params = {
    model: 'step-tts-mini',
    voice: MODEL_PROVIDERS.stepfun.tts.defaultVoice,
    format: MODEL_PROVIDERS.stepfun.tts.defaultFormat,
    volume: MODEL_PROVIDERS.stepfun.tts.defaultVolume,
    speed: MODEL_PROVIDERS.stepfun.tts.defaultSpeed
  };

  // 解析其他参数
  for (let i = 1; i < args.length; i++) {
    const [key, value] = args[i].trim().split(' ');
    if (key === 'voice' && value) {
      params.voice = value;
    } else if (key === 'format' && value) {
      params.format = value;
    } else if (key === 'volume' && !isNaN(value)) {
      params.volume = Math.min(Math.max(parseFloat(value), 0.1), 2.0);
    } else if (key === 'speed' && !isNaN(value)) {
      params.speed = Math.min(Math.max(parseFloat(value), 0.5), 2.0);
    }
  }

  return { text, ...params };
};

// 处理语音生成命令
export const handleAudioCommand = async ({
  content,
  currentConversation,
  apiKey,
  apiHost,
  addMessage,
  setMessages,
  window
}) => {
  try {
    // 解析命令
    const { text, model, voice, format, volume, speed } = parseAudioCommand(content);
    if (!text) {
      throw new Error('请提供要转换为语音的文本');
    }

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
    setMessages(prev => [...prev, userMessage]);

    // 创建 AI 消息对象
    const aiMessage = {
      id: Date.now() + 1,
      content: '正在生成语音...',
      type: 'assistant',
      timestamp: new Date(),
      generating: true,
      model: model
    };

    // 更新消息列表
    setMessages(prev => [...prev, aiMessage]);

    // 移除可能重复的 v1 路径
    const baseUrl = apiHost.endsWith('/v1') ? apiHost : `${apiHost}/v1`;

    // 调用语音生成 API
    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        format,
        volume,
        speed
      })
    });

    if (!response.ok) {
      throw new Error(`语音生成失败: ${response.status} ${response.statusText}`);
    }

    // 获取音频数据
    const audioBlob = await response.blob();
    
    // 保存音频文件
    const audioResult = await window.electron.saveAudioFile({
      conversationPath: currentConversation.path,
      fileName: `${Date.now()}.${format}`,
      data: await audioBlob.arrayBuffer()
    });

    // 更新最终消息
    const finalContent = `**文本：** ${text}

**音色：** ${MODEL_PROVIDERS.stepfun.tts.voices[voice]}
**音量：** ${volume}
**语速：** ${speed}`;

    // 更新消息
    setMessages(prev => prev.map(msg =>
      msg.id === aiMessage.id ? {
        ...msg,
        content: finalContent,
        generating: false,
        files: [{
          name: audioResult.fileName,
          path: audioResult.path,
          type: `audio/${format}`
        }],
        audioParams: {
          text,
          voice,
          volume,
          speed
        }
      } : msg
    ));

    // 保存消息到文件
    const aiTxtFile = await window.electron.saveMessageAsTxt(
      currentConversation.path,
      {
        ...aiMessage,
        content: finalContent,
        fileName: `${new Date().toISOString()} • 语音生成 • ${MODEL_PROVIDERS.stepfun.tts.voices[voice]}`
      }
    );

    // 更新最终消息
    setMessages(prev => prev.map(msg =>
      msg.id === aiMessage.id ? {
        ...msg,
        txtFile: aiTxtFile
      } : msg
    ));

  } catch (error) {
    console.error('语音生成失败:', error);
    throw error;
  }
}; 