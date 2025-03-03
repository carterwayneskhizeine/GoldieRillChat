import React, { useState } from 'react';
import { translateText } from '../../../services/translationService';
import toastManager from '../../../utils/toastManager';

export const InputArea = ({
  messageInput,
  setMessageInput,
  handleSendMessage,
  handleKeyDown,
  fileInputRef,
  isNetworkEnabled,
  setIsNetworkEnabled,
  selectedFiles = [],
  handleFileSelect,
  removeFile,
  selectedProvider,
  selectedModel,
  apiKey,
  apiHost
}) => {
  const [isTranslating, setIsTranslating] = useState(false);

  // 处理翻译功能
  const handleTranslation = async () => {
    if (!messageInput.trim()) {
      toastManager.warning('请先输入要翻译的文本');
      return;
    }

    // 如果已经在翻译中，不重复执行
    if (isTranslating) return;

    try {
      setIsTranslating(true);
      
      // 执行翻译
      const translatedText = await translateText(
        messageInput,
        selectedProvider,
        selectedModel,
        apiKey,
        apiHost
      );
      
      // 更新输入框文本
      setMessageInput(translatedText);
      toastManager.success('翻译完成', { duration: 3000 });
    } catch (error) {
      console.error('翻译失败:', error);
      toastManager.error('翻译失败: ' + error.message, { duration: 3000 });
    } finally {
      setIsTranslating(false);
    }
  };

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
        {/* 显示已选择的文件 */}
        {selectedFiles && selectedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div 
                key={index} 
                className="badge badge-neutral gap-1 p-3"
                title={file.name}
              >
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button 
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => removeFile(index)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
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
            className={`btn btn-ghost btn-sm btn-circle ${isTranslating ? 'loading' : ''}`}
            onClick={handleTranslation}
            title="翻译（使用 Qwen2-1.5B-Instruct 模型，支持中英互译）"
            disabled={isTranslating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </button>
          <button
            className={`btn btn-ghost btn-sm btn-circle ${isNetworkEnabled ? 'text-primary' : ''}`}
            onClick={() => setIsNetworkEnabled(!isNetworkEnabled)}
            title={isNetworkEnabled ? '关闭网络搜索' : '开启网络搜索'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => console.log('知识库功能点击')}
            title="知识库查询"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => fileInputRef.current?.click()}
            title="上传文件"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => {
              console.log('发送消息，当前选中的文件:', selectedFiles?.length || 0);
              handleSendMessage();
              setMessageInput('');
              const textarea = document.querySelector('.aichat-input');
              if (textarea) {
                textarea.style.height = '64px';
                textarea.style.overflowY = 'hidden';
              }
            }}
            title="发送消息"
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