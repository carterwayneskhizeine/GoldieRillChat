import React, { useRef } from 'react'
import { formatMessageTime } from '../utils/timeFormat'
import { handleFileSelect, removeFile, handleFileDrop } from './fileHandlers'
import { handlePaste } from './pasteHandler'
import { copyMessageContent } from './messageUtils'
import { moveMessage as moveMessageOp } from './messageMovement'

export function ChatDropdown({
  messages,
  currentConversation,
  messageInput,
  setMessageInput,
  selectedFiles,
  setSelectedFiles,
  editingMessage,
  setEditingMessage,
  sendMessage,
  deleteMessage,
  updateMessage,
  moveMessage,
  collapsedMessages,
  toggleMessageCollapse,
  handleImageClick
}) {
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  return (
    <div 
      className="dropdown-content menu shadow bg-base-200 rounded-box w-[600px] max-h-[600px] overflow-y-auto"
      style={{
        position: 'fixed',
        right: '220px',  // 侧边栏宽度 + 一些间距
        top: '60px',     // 标题栏高度 + 一些间距
        zIndex: 1000
      }}
    >
      {/* Messages Area */}
      <div 
        className="overflow-y-auto"
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => handleFileDrop(e, currentConversation, setSelectedFiles, window.electron)}
      >
        <div className="py-4 px-6">
          {messages.map(message => (
            <div key={message.id} className="chat chat-start mb-8 relative">
              <div className="chat-header opacity-70">
                <span className="text-xs opacity-50">
                  {formatMessageTime(message.timestamp)}
                </span>
              </div>
              <div className="chat-bubble relative max-w-[500px] break-words">
                <div className="flex flex-col gap-2 group">
                  {message.content && (
                    <div className="flex justify-between items-start">
                      <div 
                        className={`prose max-w-none break-words w-full ${
                          collapsedMessages.has(message.id)
                            ? 'max-h-[144px] overflow-y-auto' 
                            : ''
                        }`}
                        style={{
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {message.content}
                      </div>
                    </div>
                  )}
                  {message.files?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.files.map((file, index) => (
                        file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <div 
                            key={index} 
                            className="relative"
                          >
                            <img 
                              src={`local-file://${file.path}`} 
                              alt={file.name}
                              className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"
                              onClick={(e) => handleImageClick(e, file)}
                            />
                          </div>
                        ) : file.name.match(/\.mp4$/i) ? (
                          <div key={index} className="w-full">
                            <video controls className="w-full max-w-[500px] rounded-lg">
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
                  <div className="absolute -bottom-8 -left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="btn btn-ghost btn-xs bg-base-100"
                      onClick={() => deleteMessage(message.id)}
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
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="mt-4 px-4">
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
              setMessageInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            onPaste={(e) => handlePaste(e, currentConversation, setSelectedFiles, window.electron)}
            placeholder="Send a message..."
            className="textarea textarea-bordered w-full min-h-[48px] max-h-[200px] pr-24 bg-base-100 rounded-xl resize-none"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e, currentConversation, setSelectedFiles, window.electron)}
            className="hidden"
            multiple
          />
        </div>
      </div>
    </div>
  )
} 