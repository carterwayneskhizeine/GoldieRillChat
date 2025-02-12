import React from 'react';

export const InputArea = ({
  messageInput,
  setMessageInput,
  handleSendMessage,
  handleKeyDown,
  fileInputRef
}) => {
  return (
    <div className="border-t border-base-300 p-4 bg-base-100">
      <div className="relative max-w-[750px] mx-auto">
        <textarea
          className="textarea textarea-bordered w-full min-h-[64px] max-h-[480px] rounded-3xl resize-none pr-24 bg-base-100 aichat-input"
          placeholder="输入消息..."
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
              handleSendMessage();
              e.target.style.height = '64px';
              e.target.style.overflowY = 'hidden';
            }
          }}
          onKeyDown={handleKeyDown}
          rows="2"
        />
        <div className="absolute right-4 bottom-3 flex items-center gap-2">
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
            onClick={() => handleSendMessage()}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}; 