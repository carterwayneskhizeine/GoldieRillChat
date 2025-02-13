import { useState } from 'react';
import { handleMessageCollapse } from '../utils/messageCollapse';

export const useMessageCollapse = () => {
  // 存储已折叠消息的 ID 集合，添加 aichat_ 前缀以隔离状态
  const [collapsedMessages, setCollapsedMessages] = useState(new Set());

  // 切换消息折叠状态
  const toggleMessageCollapse = (messageId, isCollapsed) => {
    // 添加命名空间前缀
    const namespacedId = `aichat_${messageId}`;
    handleMessageCollapse(namespacedId, isCollapsed, collapsedMessages, setCollapsedMessages);
  };

  // 检查消息是否已折叠
  const isMessageCollapsed = (messageId) => {
    // 添加命名空间前缀
    const namespacedId = `aichat_${messageId}`;
    return collapsedMessages.has(namespacedId);
  };

  // 重置所有折叠状态
  const resetCollapsedMessages = () => {
    setCollapsedMessages(new Set());
  };

  return {
    collapsedMessages,
    setCollapsedMessages,
    toggleMessageCollapse,
    isMessageCollapsed,
    resetCollapsedMessages
  };
};