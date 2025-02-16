import { useState } from 'react';

export const useMessageCollapse = () => {
  const [collapsedMessages, setCollapsedMessages] = useState(new Set());

  const toggleMessageCollapse = (messageId, isCollapsed) => {
    const newSet = new Set([...collapsedMessages]);
    const namespacedId = `aichat_${messageId}`;
    
    if (isCollapsed) {
      newSet.delete(namespacedId);
      setCollapsedMessages(newSet);
      setTimeout(() => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"][data-aichat-message="true"]`);
        messageElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } else {
      newSet.add(namespacedId);
      setCollapsedMessages(newSet);
      setTimeout(() => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"][data-aichat-message="true"]`);
        messageElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  };

  const isMessageCollapsed = (messageId) => {
    return collapsedMessages.has(`aichat_${messageId}`);
  };

  return {
    isMessageCollapsed,
    toggleMessageCollapse
  };
};