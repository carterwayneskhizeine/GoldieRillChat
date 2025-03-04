/**
 * 添加知识库对话框组件
 * 用于创建新的知识库
 */
import React, { useState, useEffect, useRef } from 'react';
import { useKnowledgeBases } from '../hooks/useKnowledgeBase';
import '../styles/AddKnowledgeBaseDialog.css';

// 嵌入模型选项
const modelOptions = [
  { id: 'BAAI/bge-m3', name: 'BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 },
  { id: 'netease-youdao/bce-embedding-base_v1', name: 'netease-youdao/bce-embedding-base_v1', provider: 'SiliconFlow', dimensions: 768, tokens: 512 },
  { id: 'BAAI/bge-large-zh-v1.5', name: 'BAAI/bge-large-zh-v1.5', provider: 'SiliconFlow', dimensions: 1024, tokens: 512 },
  { id: 'BAAI/bge-large-en-v1.5', name: 'BAAI/bge-large-en-v1.5', provider: 'SiliconFlow', dimensions: 1024, tokens: 512 },
  { id: 'Pro/BAAI/bge-m3', name: 'Pro/BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 },
  { id: 'text-embedding-3-small', name: 'text-embedding-3-small', provider: 'OpenAI', dimensions: 1536, tokens: 8191 },
  { id: 'text-embedding-3-large', name: 'text-embedding-3-large', provider: 'OpenAI', dimensions: 3072, tokens: 8191 },
  { id: 'text-embedding-ada-002', name: 'text-embedding-ada-002', provider: 'OpenAI', dimensions: 1536, tokens: 8191 }
];

/**
 * 添加知识库对话框组件
 * 
 * @param {boolean} props.isOpen 是否打开对话框
 * @param {Function} props.onClose 关闭对话框的回调函数
 * @param {Function} props.onAdd 添加知识库的回调函数
 * @returns {JSX.Element} 添加知识库对话框组件
 */
const AddKnowledgeBaseDialog = ({ isOpen, onClose, onAdd }) => {
  // 获取知识库钩子
  const { addBase } = useKnowledgeBases();
  
  // 本地状态
  const [name, setName] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('BAAI/bge-large-zh-v1.5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 输入框引用
  const nameInputRef = useRef(null);
  
  // 选择的模型信息
  const selectedModel = modelOptions.find(model => model.id === selectedModelId);
  
  // 当对话框打开时，重置表单并聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedModelId('BAAI/bge-large-zh-v1.5');
      setError('');
      
      // 聚焦输入框
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);
  
  // 处理提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 验证输入
    if (!name.trim()) {
      setError('请输入知识库名称');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // 创建知识库
      const newBase = await addBase(name, selectedModelId);
      
      // 回调添加的知识库
      if (onAdd) {
        onAdd(newBase);
      }
      
      // 关闭对话框
      onClose();
    } catch (err) {
      console.error('添加知识库失败:', err);
      setError(`添加知识库失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="dialog-overlay">
      <div className="dialog-container">
        <h2>添加知识库</h2>
        <button 
          className="close-button"
          onClick={onClose}
        >
          ✕
        </button>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="knowledge-base-name">知识库名称</label>
            <input
              id="knowledge-base-name"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入知识库名称"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="knowledge-base-model">嵌入模型</label>
            <select
              id="knowledge-base-model"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={loading}
            >
              {modelOptions.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
            
            {selectedModel && (
              <div className="model-info">
                <div>维度: {selectedModel.dimensions}</div>
                <div>最大Token: {selectedModel.tokens}</div>
                <div>提供商: {selectedModel.provider}</div>
              </div>
            )}
          </div>
          
          <div className="dialog-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="submit-button"
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