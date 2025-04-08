// 解析视频命令参数
const parseVideoCommand = (content) => {
  const args = content.slice(7).trim().split('--');
  const prompt = args[0].trim();
  const params = {};

  // 解析其他参数
  for (let i = 1; i < args.length; i++) {
    const [key, value] = args[i].trim().split(' ');
    if (key === 'model' && value) {
      params.model = value;
    } else if (key === 'image' && value) {
      params.image = value;
    }
  }

  return { prompt, ...params };
};

// 处理视频生成命令
export const handleVideoCommand = async ({
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
    const { prompt, model: commandModel, image } = parseVideoCommand(content);
    if (!prompt) {
      throw new Error('请提供视频生成提示词');
    }

    // 使用命令中指定的模型或默认模型
    const model = commandModel || 'default-video-model';

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
      content: '正在生成视频...',
      type: 'assistant',
      timestamp: new Date(),
      generating: true,
      model: model
    };

    // 更新消息列表
    setMessages(prev => [...prev, aiMessage]);

    // 调用视频生成 API
    const { requestId, seed } = await window.video.generate({
      prompt,
      model,
      image,
      seed: Math.floor(Math.random() * 9999999999), // 使用随机种子
      conversationPath: currentConversation.path,
      apiKey,
      apiHost
    });

    // 轮询视频状态
    let status;
    do {
      // 等待 2 秒再查询
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 获取视频状态
      const result = await window.video.getStatus({
        requestId,
        apiKey,
        apiHost
      });

      status = result.status;

      // 更新生成状态消息
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessage.id ? {
          ...msg,
          content: `正在生成视频...\n当前状态: ${status}\n${result.position ? `队列位置: ${result.position}` : ''}\n${result.reason ? `原因: ${result.reason}` : ''}`
        } : msg
      ));

      // 如果生成成功，下载视频
      if (status === 'Succeed' && result.url) {
        // 下载视频
        const videoResult = await window.video.download({
          url: result.url,
          conversationPath: currentConversation.path
        });

        // 更新最终消息
        const finalContent = `**提示词：** ${prompt}

**模型：** ${model}
**种子：** ${seed}

<video controls>
  <source src="local-file://${videoResult.path}" type="video/mp4">
  您的浏览器不支持视频播放。
</video>`;

        // 更新消息
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessage.id ? {
            ...msg,
            content: finalContent,
            generating: false,
            files: [{
              name: videoResult.fileName,
              path: videoResult.path,
              type: 'video/mp4'
            }],
            seed: seed,
            originalPrompt: prompt
          } : msg
        ));

        // 保存消息到文件
        const aiTxtFile = await window.electron.saveMessageAsTxt(
          currentConversation.path,
          {
            ...aiMessage,
            content: finalContent,
            fileName: `${videoResult.timestamp} • 视频生成 • Seed: ${seed}`
          }
        );

        // 更新最终消息
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessage.id ? {
            ...msg,
            txtFile: aiTxtFile
          } : msg
        ));

        break;
      }
    } while (status === 'InProgress');

  } catch (error) {
    console.error('视频生成失败:', error);
    throw error;
  }
}; 