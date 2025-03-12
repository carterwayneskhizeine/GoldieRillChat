import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageItem } from './MessageItem';
import { useMessageCollapse } from '../hooks/useMessageCollapse';
import '../styles/messages.css';
import { ImageLightbox } from '../../ImageLightbox';

export const MessageList = ({
  messages,
  selectedModel,
  editingMessageId,
  editContent,
  setEditContent,
  handleEditStart,
  handleEditCancel,
  handleEditSave,
  handleDeleteMessage,
  handleRetry,
  handleStop,
  handleHistoryNavigation,
  openFileLocation,
  openInBrowserTab,
  currentConversation,
  setMessages,
  handleFileDrop,
  fileInputRef,
  sidebarOpen = true,
  setShowSettings
}) => {
  const messagesEndRef = useRef(null);

  // 删除确认状态
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  
  // 添加拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // 添加用户滚动状态控制
  const [userScrolled, setUserScrolled] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  // 新增：累计向上滚动距离，用于判断用户是否真的主动向上滚动
  const accumulatedUpDeltaRef = useRef(0);
  
  // 使用折叠状态 hook
  const { isMessageCollapsed, toggleMessageCollapse } = useMessageCollapse();

  // 添加 Lightbox 相关状态
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]);

  // 添加键盘事件监听，Ctrl+S 打开设置弹窗
  useEffect(() => {
    const handleKeyPress = (e) => {
      // 检测 Ctrl+S 组合键
      if (e.ctrlKey && e.key === 's') {
        // 获取当前活动工具
        const activeTool = localStorage.getItem('active_tool') || 'aichat';
        
        // 只有当前是AI Chat界面时才处理快捷键
        if (activeTool === 'aichat') {
          e.preventDefault(); // 阻止浏览器默认的保存行为
          e.stopPropagation(); // 阻止事件冒泡，避免与App.jsx中的处理冲突
          
          // 如果设置打开函数存在，则调用
          if (typeof setShowSettings === 'function') {
            setShowSettings(true);
          }
        }
      }
    };
    
    // 添加事件监听 - 使用捕获阶段以确保能够先于其他处理函数执行
    window.addEventListener('keydown', handleKeyPress, true);
    
    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyPress, true);
    };
  }, [setShowSettings]);

  // 新增：wheel事件监听器，用于捕获鼠标滚轮方向及累积值
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e) => {
      if (e.deltaY < 0) { // 用户向上滚动
        accumulatedUpDeltaRef.current += Math.abs(e.deltaY);
      } else {
        // 向下滚动时重置累计
        accumulatedUpDeltaRef.current = 0;
      }
    };
    
    container.addEventListener('wheel', handleWheel);
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 收集所有媒体文件（图片和视频）
  const collectMedia = useCallback(() => {
    const mediaFromFiles = messages
      .filter(msg => msg.files?.some(f => f.name && f.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)))
      .flatMap(msg => msg.files
        .filter(f => f.name && f.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i))
        .map(f => ({
          src: `local-file://${f.path}`,
          title: f.name,
          description: `发送时间: ${new Date(msg.timestamp).toLocaleString()}\n文件路径: ${f.path}`,
          type: f.name.match(/\.mp4$/i) ? 'video' : 'image'
        }))
      );
      
    // 收集搜索返回的图片
    const mediaFromSearch = messages
      .filter(msg => msg.searchImages && msg.searchImages.length > 0)
      .flatMap(msg => msg.searchImages.map((img, index) => {
        // 处理URL格式以确保一致性
        let imgSrc = img.url || img.src;
        
        // 如果是file://格式，转换为local-file://
        if (imgSrc && (imgSrc.startsWith('file://'))) {
          imgSrc = imgSrc.replace('file://', 'local-file://');
        }
        
        return {
          src: imgSrc,
          title: img.title || `搜索图片 ${index + 1}`,
          description: img.description || '搜索相关图片',
          type: 'image'
        };
      }));
    
    // 合并两种来源的媒体文件
    return [...mediaFromFiles, ...mediaFromSearch];
  }, [messages]);

  const scrollToBottom = () => {
    // 如果用户已滚动且有消息正在生成，不自动滚动
    if (userScrolled && messages.some(msg => msg.generating)) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages, userScrolled]);

  // 添加滚动事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // 获取滚动位置
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScrollTop = scrollHeight - clientHeight;
      const diff = maxScrollTop - scrollTop; // 距离底部的距离
      
      // 清除之前的超时
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // 如果距底部很近且累计向上滚动量不大，认为仍在底部
      if (diff < 20 && accumulatedUpDeltaRef.current < 20) {
        scrollTimeoutRef.current = setTimeout(() => {
          setUserScrolled(false);
          // 重置累计量
          accumulatedUpDeltaRef.current = 0;
        }, 1000);
      } else {
        // 真正认为用户向上滚动了
        setUserScrolled(true);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages]);

  // AI消息完成生成后重置滚动状态
  useEffect(() => {
    const hasGeneratingMessage = messages.some(msg => msg.generating);
    if (!hasGeneratingMessage) {
      // 当没有生成中的消息时，重置用户滚动状态
      setUserScrolled(false);
    }
  }, [messages]);

  // 添加初始化消息
  useEffect(() => {
    console.log('AIChat拖放上传功能已初始化 - 请直接将文件拖放到聊天界面');
  }, []);

  // 处理删除消息
  const onDeleteMessage = async (messageId) => {
    setDeletingMessageId(messageId);
  };

  // 取消删除
  const cancelDeleteMessage = () => {
    setDeletingMessageId(null);
  };

  // 确认删除
  const confirmDeleteMessage = async () => {
    if (deletingMessageId) {
      await handleDeleteMessage(deletingMessageId);
      setDeletingMessageId(null);
    }
  };

  // 处理媒体文件点击
  const handleImageClick = useCallback((e, file) => {
    e.preventDefault();
    e.stopPropagation();
    
    const allMedia = collectMedia();
    
    // 创建标准化路径函数
    const normalizeFilePath = (path) => {
      if (!path) return '';
      // 移除协议前缀
      path = path.replace(/^(local-file:\/\/|file:\/\/)/, '');
      // 将反斜杠转换为正斜杠
      path = path.replace(/\\/g, '/');
      // 解码 URL 编码
      try {
        path = decodeURIComponent(path);
      } catch (e) {
        console.error('解码路径失败:', e);
      }
      return path;
    };
    
    // 标准化当前文件路径
    const currentFilePath = normalizeFilePath(file.path);
    console.log('当前点击的文件路径:', currentFilePath);
    
    // 查找匹配的媒体
    let currentIndex = allMedia.findIndex(media => {
      const mediaSrcPath = normalizeFilePath(media.src);
      return mediaSrcPath.includes(currentFilePath) || currentFilePath.includes(mediaSrcPath);
    });
    
    // 如果没找到匹配，使用第一个作为默认
    if (currentIndex === -1) {
      console.warn('未找到匹配的媒体文件，使用第一个文件');
      currentIndex = 0;
    }
    
    console.log(`找到媒体文件索引: ${currentIndex}, 总媒体数: ${allMedia.length}`);
    
    setLightboxImages(allMedia);
    setLightboxIndex(currentIndex);
    setLightboxOpen(true);
  }, [collectMedia]);
  
  // 添加拖拽处理函数
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 保持isDragging状态为true，以确保拖放遮罩显示
    setIsDragging(true);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 重置拖拽状态
    setIsDragging(false);
    dragCounterRef.current = 0;
    
    console.log('Drop event detected:', e.dataTransfer.files);
    
    // 确保有文件且handleFileDrop是一个函数
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && typeof handleFileDrop === 'function') {
      handleFileDrop(e);
    }
  };

  // 处理鼠标移动检测滚动条距离
  const handleMouseMove = (e) => {
    const messagesContainer = containerRef.current;
    if (!messagesContainer) return;
    
    const containerRect = messagesContainer.getBoundingClientRect();
    const distanceToRightEdge = containerRect.right - e.clientX;
    
    // 如果鼠标距离容器右边缘20px以内，添加滚动条放大类
    if (distanceToRightEdge <= 20 && distanceToRightEdge >= 0) {
      messagesContainer.classList.add('scrollbar-expanded');
    } else {
      messagesContainer.classList.remove('scrollbar-expanded');
    }
  };

  // 处理鼠标离开消息容器
  const handleMouseLeave = () => {
    const messagesContainer = containerRef.current;
    if (messagesContainer) {
      messagesContainer.classList.remove('scrollbar-expanded');
    }
  };

  return (
    <div 
      className="flex-1 overflow-hidden bg-base-100"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      <div 
        id="ai-chat-messages-main"
        className="h-full overflow-y-auto relative" 
        style={{ 
          paddingBottom: '45px',
          isolation: 'isolate',
          position: 'relative',
          scrollBehavior: 'smooth'
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* 添加AI Chat界面滚动到底部按钮 - 输入框正上方 */}
        {userScrolled && messages.length > 0 && sidebarOpen && (
          <div 
            className="fixed w-full flex justify-center items-center z-50 pointer-events-none"
            style={{ bottom: '140px', right: '-106px' }} // 使用px单位精确控制距底部的距离
          >
            <button 
              className="btn btn-ghost btn-sm btn-circle bg-transparent backdrop-blur-sm pointer-events-auto shadow-md"
              onClick={(e) => {
                // 阻止事件冒泡和默认行为
                e.stopPropagation();
                e.preventDefault();
                setUserScrolled(false);
                setTimeout(scrollToBottom, 50);
              }}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7 7m0 0l7-7m-7 7V3" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="space-y-4 p-4 max-w-[1200px] mx-auto">
          {messages.map(message => (
            <MessageItem
              key={message.id}
              message={message}
              selectedModel={selectedModel}
              editingMessageId={editingMessageId}
              editContent={editContent}
              setEditContent={setEditContent}
              handleEditStart={handleEditStart}
              handleEditCancel={handleEditCancel}
              handleEditSave={handleEditSave}
              handleDeleteMessage={onDeleteMessage}
              handleRetry={handleRetry}
              handleStop={handleStop}
              handleHistoryNavigation={handleHistoryNavigation}
              isCollapsed={isMessageCollapsed(message.id)}
              onToggleCollapse={() => toggleMessageCollapse(message.id)}
              onImageClick={handleImageClick}
              openFileLocation={openFileLocation}
              openInBrowserTab={openInBrowserTab}
              currentConversation={currentConversation}
              setMessages={setMessages}
              messages={messages}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* 弹窗确认删除消息 */}
      {deletingMessageId && (
        <div className="modal modal-open flex items-center justify-center">
          <div role="alert" className="alert w-[400px]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info h-6 w-6 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Delete this message?</span>
            <div>
              <button className="btn btn-sm" onClick={cancelDeleteMessage}>No</button>
              <button className="btn btn-sm btn-primary ml-2" onClick={confirmDeleteMessage}>Yes</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={cancelDeleteMessage}></div>
        </div>
      )}
      
      {/* 图片查看器 */}
      {lightboxOpen && (
        <ImageLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={lightboxImages}
          startIndex={lightboxIndex}
        />
      )}
    </div>
  );
}; 