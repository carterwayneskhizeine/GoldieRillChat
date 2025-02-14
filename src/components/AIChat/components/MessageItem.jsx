import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Editor from "@monaco-editor/react";
import { MarkdownRenderer } from '../../shared/MarkdownRenderer';
import { shouldCollapseMessage, getMessageContentStyle } from '../utils/messageCollapse';
import '../styles/messages.css';

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
  handleHistoryNavigation,
  isCollapsed,
  onToggleCollapse
}) => {
  // 添加推理过程折叠状态
  const [isReasoningCollapsed, setIsReasoningCollapsed] = useState(false);
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // 获取消息内容样式
  const contentStyle = getMessageContentStyle(isCollapsed);

  return (
    <>
      <div
        className={`chat ${message.type === 'user' ? 'chat-end' : 'chat-start'} relative message-container ${
          isCollapsed ? 'aichat-message-collapsed' : ''
        }`}
        data-message-id={message.id}
        data-aichat-message="true"
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
          {/* 添加折叠按钮 */}
          {shouldCollapseMessage(message) && (
            <button
              className="aichat-collapse-btn"
              onClick={() => onToggleCollapse(message.id, isCollapsed)}
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
          <div className="message-content">
            <div className="response-content" style={contentStyle}>
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
                          <div className={`typing-content ${message.generating ? 'generating' : ''} ${
                            isReasoningCollapsed ? 'max-h-[100px] overflow-hidden mask-bottom' : ''
                          }`}>
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
                      {/* 显示最终内容 */}
                      <div className={message.type === 'assistant' && message.reasoning_content ? 'mt-4' : ''}>
                        {message.generating ? (
                          <div className="typing-effect">
                            {message.content}
                          </div>
                        ) : (
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
                        )}
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
            {/* 仅当消息没有附件文件且是用户消息时显示编辑按钮 */}
            {!message.files?.length && message.type === 'user' && (
              <button className="btn btn-ghost btn-xs" onClick={() => handleEditStart(message)}>编辑</button>
            )}
            <button className="btn btn-ghost btn-xs" onClick={() => handleDeleteMessage(message.id)}>删除</button>
            {/* 仅当消息没有附件文件时显示复制按钮 */}
            {!message.files?.length && (
              <button className="btn btn-ghost btn-xs" onClick={() => navigator.clipboard.writeText(message.content)}>复制</button>
            )}
            {/* AI 消息的编辑按钮 */}
            {!message.files?.length && message.type === 'assistant' && (
              <button className="btn btn-ghost btn-xs" onClick={() => handleEditStart(message)}>编辑</button>
            )}
            {message.type === 'assistant' && (
              <button className="btn btn-ghost btn-xs" onClick={() => handleRetry(message.id)}>重试</button>
            )}
            {/* 发送到编辑器按钮 */}
            {(message.files?.every(file => 
              file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            ) || !message.files?.length) && (
              <button className="btn btn-ghost btn-xs" onClick={() => {
                // 如果消息包含图片，发送到图片编辑器
                if (message.files?.some(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                  sendToEditor(message);
                } else {
                  // 否则发送到 Monaco 编辑器
                  sendToMonaco(message);
                }
              }}>发送</button>
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
                  onChange={(value) => setEditContent(value)}
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
                  onClick={() => handleEditSave(message.id)}
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