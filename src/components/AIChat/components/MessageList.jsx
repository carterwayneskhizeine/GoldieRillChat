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
  fileInputRef
}) => {
  const messagesEndRef = useRef(null);

  // 删除确认状态
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  
  // 添加拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // 使用折叠状态 hook
  const { isMessageCollapsed, toggleMessageCollapse } = useMessageCollapse();

  // 添加 Lightbox 相关状态
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]);

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
      .flatMap(msg => msg.searchImages.map((img, index) => ({
        src: img.url,
        title: `搜索图片 ${index + 1}`,
        description: img.description || '搜索相关图片',
        type: 'image'
      })));
    
    // 合并两种来源的媒体文件
    return [...mediaFromFiles, ...mediaFromSearch];
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    setTimeout(scrollToBottom, 100);
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
    const currentIndex = allMedia.findIndex(media => media.src === `local-file://${file.path}`);
    
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

  return (
    <div 
      className="flex-1 overflow-hidden bg-base-100"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      <div 
        id="ai-chat-messages-main"
        className="h-full overflow-y-auto" 
        style={{ 
          paddingBottom: '45px',
          isolation: 'isolate',
          position: 'relative',
          scrollBehavior: 'smooth'
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
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

      {/* 拖拽上传遮罩 */}
      <div 
        className={`drag-overlay ${isDragging ? '' : 'hidden'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999
        }}
      >
        <div className="drag-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-lg font-medium">拖放文件到这里上传</div>
      </div>

      {/* 删除确认对话框 */}
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

      {/* 使用 ImageLightbox 组件 */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={lightboxImages}
        startIndex={lightboxIndex}
      />
    </div>
  );
}; 