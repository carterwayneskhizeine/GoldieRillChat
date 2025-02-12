import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';

export const useMessageState = (currentConversation) => {
  // 消息列表状态
  const [messages, setMessages] = useState([]);
  
  // 消息编辑状态
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  
  // 消息折叠状态
  const [collapsedMessages, setCollapsedMessages] = useState(new Set());
  
  // 重试相关状态
  const [retryingMessageId, setRetryingMessageId] = useState(null);
  const [failedMessages, setFailedMessages] = useState(new Set());

  // 消息状态和动画状态
  const [messageStates, setMessageStates] = useState({});
  const [animationStates, setAnimationStates] = useState({});

  // 当 currentConversation 改变时加载对应的消息
  useEffect(() => {
    if (currentConversation) {
      const loadMessages = async () => {
        try {
          const loadedMessages = await window.electron.loadMessages(
            currentConversation.path,
            currentConversation.id
          );
          
          // 确保 loadedMessages 是数组
          if (!Array.isArray(loadedMessages)) {
            console.error('加载的消息不是数组:', loadedMessages);
            setMessages([]);
            return;
          }
          
          // 确保每个 AI 消息都有必要的历史记录字段
          const processedMessages = loadedMessages.map(msg => {
            if (msg.type === 'assistant') {
              return {
                ...msg,
                history: msg.history || [],
                currentHistoryIndex: msg.history?.length || 0, // 默认显示最新的回复
                currentContent: msg.content // 保存当前内容
              };
            }
            return msg;
          });
          
          setMessages(processedMessages);
        } catch (error) {
          console.error('加载消息失败:', error);
          setMessages([]);
        }
      };
      loadMessages();
    } else {
      setMessages([]);
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
    editingMessageId,
    setEditingMessageId,
    editContent,
    setEditContent,
    collapsedMessages,
    setCollapsedMessages,
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