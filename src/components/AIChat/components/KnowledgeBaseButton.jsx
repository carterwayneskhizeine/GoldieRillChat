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
            d="M13 7L21 7M13 12H21M13 17H21M6 7C6 5.89543 5.10457 5 4 5C2.89543 5 2 5.89543 2 7C2 8.10457 2.89543 9 4 9C5.10457 9 6 8.10457 6 7ZM6 17C6 15.8954 5.10457 15 4 15C2.89543 15 2 15.8954 2 17C2 18.1046 2.89543 19 4 19C5.10457 19 6 18.1046 6 17ZM6 12C6 10.8954 5.10457 10 4 10C2.89543 10 2 10.8954 2 12C2 13.1046 2.89543 14 4 14C5.10457 14 6 13.1046 6 12Z" 
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