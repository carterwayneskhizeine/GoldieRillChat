/**
 * 添加知识库对话框组件
 * 用于创建新的知识库
 */
import React, { useState, useEffect, useRef } from 'react';
import { useKnowledgeBases } from '../hooks/useKnowledgeBase';
import '../styles/AddKnowledgeBaseDialog.css';

// 嵌入模型列表
const EMBEDDING_MODELS = [
  {
    id: 'text-embedding-ada-002',
    name: 'text-embedding-ada-002',
    provider: 'openai',
    dimensions: 1536
  },
  {
    id: 'text-embedding-3-small',
    name: 'text-embedding-3-small',
    provider: 'openai',
    dimensions: 1536
  },
  {
    id: 'text-embedding-3-large',
    name: 'text-embedding-3-large',
    provider: 'openai',
    dimensions: 3072
  }
];

/**
 * 添加知识库对话框组件
 * @param {Object} props 组件属性
 * @param {boolean} props.isOpen 是否打开对话框
 * @param {Function} props.onClose 关闭对话框的回调函数
 * @param {Function} props.onAdd 添加知识库的回调函数
 * @returns {JSX.Element} 添加知识库对话框组件
 */
const AddKnowledgeBaseDialog = ({ isOpen, onClose, onAdd }) => {
  // 引用表单元素
  const nameInputRef = useRef(null);
  
  // 本地状态
  const [name, setName] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 获取知识库钩子
  const { addBase } = useKnowledgeBases();
  
  // 当对话框打开时，重置表单状态
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedModelId(EMBEDDING_MODELS[0]?.id || '');
      setError('');
      setLoading(false);
      
      // 聚焦到名称输入框
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 表单验证
    if (!name.trim()) {
      setError('请输入知识库名称');
      return;
    }
    
    if (!selectedModelId) {
      setError('请选择嵌入模型');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // 获取选择的模型
      const selectedModel = EMBEDDING_MODELS.find(model => model.id === selectedModelId);
      
      if (!selectedModel) {
        throw new Error('未找到所选模型');
      }
      
      // 创建知识库
      const newBase = await addBase(name.trim(), selectedModel);
      
      // 回调添加的知识库
      if (onAdd) {
        onAdd(newBase);
      }
      
      // 关闭对话框
      onClose();
    } catch (err) {
      console.error('Failed to add knowledge base:', err);
      setError(`添加知识库失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 如果对话框不是打开状态，则不渲染
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="dialog-overlay">
      <div className="dialog-container">
        <div className="dialog-header">
          <h2>添加知识库</h2>
          <button className="dialog-close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="dialog-content">
            {error && (
              <div className="dialog-error">
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="knowledge-base-name">知识库名称</label>
              <input
                id="knowledge-base-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入知识库名称"
                ref={nameInputRef}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="embedding-model">嵌入模型</label>
              <select
                id="embedding-model"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                required
              >
                {EMBEDDING_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.dimensions}维)
                  </option>
                ))}
              </select>
              <div className="form-help-text">
                嵌入模型用于将文本转换为向量，以便进行相似度搜索。
              </div>
            </div>
          </div>
          
          <div className="dialog-footer">
            <button
              type="button"
              className="dialog-button dialog-button-secondary"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="dialog-button dialog-button-primary"
              disabled={loading}
            >
              {loading ? '创建中...' : '创建知识库'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddKnowledgeBaseDialog; 