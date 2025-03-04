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
  
  // 渲染知识库列表
  const renderBases = () => {
    if (loading) {
      return <div className="knowledge-base-loading">加载知识库...</div>;
    }
    
    if (!bases || bases.length === 0) {
      return <div className="knowledge-base-empty">暂无知识库，请前往知识库页面创建</div>;
    }
    
    return (
      <div className="knowledge-base-list">
        {bases.map(base => (
          <div 
            key={base.id}
            className={`knowledge-base-item ${selectedIds.includes(base.id) ? 'selected' : ''}`}
            onClick={() => handleToggleBase(base)}
          >
            <div className="knowledge-base-item-name">{base.name}</div>
            <div className="knowledge-base-item-info">
              <span className="knowledge-base-item-count">{base.documentCount || 0} 文档</span>
              <span className="knowledge-base-item-model">{base.model.name}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="knowledge-base-selector">
      <div className="knowledge-base-selector-header">
        <h3>选择知识库</h3>
        <small className="knowledge-base-selector-tip">前往Embedding页面添加管理知识库</small>
      </div>
      
      {renderBases()}
    </div>
  );
};

export default KnowledgeBaseSelector; 