import React, { useState, useEffect, useRef } from 'react';
import '../styles/daisytextarea.css';

// 创建一个全局状态管理对象
const TextareaState = {
  isVisible: false,
  position: { top: 50 }, // 初始垂直位置为50%（中间位置）
  toggleVisibility: () => {
    TextareaState.isVisible = !TextareaState.isVisible;
    // 触发自定义事件通知组件更新
    window.dispatchEvent(new CustomEvent('textarea-visibility-change', {
      detail: { isVisible: TextareaState.isVisible }
    }));
  }
};

// 添加全局快捷键处理
document.addEventListener('keydown', (e) => {
  // 检测 Ctrl+X 组合键
  if (e.ctrlKey && e.key === 'x') {
    e.preventDefault(); // 阻止默认行为
    TextareaState.toggleVisibility();
  }
});

const DaisyTextarea = ({ 
  defaultValue = '',
  onChange,
  onSave,
  onClose: externalOnClose // 重命名为 externalOnClose 以区分
}) => {
  const [textContent, setTextContent] = useState(defaultValue);
  const [isModified, setIsModified] = useState(false);
  const [isVisible, setIsVisible] = useState(TextareaState.isVisible);
  const [noteNumber, setNoteNumber] = useState(1);
  const [noteInputValue, setNoteInputValue] = useState('1');
  const [statusMessage, setStatusMessage] = useState('准备就绪');
  const [currentFilePath, setCurrentFilePath] = useState('');
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(TextareaState.position);
  const noteInputRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartRef = useRef(null);
  const positionRef = useRef(position);
  
  // 更新位置引用，确保事件处理程序可以访问最新值
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  
  // 构建Note存储键名
  const buildNoteKey = (number) => {
    return `Note${number}.txt`;
  };
  
  // 加载Note内容
  const loadNoteFile = (number) => {
    if (number < 1 || number > 10) {
      setStatusMessage('笔记编号必须在1-10之间');
      return;
    }
    
    const storageKey = buildNoteKey(number);
    setCurrentFilePath(storageKey);
    
    try {
      // 从localStorage加载内容
      const content = localStorage.getItem(storageKey) || '';
      setTextContent(content);
      setStatusMessage(`已加载 Note${number}`);
      setIsModified(false);
    } catch (err) {
      console.error('读取数据失败:', err);
      setStatusMessage(`读取失败: ${err.message}`);
    }
  };
  
  // 保存Note内容
  const saveNoteFile = () => {
    if (!currentFilePath) {
      setStatusMessage('无效的存储键');
      return;
    }
    
    try {
      // 保存到localStorage
      localStorage.setItem(currentFilePath, textContent);
      setStatusMessage(`已保存到 Note${noteNumber}`);
      setIsModified(false);
    } catch (err) {
      console.error('保存数据失败:', err);
      setStatusMessage(`保存失败: ${err.message}`);
    }
  };
  
  // 清空Note内容
  const clearNoteFile = () => {
    setTextContent('');
    setIsModified(true);
    setStatusMessage('内容已清空，点击保存以更新');
  };

  // 监听全局可见性状态变化
  useEffect(() => {
    const handleVisibilityChange = (e) => {
      setIsVisible(e.detail.isVisible);
    };
    
    window.addEventListener('textarea-visibility-change', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('textarea-visibility-change', handleVisibilityChange);
    };
  }, []);

  // 初始加载Note1
  useEffect(() => {
    if (isVisible) {
      loadNoteFile(noteNumber);
    }
  }, [isVisible]);
  
  // 当编号输入状态改变时，聚焦到输入框
  useEffect(() => {
    if (isEditingNumber && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [isEditingNumber]);

  const handleTextChange = (e) => {
    setTextContent(e.target.value);
    setIsModified(true);
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleSave = () => {
    saveNoteFile();
    if (onSave) {
      onSave(textContent);
    }
  };

  const handleNoteInputChange = (e) => {
    // 只允许输入1-10的数字
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 10)) {
      setNoteInputValue(value);
    }
  };
  
  const handleNoteInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmNoteNumber();
    }
  };
  
  const confirmNoteNumber = () => {
    const num = parseInt(noteInputValue);
    if (num >= 1 && num <= 10) {
      setNoteNumber(num);
      loadNoteFile(num);
    } else {
      setNoteInputValue(noteNumber.toString());
      setStatusMessage('笔记编号必须在1-10之间');
    }
    setIsEditingNumber(false);
  };

  const handleClose = () => {
    TextareaState.toggleVisibility(); // 使用全局状态控制
    if (externalOnClose) {
      externalOnClose();
    }
  };

  // 防止点击容器导致事件冒泡到背景
  const handleContainerClick = (e) => {
    e.stopPropagation();
  };

  // 拖拽开始处理
  const handleDragStart = (e) => {
    if (e.target.closest('.note-number-display, .note-number-input-field, .daisy-close-btn')) {
      return; // 避免在点击笔记编号或关闭按钮时开始拖拽
    }
    
    setIsDragging(true);
    dragStartRef.current = {
      y: e.clientY,
      top: positionRef.current.top
    };
    
    // 防止拖拽过程中选中文本
    e.preventDefault();
  };
  
  // 拖拽中处理
  const handleDrag = (e) => {
    if (!isDragging || !dragStartRef.current) return;
    
    // 计算垂直方向上的移动距离
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // 计算新的垂直位置 (以百分比表示)
    let newTop = dragStartRef.current.top + deltaY / window.innerHeight * 100;
    
    // 限制垂直移动范围，确保不超出屏幕的80%范围
    // 限制在10%到90%之间（使用应用程序的中间80%范围）
    newTop = Math.max(22, Math.min(80, newTop));
    
    // 更新位置 (只更新top值，保持left不变)
    setPosition({ top: newTop });
    
    // 更新全局状态
    TextareaState.position = { top: newTop };
  };
  
  // 拖拽结束处理
  const handleDragEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };
  
  // 添加全局鼠标事件监听
  useEffect(() => {
    const handleMouseMove = (e) => handleDrag(e);
    const handleMouseUp = () => handleDragEnd();
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isVisible) return null;

  // 自定义样式，用于控制垂直位置
  const overlayStyle = {
    top: `${position.top}%`,
    transform: 'translateY(-50%)'
  };

  return (
    <div className="daisy-textarea-overlay" style={overlayStyle}>
      <div 
        ref={containerRef}
        className="daisy-textarea-container"
        onClick={handleContainerClick}
      >
        <div 
          className={`daisy-textarea-header ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleDragStart}
        >
          <div className="daisy-textarea-title">
            Sticky Note
            {isEditingNumber ? (
              <input
                ref={noteInputRef}
                type="text"
                className="note-number-input-field"
                value={noteInputValue}
                onChange={handleNoteInputChange}
                onKeyDown={handleNoteInputKeyDown}
                onBlur={confirmNoteNumber}
                maxLength={2}
              />
            ) : (
              <span 
                className="note-number-display"
                onClick={() => {
                  setIsEditingNumber(true);
                  setNoteInputValue(noteNumber.toString());
                }}
              >
                {noteNumber}
              </span>
            )}
          </div>
          <button 
            className="daisy-close-btn" 
            onClick={handleClose}
            title="关闭"
          >
            ×
          </button>
        </div>
        
        <div className="daisy-textarea-content">
          <textarea 
            className="daisy-code-editor"
            value={textContent}
            onChange={handleTextChange}
            spellCheck="false"
          />
        </div>
        
        <div className="daisy-textarea-button-container">
          <button 
            className="daisy-btn" 
            onClick={handleSave}
          >
            SAVE
          </button>
          <button 
            className="daisy-btn" 
            onClick={clearNoteFile}
          >
            CLEAR
          </button>
        </div>
        
        <div className="daisy-textarea-footer">
          <div className="daisy-status-bar">
            {statusMessage} {isModified ? '(有未保存的更改)' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

// 导出组件和状态控制对象
export default DaisyTextarea;
export { TextareaState }; 