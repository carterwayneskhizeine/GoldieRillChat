import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { MessageItem } from './MessageItem';
import { useMessageCollapse } from '../hooks/useMessageCollapse';
import '../styles/messages.css';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// 使用 React.memo 优化 MessageRow 组件
const MessageRow = React.memo(({ data, index, style }) => {
  const message = data.messages[index];
  return (
    <div style={style}>
      <MessageItem
        message={message}
        selectedModel={data.selectedModel}
        editingMessageId={data.editingMessageId}
        editContent={data.editContent}
        setEditContent={data.setEditContent}
        handleEditStart={data.handleEditStart}
        handleEditCancel={data.handleEditCancel}
        handleEditSave={data.handleEditSave}
        handleDeleteMessage={data.onDeleteMessage}
        handleRetry={data.handleRetry}
        handleStop={data.handleStop}
        handleHistoryNavigation={data.handleHistoryNavigation}
        isCollapsed={data.isMessageCollapsed(message.id)}
        onToggleCollapse={data.toggleMessageCollapse}
        onImageClick={data.handleImageClick}
        openFileLocation={data.openFileLocation}
        openInBrowserTab={data.openInBrowserTab}
      />
    </div>
  );
});

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
  const listRef = useRef(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const { isMessageCollapsed, toggleMessageCollapse } = useMessageCollapse();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState([]);

  // 使用 useCallback 优化滚动处理
  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(messages.length - 1);
    }
  }, [messages.length]);

  // 使用 useEffect 优化滚动时机
  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // 使用 useCallback 优化消息删除处理
  const onDeleteMessage = useCallback(async (messageId) => {
    setDeletingMessageId(messageId);
  }, []);

  const cancelDeleteMessage = useCallback(() => {
    setDeletingMessageId(null);
  }, []);

  const confirmDeleteMessage = useCallback(async () => {
    if (deletingMessageId) {
      await handleDeleteMessage(deletingMessageId);
      setDeletingMessageId(null);
    }
  }, [deletingMessageId, handleDeleteMessage]);

  // 使用 useCallback 优化图片点击处理
  const handleImageClick = useCallback((images, index) => {
    if (images && images.length > 0) {
      setLightboxImages(images);
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  }, []);

  // 使用 useMemo 缓存列表数据
  const listData = useMemo(() => ({
    messages,
    selectedModel,
    editingMessageId,
    editContent,
    setEditContent,
    handleEditStart,
    handleEditCancel,
    handleEditSave,
    onDeleteMessage,
    handleRetry,
    handleStop,
    handleHistoryNavigation,
    isMessageCollapsed,
    toggleMessageCollapse,
    handleImageClick,
    openFileLocation,
    openInBrowserTab
  }), [
    messages,
    selectedModel,
    editingMessageId,
    editContent,
    setEditContent,
    handleEditStart,
    handleEditCancel,
    handleEditSave,
    onDeleteMessage,
    handleRetry,
    handleStop,
    handleHistoryNavigation,
    isMessageCollapsed,
    toggleMessageCollapse,
    handleImageClick,
    openFileLocation,
    openInBrowserTab
  ]);

  return (
    <div className="flex-1 overflow-hidden bg-base-100">
      <div 
        id="ai-chat-messages-main"
        className="h-full" 
        style={{ 
          isolation: 'isolate',
          position: 'relative'
        }}
      >
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              width={width}
              itemCount={messages.length}
              itemSize={150}
              itemData={listData}
              overscanCount={5}
              className="space-y-4 max-w-[1200px] mx-auto p-4"
            >
              {MessageRow}
            </List>
          )}
        </AutoSizer>
      </div>

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

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxImages}
      />
    </div>
  );
}; 