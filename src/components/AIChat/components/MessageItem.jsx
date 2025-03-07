import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Editor from "@monaco-editor/react";
import ReactAudioPlayer from 'react-audio-player';
import { MarkdownRenderer } from '../../shared/MarkdownRenderer';
import { shouldCollapseMessage, getMessageContentStyle } from '../utils/messageCollapse';
import '../styles/messages.css';
import { openUrl } from '../../../utils/browserUtils';
import { ExclamationIcon } from '../../shared/ExclamationIcon';
import { CODE_THEME_LIGHT, CODE_THEME_DARK, MESSAGE_STATES } from '../constants';
import TextareaAutosize from 'react-textarea-autosize';
import { ThumbUpIcon, ThumbDownIcon } from '../../shared/icons';

const SearchSources = ({ sources, openInBrowserTab }) => {
  const [showSources, setShowSources] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (showSources && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 计算列表宽度（320px）是否会超出右侧边界
      const willOverflowRight = buttonRect.left + 320 > viewportWidth;
      
      // 计算下方空间和上方空间
      const spaceBelow = viewportHeight - buttonRect.bottom - 8;
      const spaceAbove = buttonRect.top - 8;
      
      // 判断是否应该向上显示（当下方空间不足且上方空间足够时）
      const shouldShowAbove = spaceBelow < 300 && spaceAbove > 300;
      
      setPosition({
        // 如果应该向上显示，则定位到按钮上方
        top: shouldShowAbove ? buttonRect.top - 8 - 300 : buttonRect.bottom + 8,
        // 如果按钮在右侧，列表左对齐；如果按钮在左侧，列表右对齐
        left: willOverflowRight ? buttonRect.right - 320 : buttonRect.left
      });
    }
  }, [showSources]);

  // 处理链接点击
  const handleLinkClick = (url) => {
    openUrl(url, true, false);
    setShowSources(false); // 关闭弹窗
  };

  if (!sources || sources.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className="btn btn-xs btn-ghost bg-base-100 hover:bg-base-200"
        onClick={() => setShowSources(!showSources)}
      >
        {showSources ? '隐藏来源' : '查看来源'} ({sources.length})
      </button>
      {showSources && createPortal(
        <div 
          className="fixed bg-base-100 rounded-lg shadow-lg border border-base-300 p-2"
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            width: '320px',
            height: '300px',
            overflowY: 'auto',
            zIndex: 9999
          }}
        >
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-base-content/60 flex-none">[{index + 1}]</span>
                  <div className="flex-1">
                    <a
                      href={source.link}
                      className="link link-primary hover:link-primary-focus block"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick(source.link);
                      }}
                    >
                      {source.title}
                    </a>
                    <div className="text-xs text-base-content/70 mt-1">
                      {source.snippet}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const MessageItem = ({
  message,
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
  isCollapsed,
  onToggleCollapse,
  onImageClick,
  openFileLocation,
  openInBrowserTab,
  currentConversation,
  setMessages,
  messages
}) => {
  // 添加推理过程折叠状态
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);

  // 添加复制功能
  const handleCopySelectedText = (e) => {
    if (e.ctrlKey && e.key === 'c') {
      const selectedText = window.getSelection().toString();
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
      }
    }
  };

  // 添加键盘事件监听
  useEffect(() => {
    document.addEventListener('keydown', handleCopySelectedText);
    return () => {
      document.removeEventListener('keydown', handleCopySelectedText);
    };
  }, []);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // 获取消息内容样式
  const contentStyle = getMessageContentStyle(isCollapsed);

  // 渲染媒体文件
  const renderMediaContent = (file, onImageClick) => {
    if (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <div key={file.path} className="media-container my-2">
          <img
            src={`local-file://${file.path}`}
            alt={file.name}
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => onImageClick(e, file)}
            style={{ maxHeight: '300px', objectFit: 'contain' }}
            loading="lazy"
          />
        </div>
      );
    } else if (file.name && file.name.match(/\.mp4$/i)) {
      return (
        <div key={file.path} className="chat-media-container my-2">
          <div className="video-info mb-2">
          </div>
          <video
            src={`local-file://${file.path}`}
            controls
            className="rounded-lg max-w-full"
            style={{ maxHeight: '300px' }}
            preload="metadata"
            onError={(e) => {
              console.error('视频加载失败:', e);
              e.target.outerHTML = `<div class="p-2 bg-error text-error-content rounded-lg">视频加载失败: ${file.path}</div>`;
            }}
          >
            您的浏览器不支持视频播放。
          </video>
        </div>
      );
    }
    return null;
  };

  // 添加视频消息渲染函数
  const renderVideoMessage = (message) => {
    const videoFile = message.files?.find(file => file.type === 'video/mp4');
    if (!videoFile) return null;

    return (
      <div className="video-container flex flex-col">
        {/* 先显示消息内容（如果有） */}
        {message.content && (
          <div className="mb-4">
            <MarkdownRenderer
              content={message.content || ''}
              isCompact={false}
              searchImages={message.searchImages}
              onCopyCode={(code) => {
                console.log('Code copied:', code);
                if (window.electron) {
                  window.electron.copyToClipboard(code);
                } else {
                  navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                }
              }}
              onLinkClick={(href) => {
                if (href.startsWith('http://') || href.startsWith('https://')) {
                  openInBrowserTab(href);
                }
              }}
            />
          </div>
        )}
        <div className="video-info mb-4">
          <div className="font-medium mb-2">提示词：{message.originalPrompt}</div>
          <div className="text-sm opacity-70">
            <span className="mr-4">模型：{message.model}</span>
            <span>种子：{message.seed}</span>
          </div>
        </div>
        <div className="video-player relative rounded-lg overflow-hidden bg-base-200">
          <video
            controls
            className="w-full max-h-[70vh] object-contain"
            preload="metadata"
          >
            <source src={`local-file://${videoFile.path}`} type="video/mp4" />
            您的浏览器不支持视频播放。
          </video>
        </div>
        <div className="video-actions mt-2 flex justify-end gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => openFileLocation(videoFile)}
            title="打开文件位置"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            <span className="ml-1">打开位置</span>
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => handleRetry(message.id)}
            title="重新生成"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="ml-1">重新生成</span>
          </button>
        </div>
      </div>
    );
  };

  // 添加音频消息渲染函数
  const renderAudioMessage = (message) => {
    const audioFile = message.files?.find(file => file.type && file.type.startsWith('audio/'));
    if (!audioFile) return null;

    return (
      <div className="audio-message flex flex-col">
        {/* 先显示消息内容（如果有） */}
        {message.content && (
          <div className="mb-4">
            <MarkdownRenderer
              content={message.content || ''}
              isCompact={false}
              searchImages={message.searchImages}
              onCopyCode={(code) => {
                console.log('Code copied:', code);
                if (window.electron) {
                  window.electron.copyToClipboard(code);
                } else {
                  navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                }
              }}
              onLinkClick={(href) => {
                if (href.startsWith('http://') || href.startsWith('https://')) {
                  openInBrowserTab(href);
                }
              }}
            />
          </div>
        )}
        <div className="audio-info mb-4">
          <div className="font-medium mb-2">文本：{message.audioParams?.text}</div>
          <div className="text-sm opacity-70">
            <span className="mr-4">音色：{message.audioParams?.voice}</span>
            <span className="mr-4">音量：{message.audioParams?.volume}</span>
            <span>语速：{message.audioParams?.speed}</span>
          </div>
        </div>
        <div className="audio-player relative rounded-lg overflow-hidden bg-base-200 p-4">
          <ReactAudioPlayer
            src={`local-file://${audioFile.path}`}
            controls
            autoPlay={false}
            className="w-full"
            controlsList="nodownload"
            preload="metadata"
          />
        </div>
      </div>
    );
  };

  // 添加处理搜索图片的函数
  const renderSearchImages = (searchImages, onImageClick) => {
    console.log('renderSearchImages调用，图片数量:', searchImages?.length, searchImages);
    if (!searchImages || searchImages.length === 0) return null;
    
    return (
      <div className="search-images-container mt-3 border-t pt-3 border-base-300">
        <h3 className="text-base font-medium mb-2">搜索相关图片：</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {searchImages.map((img, index) => (
            <div key={`search-img-${index}`} className="flex flex-col">
              <img
                src={img.url}
                alt={img.description || '搜索图片'}
                className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
                style={{ maxHeight: '200px' }}
                onClick={(e) => {
                  // 打开Lightbox或处理图片点击
                  if (typeof onImageClick === 'function') {
                    onImageClick(e, {
                      path: img.url,
                      name: 'search-image-' + index + '.jpg',
                      type: 'image/jpeg'
                    });
                  } else {
                    window.open(img.url, '_blank');
                  }
                }}
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgMTNoLTJWN2gydjZabTAgNGgtMnYtMmgydjJabTktNVYxOEE1IDUgMCAwIDEgMTcgMjJINy4zM0ExMC42MSAxMC42MSAwIDAgMSAyIDEzLjQzQzIgOC4wNSA2LjA0IDQgMTAuNCA0YzIuMjUgMCA0LjI1Ljg2IDUuNiAyLjJMMTUuNTMgNUgyMXYzaC0zLjUzYTguNDYgOC40NiAwIDAgMSAtMi4zLTJBNi41MyA2LjUzIDAgMCAwIDEwLjRBNi41IDYuNSAwIDAgMCA0IDEzLjU5QzcuMDMgMTMuNjggOS43NiAxNiAxMCAxOWE4LjM4IDguMzggMCAwIDAgNC40LTMuMjNBNyA3IDAgMCAxIDIxIDEyWiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+'
                  e.target.style.padding = '10px';
                  e.target.style.backgroundColor = 'rgba(0,0,0,0.1)';
                }}
              />
              {img.description && (
                <p className="text-xs mt-1 text-base-content/80 line-clamp-2">{img.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 添加MessageStatus组件显示消息状态
  const MessageStatus = ({ message, messageState }) => {
    // 确定消息状态
    if (message.generating && messageState === MESSAGE_STATES.THINKING) {
      return (
        <div className="flex items-center mt-2">
          <div className="loading loading-spinner loading-xs mr-2"></div>
          <span className="text-sm text-opacity-70">思考中...</span>
        </div>
      );
    } else if (message.generating && messageState === MESSAGE_STATES.SEARCHING) {
      return (
        <div className="flex items-center mt-2">
          <div className="loading loading-spinner loading-xs mr-2"></div>
          <span className="text-sm text-opacity-70">搜索网络中...</span>
        </div>
      );
    } else if (messageState === MESSAGE_STATES.ERROR) {
      return (
        <div className="flex items-center mt-2">
          <ExclamationIcon className="w-4 h-4 mr-2 text-error" />
          <span className="text-sm text-error">出错了</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      <div
        className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container ${
          isCollapsed ? 'aichat-message-collapsed' : ''
        }`}
        data-message-id={message.id}
        data-aichat-message="true"
        style={{ userSelect: 'text' }}
      >
        {/* 消息头部 */}
        <div className="chat-header opacity-70" style={{ userSelect: 'text' }}>
          <span className="text-xs" style={{ userSelect: 'text' }}>
            {new Date(message.timestamp).toLocaleString()}
            {message.type === 'assistant' && (
              <>
                {' • '}模型: {message.model || selectedModel}
                {message.tokens ? ` • Token: ${message.tokens}` : message.usage?.total_tokens ? ` • Token: ${message.usage.total_tokens}` : ''}
                {message.error && ' • 错误'}
              </>
            )}
          </span>
        </div>

        {/* 消息内容 */}
        <div className={`chat-bubble ${
          message.type === 'user' ? 'chat-bubble-primary' : 
          message.error ? 'chat-bubble-error' : 'chat-bubble-secondary'
        }`}
        style={{ userSelect: 'text', position: 'relative', overflow: 'visible' }}
        >
          {/* 添加搜索结果来源 */}
          {message.searchResults && (
            <div className="absolute bottom-0 right-0 -mb-[30px]" style={{ zIndex: 50 }}>
              <SearchSources 
                sources={message.searchResults} 
                openInBrowserTab={openInBrowserTab}
              />
            </div>
          )}

          {/* 添加折叠按钮 */}
          {shouldCollapseMessage(message) && (
            <button
              className="aichat-collapse-btn"
              onClick={() => onToggleCollapse(message.id)}
              style={{ zIndex: 40 }}
            >
              {isCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          )}
          <div className="message-content" style={{ overflow: 'visible' }}>
            <div className="response-content" style={{ ...contentStyle, overflow: 'visible' }}>
              {editingMessageId === message.id ? (
                null // 不在这里渲染编辑框
              ) : (
                <div className={`prose max-w-none`}>
                  {message.generating && !message.content ? (
                    <div className="thinking-animation">
                      <span className="thinking-text">Thinking</span>
                      <div className="thinking-dots">
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                        <div className="thinking-dot"></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 显示推理过程 */}
                      {message.type === 'assistant' && message.reasoning_content && (
                        <div className="mb-4 p-4 bg-base-200 rounded-lg border border-base-300 reasoning-bubble relative">
                          <div 
                            className={`typing-content ${message.generating ? 'generating' : ''}`}
                            style={isReasoningCollapsed ? {
                              maxHeight: '100px',
                              overflow: 'hidden',
                              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
                            } : {}}
                          >
                            {message.reasoning_content}
                          </div>
                          <div className="flex justify-center mt-2">
                            <button 
                              className="btn btn-xs btn-ghost bg-base-100 hover:bg-base-200 min-w-[80px]"
                              onClick={() => setIsReasoningCollapsed(!isReasoningCollapsed)}
                            >
                              {isReasoningCollapsed ? (
                                <div className="flex items-center gap-1">
                                  <span>展开</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span>收起</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      {/* 判断是否是音频消息 */}
                      {message.files?.some(file => file.type && file.type.startsWith('audio/')) ? (
                        renderAudioMessage(message)
                      ) : message.files?.some(file => 
                        file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                      ) ? (
                        <div className="media-content flex flex-col">
                          {/* 先显示消息内容（如果有） */}
                          {message.content && (
                            <div className="mb-0">
                              <MarkdownRenderer
                                content={message.content || ''}
                                isCompact={false}
                                searchImages={message.searchImages}
                                onCopyCode={(code) => {
                                  console.log('Code copied:', code);
                                  if (window.electron) {
                                    window.electron.copyToClipboard(code);
                                  } else {
                                    navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                  }
                                }}
                                onLinkClick={(href) => {
                                  if (href.startsWith('http://') || href.startsWith('https://')) {
                                    openInBrowserTab(href);
                                  }
                                }}
                              />
                            </div>
                          )}
                          {/* 然后显示图片 */}
                          {message.files
                            .filter(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                            .map(file => renderMediaContent(file, onImageClick))
                          }
                        </div>
                      ) : message.files?.some(file => 
                        file.name && file.name.match(/\.mp4$/i)
                      ) ? (
                        <div className="media-content flex flex-col">
                          {/* 先显示消息内容（如果有） */}
                          {message.content && (
                            <div className="mb-0">
                              <MarkdownRenderer
                                content={message.content || ''}
                                isCompact={false}
                                searchImages={message.searchImages}
                                onCopyCode={(code) => {
                                  console.log('Code copied:', code);
                                  if (window.electron) {
                                    window.electron.copyToClipboard(code);
                                  } else {
                                    navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                  }
                                }}
                                onLinkClick={(href) => {
                                  if (href.startsWith('http://') || href.startsWith('https://')) {
                                    openInBrowserTab(href);
                                  }
                                }}
                              />
                            </div>
                          )}
                          {/* 然后显示视频 */}
                          {message.files
                            .filter(file => file.name && file.name.match(/\.mp4$/i))
                            .map(file => renderMediaContent(file, onImageClick))
                          }
                        </div>
                      ) : message.files?.some(file => 
                        file.name && !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                      ) ? (
                        <div className="file-message">
                          {/* 先显示消息内容（如果有） */}
                          {message.content && (
                            <div className="mb-0">
                              <MarkdownRenderer
                                content={message.content || ''}
                                isCompact={false}
                                searchImages={message.searchImages}
                                onCopyCode={(code) => {
                                  console.log('Code copied:', code);
                                  if (window.electron) {
                                    window.electron.copyToClipboard(code);
                                  } else {
                                    navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                  }
                                }}
                                onLinkClick={(href) => {
                                  if (href.startsWith('http://') || href.startsWith('https://')) {
                                    openInBrowserTab(href);
                                  }
                                }}
                              />
                            </div>
                          )}
                          {/* 显示文件消息 */}
                          {message.files.map((file, index) => (
                            <div key={index} className="file-item">
                              <span className="file-name">{file.name}</span>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => openFileLocation(file)}
                                title="打开文件位置"
                              >
                                打开
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={message.type === 'assistant' && message.reasoning_content ? 'mt-4' : ''}>
                          {message.generating ? (
                            <div className="typing-effect">
                              {message.content}
                            </div>
                          ) : (
                            <MarkdownRenderer
                              content={message.content || ''}
                              isCompact={false}
                              searchImages={message.searchImages}
                              onCopyCode={(code) => {
                                console.log('Code copied:', code);
                                if (window.electron) {
                                  window.electron.copyToClipboard(code);
                                } else {
                                  navigator.clipboard.writeText(code).catch(err => console.error('复制失败:', err));
                                }
                              }}
                              onLinkClick={(href) => {
                                if (href.startsWith('http://') || href.startsWith('https://')) {
                                  openInBrowserTab(href);
                                }
                              }}
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 消息操作按钮 */}
        {!editingMessageId && (
          <div className="message-actions">
            {/* 仅当消息没有附件文件且是用户消息时显示编辑按钮 */}
            {!message.files?.length && message.type === 'user' && (
              <button className="btn btn-ghost btn-xs" onClick={() => handleEditStart(message)}>Edit</button>
            )}
            <button className="btn btn-ghost btn-xs" onClick={() => handleDeleteMessage(message.id)}>Delete</button>
            {/* 仅当消息没有附件文件时显示复制按钮 */}
            {!message.files?.length && (
              <button className="btn btn-ghost btn-xs" onClick={() => navigator.clipboard.writeText(message.content)}>Copy</button>
            )}
            {/* AI 消息的编辑按钮 */}
            {!message.files?.length && message.type === 'assistant' && (
              <button className="btn btn-ghost btn-xs" onClick={() => handleEditStart(message)}>Edit</button>
            )}
            {message.type === 'assistant' && (
              <>
                <button className="btn btn-ghost btn-xs" onClick={() => handleRetry(message.id)}>Retry</button>
                {message.generating && (
                  <button 
                    className="btn btn-ghost btn-xs text-error" 
                    onClick={() => handleStop(message.id)}
                    title="停止生成"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </>
            )}
            {/* 添加文件按钮 */}
            {message.files?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.files.map((file, index) => (
                  <button
                    key={index}
                    className="btn btn-ghost btn-xs"
                    onClick={() => openFileLocation(file)}
                    title="打开文件位置"
                  >
                    File
                  </button>
                ))}
              </div>
            )}
            {message.history && message.history.length > 0 && (
              <>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleHistoryNavigation(message.id, 'prev')}
                  disabled={message.currentHistoryIndex === 0}
                >
                  上一条
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleHistoryNavigation(message.id, 'next')}
                  disabled={message.currentHistoryIndex >= message.history.length}
                >
                  下一条
                </button>
                <span className="text-xs opacity-50">
                  {message.currentHistoryIndex + 1}/{message.history.length + 1}
                </span>
              </>
            )}
            
            {/* 添加类型切换按钮 */}
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => {
                // 切换消息类型
                let newType;
                if (!message.type) {
                  newType = 'user'; // TypeN -> TypeU
                } else if (message.type === 'user') {
                  newType = 'assistant'; // TypeU -> TypeA
                } else {
                  newType = null; // TypeA -> TypeN
                }
                
                // 创建更新后的消息对象
                const updatedMessage = {...message};
                
                if (newType) {
                  updatedMessage.type = newType;
                } else {
                  delete updatedMessage.type;
                }
                
                // 更新消息列表
                const updatedMessages = messages.map(msg => 
                  msg.id === message.id ? updatedMessage : msg
                );
                
                // 保存到存储
                if (currentConversation?.path) {
                  window.electron.saveMessages(
                    currentConversation.path,
                    currentConversation.id,
                    updatedMessages
                  ).then(() => {
                    // 更新状态
                    setMessages(updatedMessages);
                  }).catch(error => {
                    console.error('保存消息类型失败:', error);
                    alert('保存消息类型失败: ' + error.message);
                  });
                }
              }}
            >
              {!message.type ? "TypeN" : message.type === 'user' ? "TypeU" : "TypeA"}
            </button>
          </div>
        )}
      </div>

      {/* 使用 Portal 将编辑框渲染到 body */}
      {editingMessageId === message.id &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
            <div className="absolute inset-0 bg-base-300/50 backdrop-blur-sm" onClick={handleEditCancel}></div>
            <div className="relative bg-base-100 rounded-lg shadow-xl w-[90vw] max-w-[1200px] h-[80vh] flex flex-col">
              {/* 编辑器头部 */}
              <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-base-300">
                <div className="flex items-center gap-2">
                  {/* 语言选择 */}
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

                  {/* 主题选择 */}
                  <select 
                    className="select select-bordered select-sm"
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value)}
                  >
                    <option value="vs-dark">vs-dark</option>
                    <option value="light">light</option>
                    <option value="hc-black">hc-black</option>
                  </select>

                  {/* 字体大小调整 */}
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

                {/* 关闭按钮 */}
                <button 
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={handleEditCancel}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 编辑器内容 */}
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  language={editorLanguage}
                  theme={editorTheme}
                  value={editContent}
                  onChange={(value) => {
                    if (value !== undefined) {
                      setEditContent(value);
                    }
                  }}
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

              {/* 编辑器底部 */}
              <div className="flex-none flex justify-end gap-2 px-4 py-3 border-t border-base-300">
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={handleEditCancel}
                >
                  取消
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleEditSave(message.id, editContent)}
                >
                  保存
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}; 