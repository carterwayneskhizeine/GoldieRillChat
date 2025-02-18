import React, { useState, useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import { useMessageCollapse } from '../hooks/useMessageCollapse';
import '../styles/messages.css';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/plugins/captions.css';

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
  openInBrowserTab
}) => {
  const messagesEndRef = useRef(null);

  // 删除确认状态
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // 使用折叠状态 hook
  const { isMessageCollapsed, toggleMessageCollapse } = useMessageCollapse();

  // 添加 Lightbox 相关状态
  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [images, setImages] = useState([]);

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

  // 处理图片点击
  const handleImageClick = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    setImages([{
      src: `local-file://${file.path}`,
      alt: file.name,
      title: file.name
    }]);
    setLightboxIndex(0);
    setOpenLightbox(true);
  };

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
        <div className="space-y-4 max-w-[1200px] mx-auto p-4">
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
              onToggleCollapse={toggleMessageCollapse}
              onImageClick={handleImageClick}
              openFileLocation={openFileLocation}
              openInBrowserTab={openInBrowserTab}
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

      {/* Lightbox 组件 */}
      <Lightbox
        open={openLightbox}
        close={() => setOpenLightbox(false)}
        index={lightboxIndex}
        slides={images}
        plugins={[Zoom, Captions]}
        animation={{ fade: 300 }}
        carousel={{ finite: images.length <= 1 }}
        zoom={{
          maxZoomPixelRatio: 5,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          doubleClickMaxStops: 2,
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true
        }}
        captions={{
          showToggle: true,
          descriptionTextAlign: 'center',
          descriptionMaxLines: 3,
        }}
      />
    </div>
  );
}; 