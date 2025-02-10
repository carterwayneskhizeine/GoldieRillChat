import React, { useRef, useEffect } from 'react';
import { formatMessageTime } from '../utils/timeFormat';
import { ImageLightbox } from './ImageLightbox';
import { getAllMessageImages, findImageIndex } from './imagePreviewUtils';
import { handlePaste } from './pasteHandler';
import { copyMessageContent } from './messageUtils';
import { toggleMessageCollapse } from './messageCollapse';
import { handleFileSelect, removeFile, handleFileDrop } from './fileHandlers';
import { SidebarCollapseButton, shouldShowCollapseButton, getMessageContentStyle } from './sidebarMessageCollapse.jsx';
import { MarkdownRenderer } from './shared/MarkdownRenderer';
import '../styles/markdown-preview.css';

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
  isCompact = false,
  sendToMonaco,
  sendToEditor,
  shouldScrollToBottom = false
}) {
  const messagesEndRef = useRef(null);

  // 滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 每次消息列表变化或组件挂载时滚动到底部
  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages, isCompact, shouldScrollToBottom]);

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
      {/* 消息列表容器 */}
      <div className={`flex-1 overflow-y-auto p-4 ${isCompact ? 'compact-scroll' : ''} chat-view-messages`}>
        <div className="space-y-4 max-w-[1200px] mx-auto">
          {messages.map(message => (
            <div
              key={message.id}
              className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container`}
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
                ) : message.files?.some(file => file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) ? (
                  <div className="flex items-center gap-2">
                    {editingFileName?.startsWith(message.id) ? (
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
                      <>
                        <span 
                          className="text-xs cursor-pointer hover:underline"
                          onClick={() => {
                            // 找到第一个图片或视频文件的索引
                            const firstMediaIndex = message.files.findIndex(file => 
                              file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                            );
                            if (firstMediaIndex !== -1) {
                              setEditingFileName(`${message.id}_${firstMediaIndex}`);
                              setFileNameInput(message.files[firstMediaIndex].name.replace(/\.[^/.]+$/, ""));
                            }
                          }}
                        >
                          {message.files.map(file => file.name).join(', ')}
                        </span>
                        <span className="text-xs opacity-50">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs opacity-50">
                    {formatMessageTime(message.timestamp)}
                  </span>
                )}
              </div>
              <div className={`chat-bubble ${
                message.type === 'user' ? 'chat-bubble-primary' : 
                message.error ? 'chat-bubble-error' : 'chat-bubble-secondary'
              }`}>
                <div className="message-content">
                  {/* 折叠按钮 */}
                  {message.content && (message.content.split('\n').length > 6 || message.content.length > 300) && (
                    <div className="collapse-button">
                      <button 
                        className="btn btn-xs btn-ghost btn-circle bg-base-100 hover:bg-base-200"
                        onClick={() => {
                          const isCollapsed = collapsedMessages.has(message.id);
                          const newSet = new Set([...collapsedMessages]);
                          const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                          const messagesContainer = document.querySelector('.chat-view-messages');
                          
                          if (isCollapsed) {
                            // 展开时，先滚动到消息顶部
                            newSet.delete(message.id);
                            setCollapsedMessages(newSet);
                            setTimeout(() => {
                              if (messageElement && messagesContainer) {
                                const elementRect = messageElement.getBoundingClientRect();
                                const containerRect = messagesContainer.getBoundingClientRect();
                                const scrollTop = elementRect.top - containerRect.top + messagesContainer.scrollTop - 20;
                                messagesContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
                              }
                            }, 100);
                          } else {
                            // 折叠时，滚动到消息中间
                            newSet.add(message.id);
                            setCollapsedMessages(newSet);
                            setTimeout(() => {
                              if (messageElement && messagesContainer) {
                                const elementRect = messageElement.getBoundingClientRect();
                                const containerRect = messagesContainer.getBoundingClientRect();
                                const scrollTop = elementRect.top - containerRect.top + messagesContainer.scrollTop - containerRect.height / 2 + elementRect.height / 2;
                                messagesContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
                              }
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

                  <div className={`response-content ${collapsedMessages.has(message.id) ? 'message-collapsed' : ''}`}>
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
                        <div className="absolute bottom-4 left-4 flex gap-2">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => updateMessage(message.id, messageInput)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={exitEditMode}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`prose max-w-none ${
                          collapsedMessages.has(message.id) ? 'max-h-[100px] overflow-hidden mask-bottom' : ''
                        }`}
                      >
                        {/* 判断是否是图片/视频消息或包含图片/视频的消息 */}
                        {message.files?.some(file => 
                          file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                        ) ? (
                          <div className="flex flex-col gap-2">
                            {/* 显示文本内容 */}
                            <div className="whitespace-pre-wrap">
                              {message.content}
                            </div>
                            
                            {/* 显示文件 */}
                            {message.files?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {message.files.map((file, index) => {
                                  // 图片文件
                                  if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                                    return (
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
                                    );
                                  }
                                  // 视频文件
                                  else if (file.name.match(/\.mp4$/i)) {
                                    return (
                                      <div key={index} className="w-full">
                                        <video controls className={`rounded-lg ${
                                          isCompact ? 'max-w-[200px]' : 'w-full max-w-[800px]'
                                        }`}>
                                          <source src={`local-file://${file.path}`} type="video/mp4" />
                                          Your browser does not support the video tag.
                                        </video>
                                      </div>
                                    );
                                  }
                                  // 其他文件类型
                                  else {
                                    return (
                                      <div 
                                        key={index} 
                                        className="badge badge-lg gap-2 cursor-pointer hover:bg-base-200"
                                        onClick={() => openFileLocation(file)}
                                        title="点击打开文件位置"
                                      >
                                        {file.name}
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            )}
                          </div>
                        ) : message.files?.some(file => 
                          !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                        ) ? (
                          <div className="flex flex-col gap-2">
                            {/* 显示文本内容 */}
                            <div className="whitespace-pre-wrap">
                              {message.content}
                            </div>
                            
                            {/* 显示其他类型文件 */}
                            <div className="flex flex-wrap gap-2">
                              {message.files.map((file, index) => (
                                <div 
                                  key={index} 
                                  className="badge badge-lg gap-2 cursor-pointer hover:bg-base-200"
                                  onClick={() => openFileLocation(file)}
                                  title="点击打开文件位置"
                                >
                                  {file.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <MarkdownRenderer
                            content={message.content}
                            isCompact={isCompact}
                            onCopyCode={(code) => {
                              navigator.clipboard.writeText(code);
                            }}
                            onLinkClick={(href) => {
                              window.electron.openExternal(href);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {editingMessage?.id !== message.id && (
                <div className="message-actions">
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      console.log('AI button clicked', message);
                    }}
                  >
                    AI
                  </button>
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
                      onClick={() => {
                        moveMessage(message.id, 'up');
                        // 获取消息元素
                        const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                        // 判断是否是长对话
                        const isLongMessage = message.content && (
                          message.content.split('\n').length > 6 || 
                          message.content.length > 300
                        );
                        
                        // 如果是长对话，先折叠
                        if (isLongMessage) {
                          setCollapsedMessages(prev => new Set([...prev, message.id]));
                        }
                        
                        // 滚动到中间
                        setTimeout(() => {
                          messageElement?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                          });
                        }, 100);
                      }}
                    >
                      Up
                    </button>
                  )}
                  {messages.indexOf(message) < messages.length - 1 && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        moveMessage(message.id, 'down');
                        // 获取消息元素
                        const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                        // 判断是否是长对话
                        const isLongMessage = message.content && (
                          message.content.split('\n').length > 6 || 
                          message.content.length > 300
                        );
                        
                        // 如果是长对话，先折叠
                        if (isLongMessage) {
                          setCollapsedMessages(prev => new Set([...prev, message.id]));
                        }
                        
                        // 滚动到中间
                        setTimeout(() => {
                          messageElement?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                          });
                        }, 100);
                      }}
                    >
                      Down
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      // 如果消息包含图片，发送到图片编辑器
                      if (message.files?.some(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                        sendToEditor(message);
                      } else {
                        // 否则发送到 Monaco 编辑器
                        sendToMonaco(message);
                      }
                    }}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      {!editingMessage && (
        <div className={`absolute bottom-0 left-0 ${isCompact ? 'right-[20px] p-2 pointer-events-none bg-base-300' : 'right-[20px] p-4 bg-base-100'}`}>
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
                  isCompact ? 'text-sm shadow-lg' : ''
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