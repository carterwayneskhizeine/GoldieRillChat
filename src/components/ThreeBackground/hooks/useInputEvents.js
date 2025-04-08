import { useEffect } from 'react';
import eventBus from '../utils/eventBus';

export const useInputEvents = () => {
  useEffect(() => {
    // 通用的输入处理函数
    const handleInput = (event) => {
      const target = event.target;
      
      // 检查是否是输入相关的元素
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true' ||
        target.classList.contains('monaco-editor') // Monaco编辑器
      ) {
        eventBus.emit('input', {
          type: target.tagName.toLowerCase(),
          value: target.value || target.textContent,
          element: target
        });
      }
    };

    // 监听键盘输入
    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true' ||
        target.classList.contains('monaco-editor')
      ) {
        eventBus.emit('input', {
          type: 'keydown',
          key: event.key,
          element: target
        });
      }
    };

    // 监听粘贴事件
    const handlePaste = (event) => {
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true' ||
        target.classList.contains('monaco-editor')
      ) {
        eventBus.emit('input', {
          type: 'paste',
          element: target
        });
      }
    };

    // 监听 Monaco 编辑器的变化
    const handleMonacoChange = () => {
      if (window.monacoEditor) {
        eventBus.emit('input', {
          type: 'monaco',
          element: document.querySelector('.monaco-editor')
        });
      }
    };

    // 添加事件监听
    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handlePaste);
    
    // 如果 Monaco 编辑器存在，添加变化监听
    if (window.monacoEditor) {
      window.monacoEditor.onDidChangeModelContent(() => {
        handleMonacoChange();
      });
    }

    // 清理函数
    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('paste', handlePaste);
    };
  }, []);
}; 