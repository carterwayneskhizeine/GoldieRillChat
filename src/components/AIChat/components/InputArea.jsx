import React from 'react';

export const InputArea = ({
  messageInput,
  setMessageInput,
  handleSendMessage,
  handleKeyDown,
  fileInputRef,
  isNetworkEnabled,
  setIsNetworkEnabled,
}) => {
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const selectedText = window.getSelection().toString();
    const target = e.target;
    
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

  return (
    <div className="border-t border-base-300 p-4 bg-transparent">
      <div className="relative max-w-[750px] mx-auto">
        <textarea
          className="textarea textarea-bordered w-full min-h-[64px] max-h-[480px] rounded-3xl resize-none pr-24 bg-transparent aichat-input"
          placeholder="Send a message..."
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
              setMessageInput('');
              e.target.style.height = '64px';
              e.target.style.overflowY = 'hidden';
            }
          }}
          onKeyDown={handleKeyDown}
          onContextMenu={handleContextMenu}
          style={{
            backgroundColor: 'transparent',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)', // 为 Safari 添加支持
          }}
          rows="2"
        />
        <div className="absolute right-4 bottom-3 flex items-center gap-2">
          <button
            className={`btn btn-ghost btn-sm btn-circle ${isNetworkEnabled ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setIsNetworkEnabled(!isNetworkEnabled)}
            title={isNetworkEnabled ? "禁用网络搜索" : "启用网络搜索"}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </button>
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
            onClick={() => {
              handleSendMessage();
              setMessageInput('');
              const textarea = document.querySelector('.aichat-input');
              if (textarea) {
                textarea.style.height = '64px';
                textarea.style.overflowY = 'hidden';
              }
            }}
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