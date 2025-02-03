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
    console.error('必需的属性缺失或类型错误:', {
      messageId,
      hasCollapsedMessages: !!collapsedMessages,
      setCollapsedMessagesType: typeof setCollapsedMessages
    });
    return null;
  }
  
  return (
    <div
      className="absolute right-0 flex items-center"
      style={{
        position: 'absolute',
        right: '-32px',
        top: '2px',
        zIndex: 50,
        pointerEvents: 'auto',
        cursor: 'pointer'
      }}
    >
      <button 
        className="btn btn-xs btn-ghost btn-circle bg-base-100 hover:bg-base-200"
        style={{
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation();
          toggleSidebarMessageCollapse(messageId, collapsedMessages, setCollapsedMessages);
        }}
      >
        {collapsedMessages.has(messageId) ? (
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
 * @returns {boolean} - 是否应该显示折叠按钮
 */
export const shouldShowCollapseButton = (content) => {
  return content && (content.split('\n').length > 6 || content.length > 300);
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