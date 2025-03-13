import React, { useState, useEffect, useRef } from 'react';
import '../styles/daisytextarea.css';

// 创建一个全局状态管理对象，并扩展它以支持多界面位置跟踪
const TextareaState = {
  isVisible: false,
  position: { top: 50, left: 5 }, // 初始位置：垂直居中，左侧5px
  size: { width: 200, height: 300 }, // 初始尺寸
  // 共享位置的界面
  sharedPositionTools: ['aichat', 'chat', 'threejs-shaders', 'monaco', 'embedding'],
  // 当前活动工具
  currentTool: localStorage.getItem('active_tool') || 'aichat',
  // 切换可见性
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

// 监听工具切换事件
window.addEventListener('tool-changed', (e) => {
  if (e.detail && e.detail.tool) {
    TextareaState.currentTool = e.detail.tool;
    
    // 如果切换到Browser，则重置位置和尺寸到默认值
    if (TextareaState.currentTool === 'browser') {
      TextareaState.position = { top: 50, left: 5 };
      TextareaState.size = { width: 200, height: 300 };
      // 通知组件更新位置和尺寸
      window.dispatchEvent(new CustomEvent('textarea-position-change', {
        detail: { 
          position: TextareaState.position,
          size: TextareaState.size
        }
      }));
    }
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
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(TextareaState.position);
  const [size, setSize] = useState(TextareaState.size);
  const noteInputRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartRef = useRef(null);
  const resizeStartRef = useRef(null);
  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  
  // 更新位置和尺寸引用，确保事件处理程序可以访问最新值
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  
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
  
  // 监听全局位置状态变化
  useEffect(() => {
    const handlePositionChange = (e) => {
      if (e.detail && e.detail.position) {
        setPosition(e.detail.position);
      }
      if (e.detail && e.detail.size) {
        setSize(e.detail.size);
      }
    };
    
    window.addEventListener('textarea-position-change', handlePositionChange);
    
    return () => {
      window.removeEventListener('textarea-position-change', handlePositionChange);
    };
  }, []);

  // 监听工具切换
  useEffect(() => {
    const handleToolChange = (e) => {
      if (e.detail && e.detail.tool) {
        const newTool = e.detail.tool;
        
        // 如果切换到Browser，重置位置和尺寸
        if (newTool === 'browser') {
          setPosition({ top: 50, left: 5 });
          setSize({ width: 200, height: 300 });
        }
      }
    };
    
    window.addEventListener('tool-changed', handleToolChange);
    
    return () => {
      window.removeEventListener('tool-changed', handleToolChange);
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
      x: e.clientX, // 记录初始水平位置
      y: e.clientY,
      left: positionRef.current.left || 5, // 如果没有left值，默认为5px
      top: positionRef.current.top
    };
    
    // 防止拖拽过程中选中文本
    e.preventDefault();
  };
  
  // 拖拽中处理
  const handleDrag = (e) => {
    if (!isDragging || !dragStartRef.current) return;
    
    // 计算水平和垂直方向上的移动距离
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // 垂直方向使用百分比
    let newTop = dragStartRef.current.top + deltaY / window.innerHeight * 100;
    // 限制垂直移动范围在20%到80%之间
    newTop = Math.max(22, Math.min(81, newTop));
    
    // 水平方向使用像素
    let newLeft = dragStartRef.current.left;
    
    // 只有在非Browser界面中才允许左右移动
    if (TextareaState.currentTool !== 'browser') {
      newLeft = dragStartRef.current.left + deltaX;
      
      // 限制水平移动范围
      const minLeftPixels = Math.round(window.innerWidth * 0.00); // 屏幕宽度的7%
      const maxLeftPixels = Math.round(window.innerWidth * 1.00); // 屏幕宽度的93%
      newLeft = Math.max(minLeftPixels, Math.min(maxLeftPixels - 200, newLeft)); // 减去组件宽度200px
    }
    
    // 更新位置，包括水平和垂直位置
    setPosition({ top: newTop, left: newLeft });
    
    // 更新全局状态
    TextareaState.position = { top: newTop, left: newLeft };
    
    // 在共享位置的工具间同步位置
    if (TextareaState.sharedPositionTools.includes(TextareaState.currentTool)) {
      // 可以触发自定义事件，通知其他组件实例更新位置
      window.dispatchEvent(new CustomEvent('textarea-position-change', {
        detail: { position: { top: newTop, left: newLeft } }
      }));
    }
  };
  
  // 拖拽结束处理
  const handleDragEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };
  
  // 缩放开始处理
  const handleResizeStart = (e) => {
    // 在Browser界面不允许缩放
    if (TextareaState.currentTool === 'browser') {
      return;
    }
    
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: sizeRef.current.width,
      height: sizeRef.current.height
    };
    
    // 防止拖拽过程中选中文本
    e.preventDefault();
    e.stopPropagation();
  };
  
  // 缩放中处理
  const handleResize = (e) => {
    if (!isResizing || !resizeStartRef.current) return;
    
    // 计算宽度和高度的变化量
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    // 计算新的宽度和高度
    let newWidth = resizeStartRef.current.width + deltaX;
    let newHeight = resizeStartRef.current.height + deltaY;
    
    // 限制最小尺寸
    newWidth = Math.max(150, newWidth);
    newHeight = Math.max(200, newHeight);
    
    // 限制最大尺寸
    newWidth = Math.min(500, newWidth);
    newHeight = Math.min(600, newHeight);
    
    // 更新尺寸
    setSize({ width: newWidth, height: newHeight });
    
    // 更新全局状态
    TextareaState.size = { width: newWidth, height: newHeight };
    
    // 在共享位置的工具间同步尺寸
    if (TextareaState.sharedPositionTools.includes(TextareaState.currentTool)) {
      window.dispatchEvent(new CustomEvent('textarea-position-change', {
        detail: { 
          position: TextareaState.position,
          size: { width: newWidth, height: newHeight }
        }
      }));
    }
  };
  
  // 缩放结束处理
  const handleResizeEnd = () => {
    setIsResizing(false);
    resizeStartRef.current = null;
  };
  
  // 添加全局鼠标事件监听
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        handleDrag(e);
      } else if (isResizing) {
        handleResize(e);
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      } else if (isResizing) {
        handleResizeEnd();
      }
    };
    
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  if (!isVisible) return null;

  // 自定义样式，用于控制位置和尺寸
  const overlayStyle = {
    top: `${position.top}%`,
    left: `${position.left}px`,
    transform: 'translateY(-50%)'
  };
  
  // 容器样式，用于控制尺寸
  const containerStyle = {
    width: `${size.width}px`,
    height: `${size.height}px`
  };
  
  // 是否在Browser界面
  const isInBrowser = TextareaState.currentTool === 'browser';

  return (
    <div className="daisy-textarea-overlay" style={overlayStyle}>
      <div 
        ref={containerRef}
        className="daisy-textarea-container"
        onClick={handleContainerClick}
        style={containerStyle}
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
            ✕
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
            S A V E
          </button>
          <button 
            className="daisy-btn" 
            onClick={clearNoteFile}
          >
            C L E A R
          </button>
        </div>
        
        <div className="daisy-textarea-footer">
          <div className="daisy-status-bar">
            {statusMessage} {isModified ? '(有未保存的更改)' : ''}
          </div>
        </div>
        
        {/* 缩放手柄，仅在非Browser界面显示 */}
        {!isInBrowser && (
          <div 
            className={`daisy-textarea-resize-handle ${isResizing ? 'resizing' : ''}`}
            onMouseDown={handleResizeStart}
          ></div>
        )}
      </div>
    </div>
  );
};

// 导出组件和状态控制对象
export default DaisyTextarea;
export { TextareaState }; 