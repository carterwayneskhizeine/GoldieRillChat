import React from 'react'
import { formatMessageTime } from '../utils/timeFormat'
import { MarkdownRenderer } from './shared/MarkdownRenderer'
import { SidebarCollapseButton, shouldShowCollapseButton } from './sidebarMessageCollapse.jsx'
import { openUrl } from '../utils/browserUtils'
import eventBus from './ThreeBackground/utils/eventBus'
import ReactAudioPlayer from 'react-audio-player'

export default function MessageList({
  messages,
  messagesEndRef,
  isCompact,
  editingMessage,
  editingFileName,
  setEditingFileName,
  fileNameInput,
  setFileNameInput,
  collapsedMessages,
  setCollapsedMessages,
  deletingMessageId,
  setDeletingMessageId,
  copiedMessageIds,
  setCopiedMessageIds,
  currentBackground,
  currentVideoBackground,
  currentConversation,
  // handlers
  handleRenameFile,
  renderAudioMessage,
  renderMediaContent,
  handleImageClick,
  handleEditImage,
  openFileLocation,
  enterEditMode,
  moveMessage,
  handleCopyClick,
  sendToMonaco,
  setMessages,
  // drag handlers
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleMouseMove,
  handleMouseLeave,
}) {
  return (
    <div
      id="chat-view-messages"
      className={`flex-1 overflow-y-auto p-4 ${isCompact ? 'compact-scroll' : ''} chat-view-messages`}
      style={{
        paddingBottom: isCompact ? '100px' : '140px',
        marginBottom: isCompact ? '60px' : '0px',
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="space-y-4 max-w-[1200px] mx-auto">
        {messages.map((message) => (
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
                        if (e.key === 'Enter') handleRenameFile(message, fileNameInput)
                      }}
                    />
                    <button className="btn btn-xs join-item" onClick={() => handleRenameFile(message, fileNameInput)}>Save</button>
                    <button className="btn btn-xs join-item" onClick={() => { setEditingFileName(null); setFileNameInput('') }}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="cursor-pointer hover:underline" onClick={() => { setEditingFileName(message.id); setFileNameInput(message.txtFile.displayName) }}>
                      {message.txtFile.displayName}
                    </span>
                    <span className="text-xs opacity-50">{formatMessageTime(message.timestamp)}</span>
                  </div>
                )
              ) : message.files?.some(file => !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) ? (
                <div className="flex items-center gap-2">
                  {editingFileName === message.id ? (
                    <div className="join">
                      <input
                        type="text"
                        value={fileNameInput}
                        onChange={(e) => setFileNameInput(e.target.value)}
                        className="input input-xs input-bordered join-item"
                        placeholder="Enter new file name"
                        onKeyPress={(e) => { if (e.key === 'Enter') handleRenameFile(message, fileNameInput) }}
                      />
                      <button className="btn btn-xs join-item" onClick={() => handleRenameFile(message, fileNameInput)}>Save</button>
                      <button className="btn btn-xs join-item" onClick={() => { setEditingFileName(null); setFileNameInput('') }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="text-xs cursor-pointer hover:underline"
                        onClick={() => {
                          const firstFileIndex = message.files.findIndex(file =>
                            file.name && !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                          )
                          if (firstFileIndex !== -1) {
                            setEditingFileName(message.id)
                            setFileNameInput(message.files[firstFileIndex].name.replace(/\.[^/.]+$/, ''))
                          }
                        }}
                      >
                        {message.files.map(file => file.name).join(', ')}
                      </span>
                      <span className="text-xs opacity-50">{formatMessageTime(message.timestamp)}</span>
                    </>
                  )}
                </div>
              ) : message.files?.some(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) ? (
                <div className="flex items-center gap-2">
                  {editingFileName?.startsWith(message.id) ? (
                    <div className="join">
                      <input
                        type="text"
                        value={fileNameInput}
                        onChange={(e) => setFileNameInput(e.target.value)}
                        className="input input-xs input-bordered join-item"
                        placeholder="Enter new file name"
                        onKeyPress={(e) => { if (e.key === 'Enter') handleRenameFile(message, fileNameInput) }}
                      />
                      <button className="btn btn-xs join-item" onClick={() => handleRenameFile(message, fileNameInput)}>Save</button>
                      <button className="btn btn-xs join-item" onClick={() => { setEditingFileName(null); setFileNameInput('') }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="text-xs cursor-pointer hover:underline"
                        onClick={() => {
                          const firstMediaIndex = message.files.findIndex(file =>
                            file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)
                          )
                          if (firstMediaIndex !== -1) {
                            setEditingFileName(`${message.id}_${firstMediaIndex}`)
                            setFileNameInput(message.files[firstMediaIndex].name.replace(/\.[^/.]+$/, ''))
                          }
                        }}
                      >
                        {message.files.map(file => file.name).join(', ')}
                      </span>
                      <span className="text-xs opacity-50">{formatMessageTime(message.timestamp)}</span>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xs opacity-50">{formatMessageTime(message.timestamp)}</span>
              )}
            </div>

            <div className={`chat-bubble ${
              message.type === 'user' ? 'chat-bubble-primary' :
              message.error ? 'chat-bubble-error' : 'chat-bubble-secondary'
            }`}>
              {shouldShowCollapseButton(message.content, message) && (
                <SidebarCollapseButton
                  messageId={message.id}
                  collapsedMessages={collapsedMessages}
                  setCollapsedMessages={setCollapsedMessages}
                />
              )}
              <div className="message-content">
                {editingMessage?.id === message.id ? null : (
                  <div className="prose max-w-none">
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
                        {message.files?.some(file => file.type && file.type.startsWith('audio/')) ? (
                          renderAudioMessage(message)
                        ) : message.files?.some(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                          <div className="media-content flex flex-col">
                            {message.content && (
                              <div className="mb-0">
                                <MarkdownRenderer
                                  content={message.content || ''}
                                  isCompact={false}
                                  onCopyCode={() => {}}
                                  onLinkClick={(href) => openUrl(href, true, true)}
                                />
                              </div>
                            )}
                            {message.files
                              .filter(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                              .map(file => renderMediaContent(file, handleImageClick))
                            }
                          </div>
                        ) : message.files?.some(file => file.name && file.name.match(/\.mp4$/i)) ? (
                          <div className="media-content flex flex-col">
                            {message.content && (
                              <div className="mb-0">
                                <MarkdownRenderer
                                  content={message.content || ''}
                                  isCompact={false}
                                  onCopyCode={() => {}}
                                  onLinkClick={(href) => openUrl(href, true, true)}
                                />
                              </div>
                            )}
                            {message.files
                              .filter(file => file.name && file.name.match(/\.mp4$/i))
                              .map(file => (
                                <div key={file.path} className="video-wrapper relative">
                                  {renderMediaContent(file, handleImageClick)}
                                </div>
                              ))
                            }
                          </div>
                        ) : message.files?.some(file => file.name && !file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) ? (
                          <div className="file-message">
                            {message.content && (
                              <div className="mb-4">
                                <MarkdownRenderer
                                  content={message.content || ''}
                                  isCompact={false}
                                  onCopyCode={() => {}}
                                  onLinkClick={(href) => openUrl(href, true, true)}
                                />
                              </div>
                            )}
                            {message.files.map((file, idx) => (
                              <div key={idx} className="file-item">
                                <span className="file-name">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={message.type === 'assistant' && message.reasoning_content ? 'mt-4' : ''}>
                            {message.generating ? (
                              <div className="typing-effect">{message.content}</div>
                            ) : (
                              <div className={collapsedMessages.has(message.id) ? 'max-h-[100px] overflow-hidden mask-bottom' : ''}>
                                <MarkdownRenderer
                                  content={message.content || ''}
                                  isCompact={false}
                                  onCopyCode={() => {}}
                                  onLinkClick={(href) => openUrl(href, true, true)}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {editingMessage?.id !== message.id && (
              <div className="message-actions">
                {!message.files?.length && message.content && (
                  <button className="btn btn-ghost btn-xs" onClick={() => enterEditMode(message)}>Edit</button>
                )}
                <button className="btn btn-ghost btn-xs" onClick={() => setDeletingMessageId(message.id)}>Delete</button>

                {message.files?.some(file => file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && (
                  <button
                    className={`btn btn-xs ${
                      currentBackground === message.files.find(f => f.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.path
                        ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => {
                      const imageFile = message.files.find(f => f.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                      if (imageFile) eventBus.toggleBackground(imageFile.path)
                    }}
                    title="设置/取消背景图片"
                  >BG</button>
                )}

                {message.files?.some(file => file.name && file.name.match(/\.mp4$/i)) && (
                  <button
                    className={`btn btn-xs ${
                      currentVideoBackground === message.files.find(f => f.name?.match(/\.mp4$/i))?.path
                        ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => {
                      const videoFile = message.files.find(f => f.name?.match(/\.mp4$/i))
                      if (videoFile) eventBus.toggleBackground(videoFile.path, true)
                    }}
                    title="设置/取消视频背景"
                  >MBG</button>
                )}

                <button className="btn btn-ghost btn-xs" onClick={() => handleCopyClick(message)}>
                  {copiedMessageIds.has(message.id) ? 'Copied' : 'Copy'}
                </button>

                {message.files?.length > 0 && (
                  <button className="btn btn-ghost btn-xs" onClick={() => openFileLocation(message.files[0])} title="打开文件位置">File</button>
                )}

                {messages.indexOf(message) > 0 && (
                  <button
                    className="btn btn-ghost btn-xs"
                    title="上移消息（按住Ctrl快速移到顶部）"
                    onClick={(e) => {
                      moveMessage(message.id, e.ctrlKey ? 'top' : 'up')
                      const isLong = message.content && (message.content.split('\n').length > 6 || message.content.length > 300)
                      if (isLong) setCollapsedMessages(prev => new Set([...prev, message.id]))
                      setTimeout(() => {
                        document.querySelector(`[data-message-id="${message.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 100)
                    }}
                  >Up</button>
                )}

                {messages.indexOf(message) < messages.length - 1 && (
                  <button
                    className="btn btn-ghost btn-xs"
                    title="下移消息（按住Ctrl快速移到底部）"
                    onClick={(e) => {
                      moveMessage(message.id, e.ctrlKey ? 'bottom' : 'down')
                      const isLong = message.content && (message.content.split('\n').length > 6 || message.content.length > 300)
                      if (isLong) setCollapsedMessages(prev => new Set([...prev, message.id]))
                      setTimeout(() => {
                        document.querySelector(`[data-message-id="${message.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 100)
                    }}
                  >Down</button>
                )}

                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    if (message.files?.some(file => file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                      const imageFile = message.files.find(f => f.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                      if (imageFile) handleEditImage(message, imageFile)
                    } else {
                      sendToMonaco(message)
                    }
                  }}
                >
                  {message.files?.some(file => file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? 'Edit' : 'Send'}
                </button>

                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    let newType
                    if (!message.type) newType = 'user'
                    else if (message.type === 'user') newType = 'assistant'
                    else newType = null

                    const updatedMessage = { ...message }
                    if (newType) updatedMessage.type = newType
                    else delete updatedMessage.type

                    const updatedMessages = messages.map(msg => msg.id === message.id ? updatedMessage : msg)
                    if (currentConversation) {
                      window.electron.saveMessages(currentConversation.path, currentConversation.id, updatedMessages)
                        .then(() => setMessages(updatedMessages))
                        .catch(err => alert('保存消息类型失败: ' + err.message))
                    }
                  }}
                >
                  {!message.type ? 'TypeN' : message.type === 'user' ? 'TypeU' : 'TypeA'}
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} style={{ height: '1px', clear: 'both' }} />
      </div>
    </div>
  )
}
