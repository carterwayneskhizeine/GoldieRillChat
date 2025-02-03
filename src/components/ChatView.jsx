import React, { useRef, useState } from 'react';
import { formatMessageTime } from '../utils/timeFormat';
import { ImageLightbox } from './ImageLightbox';
import { getAllMessageImages, findImageIndex } from './imagePreviewUtils';
import { handlePaste } from './pasteHandler';
import { copyMessageContent } from './messageUtils';
import { toggleMessageCollapse } from './messageCollapse';
import { handleFileSelect, removeFile, handleFileDrop } from './fileHandlers';

export const ChatView = ({
  messages = [],
  currentConversation,
  editingMessage,
  setEditingMessage,
  messageInput,
  setMessageInput,
  selectedFiles,
  setSelectedFiles,
  sendMessage,
  deleteMessage,
  updateMessage,
  moveMessage,
  enterEditMode,
  exitEditMode,
  collapsedMessages,
  setCollapsedMessages,
  isCompact = false,
  handleImageClick,
  fileInputRef
}) => {
  const messagesEndRef = useRef(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  const confirmDeleteMessage = async () => {
    await deleteMessage(deletingMessageId);
    setDeletingMessageId(null);
  };

  const cancelDeleteMessage = () => {
    setDeletingMessageId(null);
  };

  return (
    <div className={`flex flex-col relative ${isCompact ? 'chat-view-compact' : ''}`}>
      {/* 消息列表区域 */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          bottom: isCompact ? '60px' : '65px',
          paddingBottom: isCompact ? '10px' : '0px',
          position: 'relative'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => handleFileDrop(e, currentConversation, setSelectedFiles, window.electron)}
      >
        <div className={`${isCompact ? 'px-2 py-2' : 'max-w-3xl mx-auto py-4 px-6'} ${isCompact ? 'pb-16' : 'pb-32'}`}>
          {messages.map(message => (
            <div key={message.id} className={`chat chat-start mb-8 relative ${isCompact ? 'compact-message -ml-5' : ''}`}>
              <div className="chat-header opacity-70">
                <span className="text-xs opacity-50">
                  {formatMessageTime(message.timestamp)}
                </span>
              </div>
              <div className="chat-bubble relative max-w-[800px] break-words">
                {message.content && message.content.split('\n').length > 6 && (
                  <div className="absolute right-0 flex items-center"
                    style={{
                      position: 'sticky',
                      top: '50px',
                      height: '0',
                      zIndex: 10,
                      transform: 'translateX(calc(102% + 1rem))'
                    }}
                  >
                    <button 
                      className="btn btn-md btn-ghost btn-circle bg-base-100"
                      onClick={() => {
                        setCollapsedMessages(prev => {
                          const newSet = new Set(prev);
                          const isCurrentlyCollapsed = newSet.has(message.id);
                          
                          if (isCurrentlyCollapsed) {
                            newSet.delete(message.id);
                            setTimeout(() => {
                              const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                              if (messageElement) {
                                messageElement.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start'
                                });
                              }
                            }, 100);
                          } else {
                            newSet.add(message.id);
                            setTimeout(() => {
                              const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                              if (messageElement) {
                                messageElement.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'center'
                                });
                              }
                            }, 100);
                          }
                          return newSet;
                        });
                      }}
                    >
                      {collapsedMessages.has(message.id) ? (
                        <svg className="w-10 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                
                {editingMessage?.id === message.id ? (
                  <div className="join w-full">
                    <div className={`mockup-code ${isCompact ? 'w-full' : 'w-[650px]'} h-[550px] bg-base-300 relative`}>
                      <pre data-prefix=""></pre>
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        className="absolute inset-0 top-[40px] bg-transparent text-current p-4 resize-none focus:outline-none w-full h-[calc(100%-40px)] font-mono"
                      />
                    </div>
                    <div className="absolute -bottom-8 -left-1 flex gap-1">
                      <button
                        className="btn btn-ghost btn-xs bg-base-100"
                        onClick={() => updateMessage(message.id, messageInput)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-ghost btn-xs bg-base-100"
                        onClick={exitEditMode}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 group">
                    {message.content && (
                      <div className="flex justify-between items-start">
                        <div 
                          className={`prose max-w-none break-words w-full ${
                            collapsedMessages.has(message.id) ? 'max-h-[144px] overflow-y-auto' : ''
                          } ${isCompact ? 'whitespace-pre-wrap break-all' : ''}`}
                          style={{ 
                            whiteSpace: 'pre-wrap',
                            maxWidth: isCompact ? '260px' : '800px'
                          }}
                          data-message-id={message.id}
                        >
                          {message.content}
                        </div>
                      </div>
                    )}
                    {message.files?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.files.map((file, index) => (
                          file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <div key={index} className="relative">
                              <img 
                                src={`local-file://${file.path}`} 
                                alt={file.name}
                                className={`rounded-lg object-cover cursor-pointer ${
                                  isCompact ? 'max-w-[200px] max-h-[200px]' : 'max-w-[300px] max-h-[300px]'
                                }`}
                                onClick={(e) => handleImageClick(e, file)}
                              />
                            </div>
                          ) : file.name.match(/\.mp4$/i) ? (
                            <div key={index} className="w-full">
                              <video controls className={`rounded-lg ${
                                isCompact ? 'max-w-[200px]' : 'w-full max-w-[800px]'
                              }`}>
                                <source src={`local-file://${file.path}`} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          ) : (
                            <div 
                              key={index} 
                              className="badge badge-outline cursor-pointer hover:bg-base-200"
                            >
                              {file.name}
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <div className="absolute -bottom-8 -left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      {message.content && (
                        <button
                          className="btn btn-ghost btn-xs bg-base-100"
                          onClick={() => enterEditMode(message)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-xs bg-base-100"
                        onClick={() => setDeletingMessageId(message.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="btn btn-ghost btn-xs bg-base-100"
                        onClick={() => copyMessageContent(message)}
                      >
                        Copy
                      </button>
                      {messages.indexOf(message) > 0 && (
                        <button
                          className="btn btn-ghost btn-xs bg-base-100"
                          onClick={() => moveMessage(message.id, 'up')}
                        >
                          Up
                        </button>
                      )}
                      {messages.indexOf(message) < messages.length - 1 && (
                        <button
                          className="btn btn-ghost btn-xs bg-base-100"
                          onClick={() => moveMessage(message.id, 'down')}
                        >
                          Down
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      {!editingMessage && (
        <div className={`absolute bottom-0 left-0 right-[20px] bg-base-100 ${isCompact ? 'p-2' : 'p-4'}`}>
          <div className={isCompact ? 'max-w-[300px] mx-auto' : 'max-w-3xl mx-auto'}>
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="badge badge-outline gap-2">
                    {file.name}
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => removeFile(file, setSelectedFiles)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <textarea 
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  if (e.target.scrollHeight > 480) {
                    e.target.style.overflowY = 'scroll';
                  } else {
                    e.target.style.overflowY = 'hidden';
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                    e.target.style.height = '64px';
                    e.target.style.overflowY = 'hidden';
                  }
                }}
                onPaste={(e) => handlePaste(e, currentConversation, setSelectedFiles, window.electron)}
                placeholder="Send a message..."
                className={`textarea textarea-bordered w-full min-h-[64px] max-h-[480px] rounded-3xl resize-none pr-24 scrollbar-hide bg-base-100 ${
                  isCompact ? 'text-sm' : ''
                }`}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
                rows="2"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={sendMessage}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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