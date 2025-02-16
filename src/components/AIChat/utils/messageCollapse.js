/**
 * 判断消息是否应该显示折叠按钮
 * @param {Object} message - 消息对象
 * @returns {boolean} - 是否应该显示折叠按钮
 */
export const shouldCollapseMessage = (message) => {
  if (!message.content) return false;
  return message.content.split('\n').length > 6 || message.content.length > 300;
};

/**
 * 获取消息内容的样式
 * @param {boolean} isCollapsed - 是否已折叠
 * @returns {Object} - 样式对象
 */
export const getMessageContentStyle = (isCollapsed) => {
  if (isCollapsed) {
    return {
      maxHeight: '100px',
      overflow: 'hidden',
      maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
    };
  }
  return {};
}; 