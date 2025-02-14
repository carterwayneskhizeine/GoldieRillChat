import React, { useRef, useEffect, useState } from 'react';
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
import { createPortal } from 'react-dom';
import Editor from "@monaco-editor/react";

export function ChatView({
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
  shouldScrollToBottom = false,
  setShouldScrollToBottom,
  setMessages
}) {
  const messagesEndRef = useRef(null);
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // 滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 每次消息列表变化或组件挂载时滚动到底部
  useEffect(() => {
    if (shouldScrollToBottom) {
      setTimeout(() => {
        scrollToBottom();
        if (typeof setShouldScrollToBottom === 'function') {
          setShouldScrollToBottom(false);
        }
      }, 50);
    }
  }, [messages, isCompact, shouldScrollToBottom, setShouldScrollToBottom]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 获取选中的文本
    const selectedText = window.getSelection().toString();
    const target = e.target;
    
    // 创建一个自定义事件并触发
    const contextMenuEvent = new CustomEvent('showContextMenu', {
      detail: {
        x: e.pageX,
        y: e.pageY,
        type: 'text',
        data: {
          text: selectedText || target.value || target.textContent,
          onPaste: (text) => {
            if (target.tagName === 'TEXTAREA') {
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const currentValue = target.value;
              target.value = currentValue.substring(0, start) + text + currentValue.substring(end);
              setMessageInput(target.value);
            }
          }
        }
      }
    });
    window.dispatchEvent(contextMenuEvent);
  };

  // 确保 messages 是数组
  const messageList = Array.isArray(messages) ? messages : [];

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // 添加拖拽处理函数
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentConversation) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!currentConversation) {
      alert('请先选择或创建一个对话');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      // 对每个文件单独处理并发送消息
      for (const file of files) {
        // 创建文件的副本并保存到对话文件夹
        const result = await window.electron.saveFile(currentConversation.path, {
          name: file.name,
          data: await file.arrayBuffer()
        });
        
        const processedFile = {
          name: result.name,
          path: result.path,
          type: file.type
        };

        // 构建消息内容
        let messageContent = '';
        if (file.type.startsWith('image/')) {
          messageContent = `图片文件: ${file.name}`;
        } else if (file.type.startsWith('video/')) {
          messageContent = `视频文件: ${file.name}`;
        } else if (file.type.startsWith('audio/')) {
          messageContent = `音频文件: ${file.name}`;
        } else if (file.type === 'application/pdf') {
          messageContent = `PDF文档: ${file.name}`;
        } else if (file.type.includes('document') || file.type.includes('sheet') || file.type.includes('presentation')) {
          messageContent = `办公文档: ${file.name}`;
        } else if (file.type.includes('text/')) {
          messageContent = `文本文件: ${file.name}`;
        } else {
          messageContent = `文件: ${file.name}`;
        }

        // 直接发送包含单个文件的消息
        const tempMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content: messageContent,
          type: 'user',
          timestamp: new Date().toISOString(),
          files: [processedFile]
        };

        // 保存消息
        const updatedMessages = [...messages, tempMessage];
        await window.electron.saveMessages(
          currentConversation.path,
          currentConversation.id,
          updatedMessages
        );

        // 更新消息列表
        setMessages(updatedMessages);
        if (typeof setShouldScrollToBottom === 'function') {
          setShouldScrollToBottom(true);
        }
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败: ' + error.message);
    }
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
            top: -15px;
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
          /* 拖拽上传样式 */
          .drag-overlay {
            position: fixed;
            inset: 0;
            background-color: var(--b1);
            opacity: 0.9;
            z-index: 100;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }

          .drag-overlay.hidden {
            opacity: 0;
            visibility: hidden;
          }

          .drag-icon {
            width: 64px;
            height: 64px;
            margin-bottom: 1rem;
            color: var(--p);
            animation: bounce 1s infinite;
          }

          @keyframes bounce {
            0%, 100% {
              transform: translateY(-10%);
              animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
            }
            50% {
              transform: translateY(0);
              animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
            }
          }
        `}
      </style>

      {/* 拖拽上传遮罩 */}
      <div 
        className={`drag-overlay ${isDragging ? '' : 'hidden'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="drag-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-lg font-medium">拖放文件到这里上传</div>
        <div className="text-sm opacity-70 mt-2">支持图片、视频、文档等文件格式</div>
      </div>

      {/* 消息列表容器 */}
      <div 
        id="ai-chat-messages"
        className={`flex-1 overflow-y-auto p-4 ${isCompact ? 'compact-scroll' : ''} chat-view-messages`}
        style={{
          paddingBottom: isCompact ? '205px' : '145px',
          marginBottom: isCompact ? '60px' : '0px'
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-4 max-w-[1200px] mx-auto">
          {messageList.map(message => (
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
                        onChange={(e) => {
                          setFileNameInput(e.target.value);
                        }}
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
                          onChange={(e) => {
                            setFileNameInput(e.target.value);
                          }}
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
                          
                          if (isCollapsed) {
                            // 展开消息
                            newSet.delete(message.id);
                            setCollapsedMessages(newSet);
                            // 等待状态更新后滚动
                            setTimeout(() => {
                              messageElement?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                              });
                            }, 100);
                          } else {
                            // 折叠消息
                            newSet.add(message.id);
                            setCollapsedMessages(newSet);
                            // 等待状态更新后滚动
                            setTimeout(() => {
                              messageElement?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                              });
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
                      <div className="flex flex-col gap-2 w-full max-w-[1200px] mx-auto">
                        <div className="mockup-code min-w-[800px] bg-base-300 relative">
                          <textarea
                            value={messageInput}
                            onChange={(e) => {
                              setMessageInput(e.target.value);
                              // 自动调整高度
                              e.target.style.height = 'auto';
                              e.target.style.height = `${Math.min(e.target.scrollHeight, 800)}px`;
                            }}
                            onContextMenu={handleContextMenu}
                            className="w-full min-h-[300px] max-h-[800px] p-4 bg-transparent text-current font-mono text-sm leading-relaxed resize-none focus:outline-none"
                            placeholder="编辑消息..."
                            style={{
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              minWidth: '800px'
                            }}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={exitEditMode}
                          >
                            取消
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => updateMessage(message.id, messageInput)}
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`prose max-w-none ${
                          collapsedMessages.has(message.id) ? 'max-h-[100px] overflow-hidden mask-bottom' : ''
                        }`}
                        onContextMenu={handleContextMenu}
                      >
                        {/* 判断是否是图片/视频消息或包含图片/视频的消息 */}
                        {message.files?.some(file => 
                          file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                        ) ? (
                          <div className="flex flex-col gap-2">
                            {/* 显示文本内容 */}
                            <div className="whitespace-pre-wrap" onContextMenu={handleContextMenu}>
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
                            <div className="whitespace-pre-wrap" onContextMenu={handleContextMenu}>
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
        <div className={`absolute bottom-0 left-0 ${isCompact ? 'right-[20px] p-2 pointer-events-none bg-transparent' : 'right-[20px] p-4 bg-transparent'}`} style={{ 
          bottom: isCompact ? '48px' : '0px'
        }}>
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
                className={`textarea textarea-bordered w-full min-h-[64px] max-h-[480px] rounded-3xl resize-none pr-24 scrollbar-hide bg-transparent ${
                  isCompact ? 'text-sm shadow-lg' : ''
                }`}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  backgroundColor: 'transparent',
                  backdropFilter: 'blur(8px)'
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

      {editingMessage &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-base-300/50 backdrop-blur-sm" onClick={exitEditMode}></div>
            <div className="relative bg-base-100 rounded-lg shadow-xl w-[90vw] max-w-[1200px] h-[80vh] flex flex-col">
              <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-base-300">
                <div className="flex items-center gap-2">
                  <select 
                    className="select select-bordered select-sm"
                    value={editorLanguage}
                    onChange={(e) => setEditorLanguage(e.target.value)}
                  >
                    <option value="plaintext">plaintext</option>
                    <option value="javascript">javascript</option>
                    <option value="typescript">typescript</option>
                    <option value="python">python</option>
                    <option value="java">java</option>
                    <option value="cpp">cpp</option>
                    <option value="csharp">csharp</option>
                    <option value="html">html</option>
                    <option value="css">css</option>
                    <option value="json">json</option>
                    <option value="markdown">markdown</option>
                    <option value="sql">sql</option>
                    <option value="xml">xml</option>
                    <option value="yaml">yaml</option>
                  </select>

                  <select 
                    className="select select-bordered select-sm"
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value)}
                  >
                    <option value="vs-dark">vs-dark</option>
                    <option value="light">light</option>
                    <option value="hc-black">hc-black</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <button 
                      className="btn btn-sm btn-square"
                      onClick={() => setFontSize(prev => Math.max(8, prev - 2))}
                    >
                      -
                    </button>
                    <span className="text-sm min-w-[3ch] text-center">{fontSize}</span>
                    <button 
                      className="btn btn-sm btn-square"
                      onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={exitEditMode}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={editorLanguage}
                  theme={editorTheme}
                  value={messageInput}
                  onChange={setMessageInput}
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: fontSize,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 8, bottom: 8 }
                  }}
                />
              </div>

              <div className="flex-none flex justify-end gap-2 px-4 py-3 border-t border-base-300">
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={exitEditMode}
                >
                  取消
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => updateMessage(editingMessage.id, messageInput)}
                >
                  保存
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
} 