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

  // 函数用于重置所有状态
  const resetState = () => {
    // 更新当前对话ID
    setCurrentConversationId(currentConversation?.id || null);
    
    // 重置所有编辑状态
    setEditingMessageId(null);
    setEditContent('');
    setRetryingMessageId(null);
    setFailedMessages(new Set());
    setMessageStates({});
    setAnimationStates({});
    
    // 清空消息，避免显示旧对话的消息
    setMessages([]);
  };

  // 当对话改变时重置状态
  useEffect(() => {
    console.log('useMessageState检测到对话变化:', {
      conversationId: currentConversation?.id,
      path: currentConversation?.path,
    });

    // 清除状态
    resetState();
    
    // 加载新对话的消息
    if (currentConversation?.path) {
      // 检查文件夹路径是否存在，并获取最新路径
      const checkPathAndLoadMessages = async () => {
        let updatedPath = currentConversation.path;
        
        // 首先验证会话文件夹路径是否存在
        try {
          await window.electron.access(currentConversation.path);
        } catch (pathError) {
          // 检查localStorage是否有更新的路径
          try {
            const savedConversations = JSON.parse(localStorage.getItem('aichat_conversations') || '[]');
            const updatedConversation = savedConversations.find(c => c.id === currentConversation.id);
            if (updatedConversation && updatedConversation.path !== currentConversation.path) {
              console.log('加载消息时检测到会话路径已更新:', {
                oldPath: currentConversation.path,
                newPath: updatedConversation.path
              });
              updatedPath = updatedConversation.path;
              // 验证新路径是否存在
              await window.electron.access(updatedPath);
            } else {
              console.error('文件夹路径不存在且无法从localStorage恢复:', pathError);
              setMessages([]);
              return;
            }
          } catch (storageError) {
            console.error('读取localStorage失败:', storageError);
            setMessages([]);
            return;
          }
        }
        
        // 使用正确的路径加载消息
        try {
          const loadedMessages = await window.electron.loadMessages(updatedPath);
          if (Array.isArray(loadedMessages)) {
            console.log('成功加载消息，对话ID:', currentConversation.id, '消息数量:', loadedMessages.length);
            setMessages(loadedMessages);
          } else {
            console.warn('加载的消息不是数组:', loadedMessages);
            setMessages([]);
          }
        } catch (error) {
          console.error('加载消息失败:', error);
          setMessages([]);
        }
      };
      
      checkPathAndLoadMessages();
    } else {
      // 如果没有路径，清空消息
      console.warn('对话没有路径:', currentConversation);
      setMessages([]);
    }
  }, [currentConversation?.id]); // 只监听对话ID的变化

  // 消息持久化
  useEffect(() => {
    if (!currentConversation || !messages.length) return;

    const saveMessages = async () => {
      try {
        // 检查文件夹路径是否存在，并获取最新路径
        let updatedPath = currentConversation.path;
        
        try {
          await window.electron.access(currentConversation.path);
        } catch (pathError) {
          // 检查localStorage是否有更新的路径
          try {
            const savedConversations = JSON.parse(localStorage.getItem('aichat_conversations') || '[]');
            const updatedConversation = savedConversations.find(c => c.id === currentConversation.id);
            if (updatedConversation && updatedConversation.path !== currentConversation.path) {
              console.log('保存消息时检测到会话路径已更新:', {
                oldPath: currentConversation.path,
                newPath: updatedConversation.path
              });
              updatedPath = updatedConversation.path;
              // 验证新路径是否存在
              await window.electron.access(updatedPath);
            } else {
              console.error('保存消息失败: 文件夹路径不存在且无法从localStorage恢复');
              return;
            }
          } catch (storageError) {
            console.error('读取localStorage失败:', storageError);
            return;
          }
        }
        
        await window.electron.saveMessages(
          updatedPath,
          currentConversation.id,
          messages
        );
        console.log('消息已保存，对话ID:', currentConversation.id);
      } catch (error) {
        console.error('保存消息失败:', error);
      }
    };

    // 使用防抖来避免频繁保存
    const timeoutId = setTimeout(saveMessages, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages, currentConversation?.id]);

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