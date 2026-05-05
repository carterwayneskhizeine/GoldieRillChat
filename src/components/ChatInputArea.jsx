import React, { useRef, useEffect } from 'react'
import { handlePaste } from './pasteHandler'
import { removeFile } from './fileHandlers'

export default function ChatInputArea({
  editingMessage,
  isCompact,
  selectedFiles,
  setSelectedFiles,
  messageInput,
  setMessageInput,
  sendMessage,
  currentConversation,
  handleContextMenu,
  fileInputRef: externalFileInputRef,
}) {
  const textareaRef = useRef(null)
  const localFileInputRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '100px'
    }
  }, [])

  if (editingMessage) return null

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 ${
        isCompact ? 'p-2 pointer-events-none bg-transparent' : 'p-4 bg-transparent'
      }`}
      style={{ bottom: isCompact ? '63px' : '0px' }}
    >
      <div className={`${isCompact ? 'max-w-[300px] mx-auto pointer-events-auto' : 'max-w-[770px] mx-auto'}`}>
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
              e.target.style.height = '100px'
              const scrollHeight = Math.max(e.target.scrollHeight, 100)
              e.target.style.height = `${scrollHeight}px`
              e.target.style.overflowY = e.target.scrollHeight > 480 ? 'scroll' : 'hidden'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
                e.target.style.height = '100px'
                e.target.style.overflowY = 'hidden'
              }
            }}
            onPaste={(e) => handlePaste(e, currentConversation, setSelectedFiles, window.electron)}
            onContextMenu={handleContextMenu}
            placeholder="Send a message..."
            className={`textarea textarea-bordered w-full min-h-[100px] max-h-[480px] rounded-3xl resize-none pb-10 scrollbar-hide bg-transparent ${
              isCompact ? 'text-sm shadow-lg' : ''
            }`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              backgroundColor: 'transparent',
              backdropFilter: 'blur(8px)',
            }}
            rows="2"
            ref={textareaRef}
          />
          <div className="absolute bottom-3 left-[15px] flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => (externalFileInputRef || localFileInputRef).current?.click()}
              title="上传文件"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
              </svg>
            </button>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button className="btn btn-ghost btn-sm btn-circle" onClick={sendMessage}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
