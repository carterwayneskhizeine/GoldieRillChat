import React, { useState, useEffect, useRef } from 'react';
import { translateText } from '../../../services/translationService';
import toastManager from '../../../utils/toastManager';
import KnowledgeBaseButton from './KnowledgeBaseButton';

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
  apiHost,
  isCompact = false
}) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState([]);
  const textareaRef = useRef(null);

  // 在组件挂载或重新渲染后设置正确的初始高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '72px';
    }
  }, []);

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

  // 处理知识库选择
  const handleKnowledgeBaseSelect = (bases) => {
    setSelectedKnowledgeBases(bases);
  };

  // 发送消息时包含知识库信息
  const sendMessage = () => {
    console.log('发送消息，当前选中的知识库:', selectedKnowledgeBases?.length || 0);
    
    // 创建包含知识库信息的参数
    const messageParams = {
      knowledgeBaseIds: selectedKnowledgeBases.map(base => base.id),
      useWebSearch: isNetworkEnabled
    };
    
    // 调用父组件的发送消息函数，传递知识库信息
    handleSendMessage(messageParams);
    
    // 清空输入框
    setMessageInput('');
    
    // 重置输入框高度
    const textarea = document.querySelector('.aichat-input');
    if (textarea) {
      textarea.style.height = '64px';
      textarea.style.overflowY = 'hidden';
    }
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
        
        <div className="relative">
          <textarea
            className={`textarea textarea-bordered w-full min-h-[72px] max-h-[480px] rounded-3xl resize-none pb-10 bg-transparent scrollbar-hide aichat-input ${
              isCompact ? 'text-sm shadow-lg' : ''
            }`}
            placeholder="Send a message..."
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              e.target.style.height = '72px'; // 重置为初始高度（3行文字高度）
              const scrollHeight = Math.max(e.target.scrollHeight, 72);
              e.target.style.height = `${scrollHeight}px`;
              if (e.target.scrollHeight > 480) {
                e.target.style.overflowY = 'scroll';
              } else {
                e.target.style.overflowY = 'hidden';
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            onKeyDown={handleKeyDown}
            onContextMenu={handleContextMenu}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              backgroundColor: 'transparent',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)', // 为 Safari 添加支持
              position: 'relative',
              zIndex: 1 // 设置较低的z-index值
            }}
            rows="2"
            ref={textareaRef}
          />
          
          {/* 左侧按钮容器 - 绝对定位在textarea底部 */}
          <div className="absolute left-4 bottom-3 flex items-center gap-2" style={{ zIndex: 1500 }}>
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
              className={`btn btn-ghost btn-sm btn-circle ${isNetworkEnabled ? 'text-primary search-enabled' : 'search-disabled'}`}
              onClick={() => {
                const newValue = !isNetworkEnabled;
                setIsNetworkEnabled(newValue);
                localStorage.setItem('aichat_use_web_search', newValue.toString());
              }}
              title={isNetworkEnabled ? '关闭网络搜索' : '开启网络搜索'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <KnowledgeBaseButton 
              selectedBases={selectedKnowledgeBases}
              onSelect={handleKnowledgeBaseSelect}
            />
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => fileInputRef.current?.click()}
              title="上传文件"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </div>
          
          {/* 右侧按钮容器 - 绝对定位在textarea底部 */}
          <div className="absolute right-4 bottom-3 flex items-center gap-2" style={{ zIndex: 1500 }}>
            <button 
              className="btn btn-ghost btn-sm btn-circle"
              onClick={sendMessage}
              title="发送消息"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 