/**
 * 知识库选择器组件
 * 用于在聊天界面中选择要使用的知识库
 */
import React, { useState, useEffect } from 'react';
import { useKnowledgeBases } from '../hooks/useKnowledgeBase';
import '../styles/KnowledgeBaseSelector.css';

/**
 * 知识库选择器组件
 * 
 * @param {Array} props.selectedBases 已选择的知识库
 * @param {Function} props.onSelect 选择知识库的回调函数
 * @returns {JSX.Element} 知识库选择器组件
 */
const KnowledgeBaseSelector = ({ selectedBases = [], onSelect }) => {
  // 获取所有知识库
  const { bases, loading, refreshBases } = useKnowledgeBases();
  
  // 本地状态，跟踪选中的知识库ID
  const [selectedIds, setSelectedIds] = useState([]);
  
  // 初始化选中状态
  useEffect(() => {
    if (selectedBases && selectedBases.length > 0) {
      setSelectedIds(selectedBases.map(base => base.id));
    }
  }, [selectedBases]);

  // 组件加载时刷新知识库列表
  useEffect(() => {
    refreshBases();
  }, [refreshBases]);
  
  // 处理知识库选择
  const handleToggleBase = (base) => {
    let newSelectedIds;
    
    if (selectedIds.includes(base.id)) {
      // 如果已选中，则取消选中
      newSelectedIds = selectedIds.filter(id => id !== base.id);
    } else {
      // 如果未选中，则添加选中
      newSelectedIds = [...selectedIds, base.id];
    }
    
    setSelectedIds(newSelectedIds);
    
    // 回调选中的知识库
    const selectedBases = bases.filter(base => newSelectedIds.includes(base.id));
    onSelect(selectedBases);
  };

  // 文档图标 SVG
  const DocumentIcon = () => (
    <svg className="knowledge-base-item-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 18H17V16H7V18ZM7 14H17V12H7V14ZM7 10H17V8H7V10ZM5 22C4.45 22 3.979 21.804 3.587 21.412C3.195 21.02 2.999 20.549 3 20V4C3 3.45 3.196 2.979 3.588 2.587C3.98 2.195 4.451 1.999 5 2H19C19.55 2 20.021 2.196 20.413 2.588C20.805 2.98 21.001 3.451 21 4V20C21 20.55 20.804 21.021 20.412 21.413C20.02 21.805 19.549 22.001 19 22H5Z" fill="currentColor"/>
    </svg>
  );

  // 选中图标 SVG
  const CheckIcon = () => (
    <svg className="knowledge-base-item-selected" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
    </svg>
  );

  // 空状态图标 SVG
  const EmptyIcon = () => (
    <svg className="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6H12L10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V6H9.17L11.17 8H20V18ZM12 14H14V16H16V14H18V12H16V10H14V12H12V14Z" fill="currentColor"/>
    </svg>
  );

  return (
    <div className="knowledge-base-selector">
      {loading ? (
        <div className="knowledge-base-loading">
          <div className="loading-spinner" />
        </div>
      ) : bases.length === 0 ? (
        <div className="knowledge-base-empty">
          <EmptyIcon />
        </div>
      ) : (
        <div className="knowledge-base-list">
          {bases.map(kb => (
            <div
              key={kb.id}
              className={`knowledge-base-item ${selectedIds.includes(kb.id) ? 'selected' : ''}`}
              onClick={() => handleToggleBase(kb)}
            >
              <DocumentIcon />
              <div className="knowledge-base-item-content">
                <div className="knowledge-base-item-name">{kb.name}</div>
                <div className="knowledge-base-item-info">
                </div>
              </div>
              {selectedIds.includes(kb.id) && <CheckIcon />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseSelector; 