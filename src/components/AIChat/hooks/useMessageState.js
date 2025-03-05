import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { MESSAGE_STATES } from '../constants';

export const useMessageState = (currentConversation) => {
  // 消息列表状态
  const [messages, setMessages] = useState([]);
  
  // 添加当前对话ID跟踪
  const [currentConversationId, setCurrentConversationId] = useState(null);
  
  // 消息编辑状态
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  
  // 重试相关状态
  const [retryingMessageId, setRetryingMessageId] = useState(null);
  const [failedMessages, setFailedMessages] = useState(new Set());

  // 消息状态和动画状态
  const [messageStates, setMessageStates] = useState({});
  const [animationStates, setAnimationStates] = useState({});

  // 当对话改变时重置状态
  useEffect(() => {
    // 直接检查当前对话是否发生变化
    if (!currentConversation) {
      // 如果没有当前对话，重置所有状态
      setMessages([]);
      setCurrentConversationId(null);
      setEditingMessageId(null);
      setEditContent(''); 
      setRetryingMessageId(null);
      setFailedMessages(new Set());
      setMessageStates({});
      setAnimationStates({});
      return;
    }
    
    // 如果当前对话ID没变，不重新加载消息，避免重复加载
    if (currentConversationId === currentConversation.id) {
      return;
    }
    
    console.log('对话已变化，加载新消息:', currentConversation.name);
    
    // 重置所有状态
    setMessages([]);
    setEditingMessageId(null);
    setEditContent('');
    setRetryingMessageId(null);
    setFailedMessages(new Set());
    setMessageStates({});
    setAnimationStates({});
    
    // 更新当前对话ID
    setCurrentConversationId(currentConversation.id);

    // 加载新对话的消息
    if (currentConversation?.path) {
      window.electron.loadMessages(currentConversation.path)
        .then(loadedMessages => {
          if (Array.isArray(loadedMessages)) {
            setMessages(loadedMessages);
          }
        })
        .catch(error => {
          console.error('加载消息失败:', error);
        });
    }
  }, [currentConversation]);

  // 消息持久化
  useEffect(() => {
    const saveMessages = async () => {
      if (currentConversation && messages.length > 0) {
        try {
          await window.electron.saveMessages(
            currentConversation.path,
            currentConversation.id,
            messages
          );
        } catch (error) {
          console.error('保存消息失败:', error);
        }
      }
    };

    // 使用防抖来避免频繁保存
    const timeoutId = setTimeout(saveMessages, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages, currentConversation]);

  return {
    messages,
    setMessages,
    currentConversationId,
    editingMessageId,
    setEditingMessageId,
    editContent,
    setEditContent,
    retryingMessageId,
    setRetryingMessageId,
    failedMessages,
    setFailedMessages,
    messageStates,
    setMessageStates,
    animationStates,
    setAnimationStates
  };
}; 