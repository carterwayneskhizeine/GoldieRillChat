import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { debounce } from '../utils/debounce';
import { KEYBOARD_SHORTCUTS } from '../constants';

// 使用 React.memo 优化 InputArea 组件
export const InputArea = React.memo(({
  messageInput,
  setMessageInput,
  handleSendMessage,
  handleKeyDown,
  fileInputRef,
  isNetworkEnabled,
  setIsNetworkEnabled,
}) => {
  // 使用 useRef 存储 textarea 的引用和防抖函数
  const textareaRef = useRef(null);
  const resizeObserverRef = useRef(null);
  
  // 使用 useState 管理本地状态
  const [localInput, setLocalInput] = useState(messageInput);
  const [isComposing, setIsComposing] = useState(false);
  
  // 使用 useMemo 创建防抖函数
  const debouncedSetMessageInput = useMemo(
    () => debounce((value) => {
      setMessageInput(value);
    }, 300),
    [setMessageInput]
  );

  // 使用 useCallback 优化文本框高度调整
  const adjustTextareaHeight = useCallback((element) => {
    if (!element) return;
    
    element.style.height = 'auto';
    const newHeight = Math.min(element.scrollHeight, 480);
    element.style.height = `${newHeight}px`;
    element.style.overflowY = newHeight === 480 ? 'scroll' : 'hidden';
  }, []);

  // 使用 useCallback 优化输入处理
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setLocalInput(value);
    adjustTextareaHeight(e.target);
    debouncedSetMessageInput(value);
  }, [adjustTextareaHeight, debouncedSetMessageInput]);

  // 使用 useCallback 优化按键处理
  const handleKeyPress = useCallback((e) => {
    if (e.key === KEYBOARD_SHORTCUTS.SEND.key && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
      
      // 重置文本框高度
      if (textareaRef.current) {
        textareaRef.current.style.height = '64px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [handleSendMessage, isComposing]);

  // 使用 useCallback 优化输入法事件处理
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  // 使用 useCallback 优化上下文菜单处理
  const handleContextMenu = useCallback((e) => {
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
              const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
              
              setLocalInput(newValue);
              debouncedSetMessageInput(newValue);
              
              requestAnimationFrame(() => {
                target.selectionStart = target.selectionEnd = start + text.length;
                adjustTextareaHeight(target);
              });
            }
          }
        }
      }
    });
    window.dispatchEvent(contextMenuEvent);
  }, [adjustTextareaHeight, debouncedSetMessageInput]);

  // 使用 useEffect 同步外部输入状态
  useEffect(() => {
    setLocalInput(messageInput);
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [messageInput, adjustTextareaHeight]);

  // 使用 useEffect 设置 ResizeObserver
  useEffect(() => {
    if (textareaRef.current && !resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        adjustTextareaHeight(textareaRef.current);
      });
      resizeObserverRef.current.observe(textareaRef.current);
    }
    
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [adjustTextareaHeight]);

  // 使用 useMemo 缓存样式对象
  const textareaStyle = useMemo(() => ({
    backgroundColor: 'transparent',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)', // 为 Safari 添加支持
  }), []);

  return (
    <div className="border-t border-base-300 p-4 bg-transparent">
      <div className="relative max-w-[750px] mx-auto">
        <textarea
          ref={textareaRef}
          className="textarea textarea-bordered w-full min-h-[64px] max-h-[480px] rounded-3xl resize-none pr-24 bg-transparent aichat-input"
          placeholder="输入消息..."
          value={localInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDown}
          onContextMenu={handleContextMenu}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          style={textareaStyle}
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
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性改变时重新渲染
  return (
    prevProps.messageInput === nextProps.messageInput &&
    prevProps.isNetworkEnabled === nextProps.isNetworkEnabled
  );
}); 