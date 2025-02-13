import React, { useState } from 'react';
import { MarkdownRenderer } from '../../shared/MarkdownRenderer';
import '../styles/messages.css';

export const MessageItem = ({
  message,
  selectedModel,
  editingMessageId,
  editContent,
  setEditContent,
  collapsedMessages,
  setCollapsedMessages,
  handleEditStart,
  handleEditCancel,
  handleEditSave,
  handleDeleteMessage,
  handleRetry,
  handleHistoryNavigation
}) => {
  // 添加推理过程折叠状态
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(false);

  return (
    <div
      className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container`}
      data-message-id={message.id}
    >
      {/* 消息头部 */}
      <div className="chat-header opacity-70">
        <span className="text-xs">
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
      }`}>
        <div className="message-content">
          {/* 折叠按钮 - 只在消息不是生成状态时显示 */}
          {message.content && 
           !message.generating && 
           (message.content.split('\n').length > 6 || message.content.length > 300) && (
            <div className="collapse-button">
              <button 
                className="btn btn-xs btn-ghost btn-circle bg-base-100 hover:bg-base-200"
                onClick={(e) => {
                  const isCollapsed = collapsedMessages.has(message.id);
                  const newSet = new Set([...collapsedMessages]);
                  const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
                  
                  if (isCollapsed) {
                    // 展开消息
                    newSet.delete(message.id);
                    setCollapsedMessages(newSet);
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
            {editingMessageId === message.id ? (
              <div className="flex flex-col gap-2 w-full max-w-[1200px] mx-auto">
                <div className="mockup-code min-w-[800px] bg-base-300 relative">
                  <textarea
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value);
                      // 自动调整高度
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 800)}px`;
                    }}
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
                    onClick={handleEditCancel}
                  >
                    取消
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEditSave(message.id)}
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className={`prose max-w-none ${
                collapsedMessages.has(message.id) ? 'max-h-[100px] overflow-hidden mask-bottom' : ''
              }`}>
                {message.generating ? (
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
                        {/* 推理内容 */}
                        <div className={`typing-content ${message.generating ? 'generating' : ''} ${
                          isReasoningCollapsed ? 'max-h-[100px] overflow-hidden mask-bottom' : ''
                        }`}>
                          {message.reasoning_content}
                        </div>
                        {/* 添加折叠按钮 - 放在内容下方中间 */}
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
                    {/* 显示最终内容 */}
                    <div className={message.type === 'assistant' && message.reasoning_content ? 'mt-4' : ''}>
                      <MarkdownRenderer
                        content={message.content || ''}
                        isCompact={false}
                        onCopyCode={(code) => {
                          console.log('Code copied:', code);
                        }}
                        onLinkClick={(href) => {
                          window.electron.openExternal(href);
                        }}
                      />
                    </div>
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
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleEditStart(message)}
          >
            编辑
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleDeleteMessage(message.id)}
          >
            删除
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => {
              navigator.clipboard.writeText(message.content);
            }}
          >
            复制
          </button>
          {message.type === 'assistant' && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => handleRetry(message.id)}
            >
              重试
            </button>
          )}
          {message.history?.length > 0 && (
            <>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => handleHistoryNavigation(message.id, 'prev')}
                disabled={!message.currentHistoryIndex}
              >
                上一个
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => handleHistoryNavigation(message.id, 'next')}
                disabled={message.currentHistoryIndex === message.history.length}
              >
                下一个
              </button>
              <span className="text-xs opacity-70">
                {message.currentHistoryIndex === message.history.length ? 
                  '当前' : 
                  `${message.currentHistoryIndex + 1}/${message.history.length + 1}`}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}; 