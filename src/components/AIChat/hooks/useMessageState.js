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
  
  // 文件夹修改时间
  const [folderMtime, setFolderMtime] = useState(null);

  // 当对话改变时重置状态
  useEffect(() => {
    console.log('useMessageState检测到对话变化:', {
      对话: currentConversation ? currentConversation.name : '无',
      对话ID: currentConversation ? currentConversation.id : '无',
      当前记录的对话ID: currentConversationId
    });
    
    // 直接检查当前对话是否发生变化
    if (!currentConversation) {
      // 如果没有当前对话，重置所有状态
      console.log('没有当前对话，重置所有状态');
      setMessages([]);
      setCurrentConversationId(null);
      setEditingMessageId(null);
      setEditContent(''); 
      setRetryingMessageId(null);
      setFailedMessages(new Set());
      setMessageStates({});
      setAnimationStates({});
      setFolderMtime(null);
      return;
    }
    
    // 如果当前对话ID没变，不重新加载消息
    if (currentConversationId === currentConversation.id) {
      console.log('对话ID没变，不重新加载消息:', currentConversation.id);
      return;
    }
    
    console.log('对话已变化，加载新消息:', currentConversation.name, currentConversation.id);
    
    // 立即更新当前对话ID
    setCurrentConversationId(currentConversation.id);
    
    // 重置所有状态
    setEditingMessageId(null);
    setEditContent('');
    setRetryingMessageId(null);
    setFailedMessages(new Set());
    setMessageStates({});
    setAnimationStates({});
    
    // 清空消息，避免显示旧对话的消息
    setMessages([]);
    setFolderMtime(null);

    // 加载新对话的消息
    if (currentConversation?.path) {
      window.electron.loadMessages(currentConversation.path)
        .then(loadedData => {
          if (loadedData) {
            if (typeof loadedData === 'object' && loadedData.messages && Array.isArray(loadedData.messages)) {
              // 新格式数据
              console.log('成功加载消息（新格式），对话ID:', currentConversation.id, '消息数量:', loadedData.messages.length);
              setMessages(loadedData.messages);
              
              // 设置文件夹修改时间
              if (loadedData.folderMtime) {
                console.log('设置文件夹修改时间:', new Date(loadedData.folderMtime).toLocaleString());
                setFolderMtime(loadedData.folderMtime);
                
                // 如果存在修改时间但不匹配，更新对话列表中的修改时间
                if (currentConversation.modifiedTime !== loadedData.folderMtime) {
                  window.electron.updateFolderMtime(currentConversation.path)
                    .then(newMtime => {
                      console.log('已更新文件夹修改时间:', new Date(newMtime).toLocaleString());
                      setFolderMtime(newMtime);
                    })
                    .catch(error => console.error('更新文件夹修改时间失败:', error));
                }
              }
            } else if (Array.isArray(loadedData)) {
              // 旧格式数据
              console.log('成功加载消息（旧格式），对话ID:', currentConversation.id, '消息数量:', loadedData.length);
              setMessages(loadedData);
              
              // 为旧格式创建修改时间
              window.electron.updateFolderMtime(currentConversation.path)
                .then(newMtime => {
                  console.log('已创建文件夹修改时间:', new Date(newMtime).toLocaleString());
                  setFolderMtime(newMtime);
                })
                .catch(error => console.error('创建文件夹修改时间失败:', error));
            } else {
              console.warn('加载的消息格式不正确:', loadedData);
              setMessages([]);
            }
          } else {
            console.warn('加载消息返回空数据');
            setMessages([]);
          }
        })
        .catch(error => {
          console.error('加载消息失败:', error);
          // 加载失败时也要清空消息
          setMessages([]);
        });
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
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          messages
        );
        console.log('消息已保存，对话ID:', currentConversation.id);
        
        // 更新修改时间
        const newMtime = await window.electron.updateFolderMtime(currentConversation.path);
        setFolderMtime(newMtime);
        console.log('文件夹修改时间已更新:', new Date(newMtime).toLocaleString());
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
    setAnimationStates,
    folderMtime,
    setFolderMtime
  };
}; 