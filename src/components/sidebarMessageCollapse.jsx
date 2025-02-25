import React from 'react';

/**
 * 侧边栏消息折叠功能
 * @param {string} messageId - 消息ID
 * @param {Set} collapsedMessages - 当前折叠的消息集合
 * @param {Function} setCollapsedMessages - 更新折叠消息集合的函数
 */
export const toggleSidebarMessageCollapse = (messageId, collapsedMessages, setCollapsedMessages) => {
  if (typeof setCollapsedMessages !== 'function') {
    console.error('setCollapsedMessages 不是一个函数!');
    return;
  }
  
  const isCollapsed = collapsedMessages.has(messageId);
  const newSet = new Set([...collapsedMessages]);
  
  if (isCollapsed) {
    newSet.delete(messageId);
  } else {
    newSet.add(messageId);
  }
  
  setCollapsedMessages(newSet);
};

/**
 * 侧边栏消息折叠按钮组件
 * @param {Object} props - 组件属性
 * @param {string} props.messageId - 消息ID
 * @param {Set} props.collapsedMessages - 折叠消息集合
 * @param {Function} props.setCollapsedMessages - 更新折叠消息集合的函数
 */
export const SidebarCollapseButton = ({ messageId, collapsedMessages, setCollapsedMessages }) => {
  if (!messageId || !collapsedMessages || typeof setCollapsedMessages !== 'function') {
    return null;
  }
  
  const isCollapsed = collapsedMessages.has(messageId);
  
  return (
    <div
      className="collapse-button"
      style={{
        position: 'sticky',
        top: '-15px',
        float: 'right',
        marginLeft: '8px',
        marginRight: '0px',
        zIndex: 100,
        pointerEvents: 'all'
      }}
    >
      <button 
        className="btn btn-xs btn-ghost btn-circle bg-base-100 hover:bg-base-200"
        style={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s',
          backgroundColor: 'var(--b1)',
          border: '1px solid var(--b3)'
        }}
        onClick={(e) => {
          e.stopPropagation();
          const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
          
          if (isCollapsed) {
            // 展开时，先滚动到消息顶部
            messageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => {
              toggleSidebarMessageCollapse(messageId, collapsedMessages, setCollapsedMessages);
            }, 100);
          } else {
            // 折叠时，滚动到消息中间
            toggleSidebarMessageCollapse(messageId, collapsedMessages, setCollapsedMessages);
            setTimeout(() => {
              messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }}
      >
        {isCollapsed ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>
    </div>
  );
};

/**
 * 判断消息是否应该显示折叠按钮
 * @param {string} content - 消息内容
 * @param {Object} message - 消息对象
 * @returns {boolean} - 是否应该显示折叠按钮
 */
export const shouldShowCollapseButton = (content, message) => {
  // 如果内容为空，不显示折叠按钮
  if (!content) {
    return false;
  }
  
  // 如果消息包含图片文件，不显示折叠按钮
  if (message && message.files && message.files.some(file => 
    file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  )) {
    return false;
  }
  
  // 计算行数和长度
  const lines = content.split('\n').length;
  const length = content.length;
  
  // 判断是否应该显示折叠按钮
  const shouldShow = lines > 6 || length > 300;
  
  return shouldShow;
};

/**
 * 获取消息内容的样式
 * @param {boolean} isCollapsed - 是否折叠
 * @returns {Object} - 样式对象
 */
export const getMessageContentStyle = (isCollapsed) => {
  return {
    className: `prose max-w-none w-full transition-all duration-200 ease-in-out ${
      isCollapsed ? 'max-h-[100px] overflow-hidden mask-bottom' : ''
    } whitespace-pre-wrap break-all`,
    style: {
      whiteSpace: 'pre-wrap',
      maxWidth: '260px'
    }
  };
}; 