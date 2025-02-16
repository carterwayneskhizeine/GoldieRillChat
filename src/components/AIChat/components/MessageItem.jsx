import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Editor from "@monaco-editor/react";
import { MarkdownRenderer } from '../../shared/MarkdownRenderer';
import { shouldCollapseMessage, getMessageContentStyle } from '../utils/messageCollapse';
import '../styles/messages.css';

// 将 SearchSources 组件使用 React.memo 优化
const SearchSources = React.memo(({ sources, openInBrowserTab }) => {
  const [showSources, setShowSources] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  // 使用 useCallback 优化位置计算
  const calculatePosition = useCallback(() => {
    if (showSources && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const willOverflowRight = buttonRect.left + 320 > viewportWidth;
      const spaceBelow = viewportHeight - buttonRect.bottom - 8;
      const spaceAbove = buttonRect.top - 8;
      const shouldShowAbove = spaceBelow < 300 && spaceAbove > 300;
      
      setPosition({
        top: shouldShowAbove ? buttonRect.top - 8 - 300 : buttonRect.bottom + 8,
        left: willOverflowRight ? buttonRect.right - 320 : buttonRect.left
      });
    }
  }, [showSources]);

  useEffect(() => {
    calculatePosition();
  }, [showSources, calculatePosition]);

  const handleLinkClick = useCallback((url) => {
    openInBrowserTab(url);
    setShowSources(false);
  }, [openInBrowserTab]);

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
}, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.sources) === JSON.stringify(nextProps.sources);
});

// 使用 React.memo 优化 MessageItem 组件
export const MessageItem = React.memo(({
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
  openInBrowserTab
}) => {
  // 使用 useState 和 useRef 管理本地状态
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);

  // 使用 useCallback 优化事件处理函数
  const handleCopySelectedText = useCallback((e) => {
    if (e.ctrlKey && e.key === 'c') {
      const selectedText = window.getSelection().toString();
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
      }
    }
  }, []);

  // 使用 useEffect 优化事件监听
  useEffect(() => {
    document.addEventListener('keydown', handleCopySelectedText);
    return () => {
      document.removeEventListener('keydown', handleCopySelectedText);
    };
  }, [handleCopySelectedText]);

  const handleEditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // 使用 useMemo 缓存样式计算
  const contentStyle = useMemo(() => 
    getMessageContentStyle(isCollapsed), 
    [isCollapsed]
  );

  // 使用 useCallback 优化媒体渲染函数
  const renderMediaContent = useCallback((file) => {
    if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <div key={file.path} className="media-container my-2">
          <img
            src={`local-file://${file.path}`}
            alt={file.name}
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => onImageClick(e, file)}
            style={{ maxHeight: '300px', objectFit: 'contain' }}
          />
        </div>
      );
    } else if (file.name.match(/\.mp4$/i)) {
      return (
        <div key={file.path} className="media-container my-2">
          <video
            src={`local-file://${file.path}`}
            controls
            className="max-w-full rounded-lg"
            style={{ maxHeight: '300px' }}
          >
            您的浏览器不支持视频播放。
          </video>
        </div>
      );
    }
    return null;
  }, [onImageClick]);

  // 使用 useMemo 缓存消息时间戳
  const messageTimestamp = useMemo(() => 
    new Date(message.timestamp).toLocaleString(),
    [message.timestamp]
  );

  // 使用 useMemo 缓存消息内容
  const messageContent = useMemo(() => {
    if (editingMessageId === message.id) {
      return null;
    }
    
    if (message.generating && !message.content) {
      return (
        <div className="thinking-animation">
          <span className="thinking-text">Thinking</span>
          <div className="thinking-dots">
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
          </div>
        </div>
      );
    }

    return (
      <div className={`prose max-w-none`}>
        <MarkdownRenderer content={message.content} />
        {message.files?.map(renderMediaContent)}
      </div>
    );
  }, [message.content, message.files, message.generating, editingMessageId, message.id, renderMediaContent]);

  return (
    <div
      className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container ${
        isCollapsed ? 'aichat-message-collapsed' : ''
      }`}
      data-message-id={message.id}
      data-aichat-message="true"
      style={{ userSelect: 'text' }}
    >
      <div className="chat-header opacity-70" style={{ userSelect: 'text' }}>
        <span className="text-xs" style={{ userSelect: 'text' }}>
          {messageTimestamp}
          {message.type === 'assistant' && (
            <>
              {' • '}模型: {message.model || selectedModel}
              {message.tokens ? ` • Token: ${message.tokens}` : message.usage?.total_tokens ? ` • Token: ${message.usage.total_tokens}` : ''}
              {message.error && ' • 错误'}
            </>
          )}
        </span>
      </div>

      <div className={`chat-bubble ${
        message.type === 'user' ? 'chat-bubble-primary' : 
        message.error ? 'chat-bubble-error' : 'chat-bubble-secondary'
      }`}
      style={{ userSelect: 'text', position: 'relative', overflow: 'visible' }}
      >
        {message.searchResults && (
          <div className="absolute bottom-0 right-0 -mb-[30px]" style={{ zIndex: 50 }}>
            <SearchSources 
              sources={message.searchResults} 
              openInBrowserTab={openInBrowserTab}
            />
          </div>
        )}

        {shouldCollapseMessage(message) && (
          <button
            className="aichat-collapse-btn"
            onClick={() => onToggleCollapse(message.id, isCollapsed)}
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
            {messageContent}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性改变时重新渲染
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.generating === nextProps.message.generating &&
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.editingMessageId === nextProps.editingMessageId &&
    JSON.stringify(prevProps.message.files) === JSON.stringify(nextProps.message.files) &&
    JSON.stringify(prevProps.message.searchResults) === JSON.stringify(nextProps.message.searchResults)
  );
}); 