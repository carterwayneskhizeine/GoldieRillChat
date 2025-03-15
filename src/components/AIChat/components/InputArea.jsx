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
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(() => {
    return localStorage.getItem('aichat_use_knowledge_base') === 'true';
  });
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState(() => {
    // 从localStorage中恢复已选择的知识库
    const savedBases = localStorage.getItem('aichat_selected_knowledge_bases');
    return savedBases ? JSON.parse(savedBases) : [];
  });
  const textareaRef = useRef(null);

  // 在组件挂载或重新渲染后设置正确的初始高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '100px';
    }
  }, []);
  
  // 当选中的知识库变化时，保存到localStorage
  useEffect(() => {
    localStorage.setItem('aichat_selected_knowledge_bases', JSON.stringify(selectedKnowledgeBases));
  }, [selectedKnowledgeBases]);

  // 监听localStorage中知识库功能状态的变化
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'aichat_use_knowledge_base') {
        setUseKnowledgeBase(e.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
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

  // 处理键盘事件
  const handleInputKeyDown = (e) => {
    // 如果按下Enter键且没有按住Shift键
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // 检查文本框是否有多行文本
      const textarea = e.target;
      const text = textarea.value;
      const hasMultipleLines = text.includes('\n');
      
      // 如果有多行文本，则不阻止默认行为，允许在文本中移动光标
      if (hasMultipleLines) {
        // 不做任何处理，让浏览器默认行为生效
        // 这样可以在多行文本中正常移动光标
        e.stopPropagation(); // 阻止事件冒泡，防止父组件处理
      } else {
        // 否则，将事件传递给父组件的handleKeyDown
        handleKeyDown(e);
      }
    } else {
      // 将其他键盘事件传递给原始的handleKeyDown
      handleKeyDown(e);
    }
  };

  const handleContextMenu = (e) => {
    // 在bg-theme模式下，允许默认右键菜单显示
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'bg-theme') {
      return; // 不阻止默认行为，允许原生右键菜单显示
    }
    
    // 其他主题下继续使用自定义右键菜单
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
    
    // 如果有选择知识库但知识库功能未启用，则自动启用
    if (selectedKnowledgeBases?.length > 0 && !useKnowledgeBase) {
      localStorage.setItem('aichat_use_knowledge_base', 'true');
      setUseKnowledgeBase(true);
      toastManager.success('已自动启用知识库功能');
    }
    
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
      <div className="relative max-w-[770px] mx-auto">
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
            className={`textarea textarea-bordered w-full min-h-[100px] max-h-[480px] rounded-3xl resize-none pb-10 bg-transparent scrollbar-hide aichat-input ${
              isCompact ? 'text-sm shadow-lg' : ''
            }`}
            placeholder="Send a message..."
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              e.target.style.height = '100px'; // 重置为初始高度（3行文字高度）
              const scrollHeight = Math.max(e.target.scrollHeight, 100);
              e.target.style.height = `${scrollHeight}px`;
              if (e.target.scrollHeight > 480) {
                e.target.style.overflowY = 'scroll';
              } else {
                e.target.style.overflowY = 'hidden';
              }
            }}
            onKeyDown={handleInputKeyDown}
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
          
          {/* 左侧按钮容器 - 绝对定位在textarea底部，增加左侧内边距使按钮位置更明显 */}
          <div className="absolute left-4 bottom-3 flex items-center gap-2" style={{ zIndex: 1500 }}>
            {isTranslating ? (
              <div className="relative inline-flex items-center justify-center w-8 h-8">
                <button
                  className="btn btn-sm btn-circle translation-loading-btn absolute inset-0"
                  disabled={true}
                  title="正在翻译..."
                >
                </button>
                <div className="translation-loading-spinner z-10"></div>
              </div>
            ) : (
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={handleTranslation}
                title="翻译（使用 DeepSeek 的 deepseek-chat 模型，支持中英互译）"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </button>
            )}
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
              onSelect={(bases) => {
                // 启用知识库功能
                const newKnowledgeBaseState = true;
                localStorage.setItem('aichat_use_knowledge_base', 'true');
                setUseKnowledgeBase(newKnowledgeBaseState);
                // 显示提示
                if (bases.length > 0 && !useKnowledgeBase) {
                  toastManager.success('已启用知识库功能');
                }
                // 调用原有的知识库选择处理函数
                handleKnowledgeBaseSelect(bases);
              }}
              disabled={false}
              title={`${useKnowledgeBase ? '知识库功能已启用' : '点击选择知识库并启用功能'}${selectedKnowledgeBases.length > 0 ? `（已选择${selectedKnowledgeBases.length}个知识库）` : ''}`}
            />
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => fileInputRef.current?.click()}
              title="上传文件"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
              </svg>
            </button>
          </div>
          
          {/* 右侧按钮容器 - 绝对定位在textarea底部，增加右侧内边距使按钮位置更明显 */}
          <div className="absolute right-3 bottom-3 flex items-center gap-2" style={{ zIndex: 1500 }}>
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