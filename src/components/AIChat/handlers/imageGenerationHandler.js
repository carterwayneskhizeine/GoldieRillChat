export const handleImageGeneration = async (
  prompt,
  currentConversation,
  messages,
  electronApi
) => {
  try {
    // 生成唯一ID
    const messageId = Date.now().toString();
    
    // 创建用户指令消息
    const userMessage = {
      id: messageId + '_user',
      content: `/image ${prompt}`,
      type: 'user',
      timestamp: new Date().toISOString()
    };

    // 创建AI响应消息
    const assistantMessage = {
      id: messageId + '_assist',
      content: '', // 生成的内容
      type: 'assistant',
      timestamp: new Date().toISOString(),
      files: [] // 图片文件信息
    };

    // 原子性保存
    const updatedMessages = [...messages, userMessage, assistantMessage];
    await electronApi.saveMessages(
      currentConversation.path,
      currentConversation.id,
      updatedMessages
    );

    // 图片生成过程...
    // 生成完成后只更新assistantMessage
    const finalMessages = updatedMessages.map(msg => {
      if (msg.id === assistantMessage.id) {
        return {
          ...msg,
          content: generatedContent,
          files: [imageFileInfo]
        };
      }
      return msg;
    });

    await electronApi.saveMessages(
      currentConversation.path,
      currentConversation.id,
      finalMessages
    );

    return finalMessages;
  } catch (error) {
    console.error('图片生成失败:', error);
    throw error;
  }
}; 