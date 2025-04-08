/**
 * 切换消息的折叠状态
 * @param {string} messageId - 消息ID
 * @param {Set} collapsedMessages - 当前折叠的消息集合
 * @param {Function} setCollapsedMessages - 更新折叠消息集合的函数
 */
export const toggleMessageCollapse = (messageId, collapsedMessages, setCollapsedMessages) => {
  if (!setCollapsedMessages || typeof setCollapsedMessages !== 'function') {
    return;
  }
  
  setCollapsedMessages(prev => {
    const newSet = new Set(prev);
    if (newSet.has(messageId)) {
      newSet.delete(messageId);
    } else {
      newSet.add(messageId);
    }
    return newSet;
  });

  // 使用setTimeout确保状态更新后再滚动
  setTimeout(() => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, 100);
} 