import React, { useState } from 'react';
import { MessageItem } from './MessageItem';
import { useMessageCollapse } from '../hooks/useMessageCollapse';
import '../styles/messages.css';

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
  handleHistoryNavigation
}) => {
  // 删除确认状态
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // 使用折叠状态 hook
  const { isMessageCollapsed, toggleMessageCollapse } = useMessageCollapse();

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

  return (
    <div className="flex-1 overflow-hidden bg-base-100">
      <div 
        id="ai-chat-messages-main"
        className="h-full overflow-y-auto" 
        style={{ 
          paddingBottom: '145px',
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
              handleHistoryNavigation={handleHistoryNavigation}
              isCollapsed={isMessageCollapsed(message.id)}
              onToggleCollapse={toggleMessageCollapse}
            />
          ))}
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
    </div>
  );
}; 