import React, { useRef, useEffect } from 'react';
import { formatMessageTime } from '../utils/timeFormat';
import { ImageLightbox } from './ImageLightbox';
import { getAllMessageImages, findImageIndex } from './imagePreviewUtils';
import { handlePaste } from './pasteHandler';
import { copyMessageContent } from './messageUtils';
import { toggleMessageCollapse } from './messageCollapse';
import { handleFileSelect, removeFile, handleFileDrop } from './fileHandlers';
import { SidebarCollapseButton, shouldShowCollapseButton, getMessageContentStyle } from './sidebarMessageCollapse.jsx';

export function ChatView({
  messages,
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
  handleImageClick,
  fileInputRef,
  editingFileName,
  setEditingFileName,
  fileNameInput,
  setFileNameInput,
  renameMessageFile,
  openFileLocation,
  copyMessageContent,
  deletingMessageId,
  setDeletingMessageId,
  cancelDeleteMessage,
  confirmDeleteMessage,
  scrollToMessage,
  window,
  isCompact = false
}) {
  const messagesEndRef = useRef(null);

  // 滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 每次消息列表变化或组件挂载时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, isCompact]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const selection = window.getSelection();
    const text = selection.toString();
    
    // 创建一个自定义事件并触发
    const contextMenuEvent = new CustomEvent('showContextMenu', {
      detail: {
        x: e.pageX,
        y: e.pageY,
        text: text,
        target: e.target
      }
    });
    window.dispatchEvent(contextMenuEvent);
  };

  return (
    <div className={`flex flex-col h-full relative ${isCompact ? 'chat-view-compact' : ''}`}>
      <style>
        {`
          .mask-bottom {
            mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
          }
          .compact-scroll {
            margin-right: -10px;
            padding-right: 20px;
          }
          .message-container {
            position: relative;
            contain: paint;
            isolation: isolate;
            padding-bottom: 32px;
          }
          .collapse-button {
            position: sticky;
            top: 2px;
            float: right;
            margin-left: 8px;
            margin-right: 0px;
            z-index: 100;
            pointer-events: all;
          }
          .collapse-button button {
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
            background-color: var(--b1);
            border: 1px solid var(--b3);
          }
          .collapse-button button:hover {
            transform: scale(1.1);
            background-color: var(--b2);
          }
          .chat-bubble {
            position: relative;
            z-index: 1;
          }
          .message-actions {
            display: none;
            position: absolute;
            bottom: 0;
            left: 4px;
            gap: 4px;
            z-index: 10;
            background-color: var(--b1);
            padding: 4px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .message-container:hover .message-actions {
            display: flex;
          }
          .message-actions button {
            background-color: var(--b1);
            border: 1px solid var(--b3);
            transition: all 0.2s;
          }
          .message-actions button:hover {
            transform: scale(1.05);
            background-color: var(--b2);
          }
        `}
      </style>
      {/* 消息列表区域 */}
      <div 
        className={`flex-1 overflow-y-auto overflow-x-hidden ${isCompact ? 'compact-scroll' : ''}`}
        style={{
          height: 'calc(100vh - 200px)',
          paddingBottom: isCompact ? '50px' : '20px',
          paddingTop: isCompact ? '0' : '0'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => handleFileDrop(e, currentConversation, setSelectedFiles, window.electron)}
      >
        <div className={`${isCompact ? 'px-2' : 'max-w-3xl mx-auto py-4 px-6'} ${isCompact ? 'pb-16' : 'pb-32'} relative overflow-visible`}>
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`chat chat-start mb-8 relative message-container ${isCompact ? 'compact-message -ml-5' : ''}`}
              data-message-id={message.id}
            >
              <div className="chat-header opacity-70">
                {message.txtFile ? (
                  editingFileName === message.id ? (
                    <div className="join">
                      <input
                        type="text"
                        value={fileNameInput}
                        onChange={(e) => setFileNameInput(e.target.value)}
                        className="input input-xs input-bordered join-item"
                        placeholder="Enter new file name"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            renameMessageFile(message, fileNameInput);
                          }
                        }}
                      />
                      <button
                        className="btn btn-xs join-item"
                        onClick={() => renameMessageFile(message, fileNameInput)}
                      >
                        Save
                      </button>
                      <button
                        className="btn btn-xs join-item"
                        onClick={() => {
                          setEditingFileName(null);
                          setFileNameInput('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="cursor-pointer hover:underline" onClick={() => {
                        setEditingFileName(message.id);
                        setFileNameInput(message.txtFile.displayName);
                      }}>
                        {message.txtFile.displayName}
                      </span>
                      <span className="text-xs opacity-50">
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                  )
                ) : (
                  <span className="text-xs opacity-50">
                    {formatMessageTime(message.timestamp)}
                  </span>
                )}
              </div>
              <div className="chat-bubble relative max-w-[800px] break-words">
                {!isCompact && message.content && (message.content.split('\n').length > 6 || message.content.length > 300) && (
                  <div className="collapse-button">
                    <button 
                      className="btn btn-xs btn-ghost btn-circle bg-base-100 hover:bg-base-200"
                      onClick={() => {
                        const isCollapsed = collapsedMessages.has(message.id);
                        const newSet = new Set([...collapsedMessages]);
                        const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                        
                        if (isCollapsed) {
                          // 展开时，先滚动到消息顶部
                          newSet.delete(message.id);
                          setCollapsedMessages(newSet);
                          setTimeout(() => {
                            messageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        } else {
                          // 折叠时，滚动到消息中间
                          newSet.add(message.id);
                          setCollapsedMessages(newSet);
                          setTimeout(() => {
                            messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }
                      }}
                    >
                      {collapsedMessages.has(message.id) ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                {isCompact && shouldShowCollapseButton(message.content) && (
                  <SidebarCollapseButton
                    messageId={message.id}
                    collapsedMessages={collapsedMessages}
                    setCollapsedMessages={setCollapsedMessages}
                  />
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
                  <div className="flex flex-col gap-2">
                    {message.content && (
                      <div className="flex justify-between items-start">
                        <div 
                          {...(isCompact 
                            ? {
                                ...getMessageContentStyle(collapsedMessages.has(message.id)),
                                onContextMenu: handleContextMenu
                              }
                            : {
                                className: `prose max-w-none w-full ${
                                  collapsedMessages.has(message.id) ? 'max-h-[100px] overflow-hidden mask-bottom' : ''
                                }`,
                                style: { 
                                  whiteSpace: 'pre-wrap',
                                  maxWidth: '800px'
                                },
                                onContextMenu: handleContextMenu
                              }
                          )}
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
                  </div>
                )}
              </div>
              <div className="message-actions">
                {message.content && (
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => enterEditMode(message)}
                  >
                    Edit
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setDeletingMessageId(message.id)}
                >
                  Delete
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => copyMessageContent(message)}
                >
                  Copy
                </button>
                {messages.indexOf(message) > 0 && (
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => moveMessage(message.id, 'up')}
                  >
                    Up
                  </button>
                )}
                {messages.indexOf(message) < messages.length - 1 && (
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => moveMessage(message.id, 'down')}
                  >
                    Down
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      {!editingMessage && (
        <div className={`absolute bottom-0 left-0 ${isCompact ? 'right-[20px] p-2 pointer-events-none' : 'right-[20px] p-4 bg-base-100'}`}>
          <div className={`${isCompact ? 'max-w-[300px] mx-auto pointer-events-auto' : 'max-w-3xl mx-auto'}`}>
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
                onContextMenu={handleContextMenu}
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
        isCompact ? (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div role="alert" className="alert bg-base-200 shadow-lg">
              <span className="text-sm">Delete this message?</span>
              <div>
                <button className="btn btn-xs" onClick={cancelDeleteMessage}>No</button>
                <button className="btn btn-xs btn-error ml-2" onClick={confirmDeleteMessage}>Yes</button>
              </div>
            </div>
            <div className="absolute inset-0 bg-black opacity-50 -z-10"></div>
          </div>
        ) : (
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
        )
      )}
    </div>
  );
} 