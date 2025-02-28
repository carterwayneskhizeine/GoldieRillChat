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
  setMessages
}) => {
  const messagesEndRef = useRef(null);

  // 删除确认状态
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // 使用折叠状态 hook
  const { isMessageCollapsed, toggleMessageCollapse } = useMessageCollapse();

  // 添加 Lightbox 相关状态
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]);

  // 收集所有媒体文件（图片和视频）
  const collectMedia = useCallback(() => {
    return messages
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
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages]);

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

  return (
    <div className="flex-1 overflow-hidden bg-base-100">
      <div 
        id="ai-chat-messages-main"
        className="h-full overflow-y-auto" 
        style={{ 
          paddingBottom: '45px',
          isolation: 'isolate',
          position: 'relative',
          scrollBehavior: 'smooth'
        }}
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