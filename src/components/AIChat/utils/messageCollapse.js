/**
 * 检查消息是否需要折叠
 * @param {Object} message - 消息对象
 * @returns {boolean} - 是否需要折叠
 */
export const shouldCollapseMessage = (message) => {
  if (!message.content) return false;
  return message.content.split('\n').length > 6 || message.content.length > 300;
};

/**
 * 处理消息折叠状态变化
 * @param {string} messageId - 消息ID（带命名空间）
 * @param {boolean} isCollapsed - 当前折叠状态
 * @param {Set} collapsedMessages - 已折叠消息集合
 * @param {Function} setCollapsedMessages - 设置折叠状态的函数
 * @param {string} scrollBehavior - 滚动行为
 */
export const handleMessageCollapse = (messageId, isCollapsed, collapsedMessages, setCollapsedMessages, scrollBehavior = 'smooth') => {
  // 移除命名空间前缀以获取实际的消息ID
  const actualMessageId = messageId.replace('aichat_', '');
  // 使用 AI Chat 专用的选择器
  const messageElement = document.querySelector(`[data-message-id="${actualMessageId}"][data-aichat-message="true"]`);
  const newSet = new Set([...collapsedMessages]);
  
  if (isCollapsed) {
    // 展开消息
    newSet.delete(messageId);
    setCollapsedMessages(newSet);
    // 等待状态更新后滚动
    setTimeout(() => {
      messageElement?.scrollIntoView({
        behavior: scrollBehavior,
        block: 'start'
      });
    }, 100);
  } else {
    // 折叠消息
    newSet.add(messageId);
    setCollapsedMessages(newSet);
    // 等待状态更新后滚动
    setTimeout(() => {
      messageElement?.scrollIntoView({
        behavior: scrollBehavior,
        block: 'center'
      });
    }, 100);
  }
};

/**
 * 获取消息内容的样式
 * @param {boolean} isCollapsed - 是否折叠
 * @returns {Object} - 样式对象
 */
export const getMessageContentStyle = (isCollapsed) => {
  return {
    maxHeight: isCollapsed ? '100px' : 'none',
    overflow: isCollapsed ? 'hidden' : 'visible',
    maskImage: isCollapsed ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
    WebkitMaskImage: isCollapsed ? 'linear-gradient(to bottom, black 60%, transparent 100%)' : 'none',
    transition: 'max-height 0.3s ease-out'
  };
}; 