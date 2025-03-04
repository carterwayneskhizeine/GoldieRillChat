/**
 * 知识库按钮组件
 * 用于在聊天输入区域显示知识库选择按钮
 */
import React, { useState, useRef, useEffect } from 'react';
import KnowledgeBaseSelector from '../../../components/KnowledgeBaseSelector';
import '../../../styles/KnowledgeBaseButton.css';

/**
 * 知识库按钮组件
 * @param {Object} props 组件属性
 * @param {Array} props.selectedBases 已选择的知识库
 * @param {Function} props.onSelect 选择知识库的回调函数
 * @param {boolean} props.disabled 是否禁用按钮
 * @returns {JSX.Element} 知识库按钮组件
 */
const KnowledgeBaseButton = ({ selectedBases = [], onSelect, disabled = false }) => {
  // 本地状态控制弹出层的显示/隐藏
  const [isOpen, setIsOpen] = useState(false);
  
  // 引用弹出层和按钮元素，用于点击外部区域关闭弹出层
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  
  // 切换知识库选择器的显示状态
  const toggleSelector = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  // 处理点击外部区域关闭弹出层
  const handleClickOutside = (event) => {
    if (
      popoverRef.current && 
      !popoverRef.current.contains(event.target) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target)
    ) {
      setIsOpen(false);
    }
  };
  
  // 当弹出层打开时，添加点击外部区域的事件监听
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    // 组件卸载时清理事件监听
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // 处理知识库选择，将选中的知识库传递给父组件
  const handleSelect = (bases) => {
    onSelect(bases);
  };
  
  // 知识库图标样式，当有选中知识库时显示主题色
  const iconStyle = {
    color: selectedBases && selectedBases.length > 0 ? 'var(--primary-color, #2a85ff)' : 'var(--text-secondary, #666)'
  };
  
  return (
    <div className="knowledge-base-button-container">
      {/* 知识库按钮 */}
      <button
        ref={buttonRef}
        className={`knowledge-base-button ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={toggleSelector}
        disabled={disabled}
        title={disabled ? '当前不可用' : '选择知识库'}
      >
        {/* 知识库图标 */}
        <svg 
          className="knowledge-base-icon" 
          style={iconStyle} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
        
        {/* 选中知识库数量标记 */}
        {selectedBases && selectedBases.length > 0 && (
          <span className="knowledge-base-count">
            {selectedBases.length}
          </span>
        )}
      </button>
      
      {/* 知识库选择器弹出层 */}
      {isOpen && (
        <div className="knowledge-base-popover" ref={popoverRef}>
          <KnowledgeBaseSelector
            selectedBases={selectedBases}
            onSelect={handleSelect}
          />
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseButton; 