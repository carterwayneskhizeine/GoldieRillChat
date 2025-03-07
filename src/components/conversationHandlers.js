// 会话删除处理函数
export const handleDeleteConversation = async (conversation, {
  conversations,
  currentConversation,
  setConversations,
  setCurrentConversation,
  setMessages,
  storagePath,
  window
}) => {
  try {
    // 如果要删除的是当前对话，先切换到其他会话
    if (currentConversation?.id === conversation.id) {
      // 找到一个不是当前会话的会话
      const otherConversation = conversations.find(c => c.id !== conversation.id);
      if (otherConversation) {
        setCurrentConversation(otherConversation);
        // 加载其他会话的消息
        try {
          const loadedMessages = await window.electron.loadMessages(otherConversation.path, otherConversation.id);
          setMessages(loadedMessages || []);
          localStorage.setItem('aichat_current_conversation', JSON.stringify(otherConversation));
        } catch (error) {
          console.error('加载其他会话消息失败:', error);
          setMessages([]);
        }
      } else {
        // 如果没有其他会话，清空当前会话
        setCurrentConversation(null);
        setMessages([]);
        localStorage.setItem('aichat_current_conversation', '');
      }
      
      // 等待状态更新完成
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 更新状态
    const updatedConversations = conversations.filter(c => c.id !== conversation.id);
    setConversations(updatedConversations);
    
    // 更新存储
    localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));

    // 尝试移动文件夹到回收站
    try {
      // 确保 RecycleBin 文件夹存在
      const recycleBinPath = window.electron.path.join(storagePath, 'RecycleBin');
      try {
        await window.electron.createAIChatFolder(recycleBinPath);
      } catch (error) {
        // 如果文件夹已存在，忽略错误
        if (!error.message.includes('EEXIST')) {
          console.error('创建回收站文件夹失败:', error);
        }
      }

      // 检查源文件夹是否存在
      const exists = await window.electron.checkFolderExists(conversation.path);
      if (exists) {
        // 尝试关闭所有打开的文件句柄
        try {
          // 先保存一个空的 messages.json 文件
          await window.electron.saveMessages(conversation.path, conversation.id, []);
          // 等待文件操作完成
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn('保存空消息文件失败:', error);
        }

        // 尝试最多3次移动文件夹
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await window.electron.moveFolderToRecycle(conversation.path);
            break; // 如果成功，跳出循环
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              // 如果最后一次尝试仍然失败，尝试直接删除
              try {
                await window.electron.deleteFolderDirectly(conversation.path);
              } catch (deleteError) {
                console.error('直接删除文件夹失败:', deleteError);
              }
            } else {
              // 等待更长时间后重试
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            }
          }
        }
      }
    } catch (error) {
      console.error('移动文件夹失败:', error);
    }
  } catch (error) {
    console.error('删除会话失败:', error);
    throw error;
  }
};

// 会话重命名处理函数
export const handleRenameConversation = async (conversation, newName, {
  conversations,
  currentConversation,
  setConversations,
  setCurrentConversation,
  window
}) => {
  try {
    // 保存旧路径，用于更新消息路径
    const oldPath = conversation.path;
    
    const result = await window.electron.renameChatFolder(conversation.path, newName);
    
    // 更新会话列表
    const updatedConversations = conversations.map(conv => 
      conv.id === conversation.id 
        ? { ...conv, name: result.name, path: result.path }
        : conv
    );
    
    setConversations(updatedConversations);
    if (currentConversation?.id === conversation.id) {
      setCurrentConversation({ ...currentConversation, name: result.name, path: result.path });
    }
    
    // 更新存储
    localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
    
    // 更新消息中的路径信息
    try {
      console.log('更新消息路径:', oldPath, '->', result.path);
      await window.electron.updateMessagesPath(oldPath, result.path);
    } catch (pathError) {
      console.error('更新消息路径失败:', pathError);
      // 不中断重命名流程，仅记录错误
    }
  } catch (error) {
    console.error('重命名失败:', error);
    throw error;
  }
};

// 拖拽开始处理函数
export const handleDragStart = (conversation, setDraggedConversation) => {
  setDraggedConversation(conversation);
};

// 拖拽悬停处理函数
export const handleDragOver = (e) => {
  e.preventDefault();
};

// 拖拽放置处理函数
export const handleDrop = (targetConversation, draggedConversation, conversations, setConversations, setDraggedConversation) => {
  if (!draggedConversation || targetConversation.id === draggedConversation.id) {
    return;
  }

  const updatedConversations = [...conversations];
  const draggedIndex = conversations.findIndex(c => c.id === draggedConversation.id);
  const targetIndex = conversations.findIndex(c => c.id === targetConversation.id);

  updatedConversations.splice(draggedIndex, 1);
  updatedConversations.splice(targetIndex, 0, draggedConversation);

  setConversations(updatedConversations);
  setDraggedConversation(null);
  localStorage.setItem('aichat_conversations', JSON.stringify(updatedConversations));
};

// 右键菜单处理函数
export const handleContextMenu = (e, conversation, setContextMenu) => {
  e.preventDefault();
  const rect = e.currentTarget.getBoundingClientRect();
  setContextMenu({ 
    visible: true, 
    x: rect.right, 
    y: rect.top, 
    type: 'aichat', 
    data: conversation 
  });
}; 