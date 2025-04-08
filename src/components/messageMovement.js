export const moveMessage = async (messageId, direction, messages, isCtrlPressed, currentConversation, electron) => {
  try {
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) return messages

    const newMessages = [...messages]
    const message = newMessages[messageIndex]
    
    // 计算目标位置
    let targetIndex
    if (direction === 'top') {
      // 移动到最顶部（第一条消息之后）
      targetIndex = 0
    } else if (direction === 'bottom') {
      // 移动到最底部（最后一条消息之前）
      targetIndex = newMessages.length - 1
    } else if (isCtrlPressed) {
      // Ctrl 按下时移动到最上/最下
      targetIndex = direction === 'up' ? 0 : newMessages.length - 1
    } else {
      // 正常移动一个位置
      targetIndex = direction === 'up' ? messageIndex - 1 : messageIndex + 1
    }
    
    // 检查目标位置是否有效
    if (targetIndex < 0 || targetIndex >= newMessages.length) {
      return messages
    }
    
    // 移动消息
    newMessages.splice(messageIndex, 1)
    newMessages.splice(targetIndex, 0, message)
    
    // 保存到存储
    await electron.saveMessages(
      currentConversation.path,
      currentConversation.id,
      newMessages
    )
    
    return newMessages
  } catch (error) {
    console.error('Failed to move message:', error)
    throw new Error('移动消息失败')
  }
} 