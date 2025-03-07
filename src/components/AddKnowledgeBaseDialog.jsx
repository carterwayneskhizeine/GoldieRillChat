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
  { id: 'Pro/BAAI/bge-m3', name: 'Pro/BAAI/bge-m3', provider: 'SiliconFlow', dimensions: 1024, tokens: 8192 }
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
  const [selectedModelId, setSelectedModelId] = useState('BAAI/bge-m3');
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
      setSelectedModelId('BAAI/bge-m3');
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
    <div className="modal modal-open" style={{backgroundColor: "rgba(0, 0, 0, 0.2)"}}>
      <div className="modal-box max-w-lg" style={{
        backgroundColor: "#0a0a0f", 
        color: "white",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 0 30px rgba(0, 0, 0, 0.8)",
        opacity: 1,
        backdropFilter: "none",
        transform: "scale(1)",
        transition: "transform 0.2s ease",
        position: "relative",
        zIndex: 5
      }}>
        <h3 className="font-bold text-lg text-white">添加知识库</h3>
        <button 
          className="shader-btn btn-sm btn-circle absolute right-2 top-2"
          onClick={onClose}
        >✕</button>
        
        <form onSubmit={handleSubmit} className="py-2">
          {error && (
            <div className="alert alert-error mb-4 text-sm" style={{backgroundColor: "#5a1010", border: "1px solid #6a2020"}}>
              {error}
            </div>
          )}
          
          <div className="form-control w-full mb-2">
            <label className="label py-1">
              <span className="label-text text-white"><span className="text-error">*</span> 知识库名称</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入知识库名称"
              className="input input-bordered w-full h-10"
              style={{backgroundColor: "#14141e", color: "white", border: "1px solid rgba(255, 255, 255, 0.15)"}}
              disabled={loading}
            />
          </div>
          
          <div className="form-control w-full mb-2">
            <label className="label py-1">
              <span className="label-text text-white"><span className="text-error">*</span> 嵌入模型 <span className="text-xs opacity-70">ⓘ</span></span>
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="select select-bordered w-full h-10"
              style={{backgroundColor: "#14141e", color: "white", border: "1px solid rgba(255, 255, 255, 0.15)"}}
              disabled={loading}
            >
              {modelOptions.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
            
            {selectedModel && (
              <div style={{backgroundColor: "#14141e", border: "1px solid rgba(255, 255, 255, 0.05)"}} className="p-3 rounded-md mt-2">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{selectedModel.name}</span>
                  <span className="badge badge-sm" style={{backgroundColor: "#32323c", color: "white"}}>{selectedModel.provider}</span>
                </div>
                <div className="text-sm opacity-70">
                  <div>维度: {selectedModel.dimensions}</div>
                  <div>最大Token: {selectedModel.tokens}</div>
                </div>
                <div className="text-xs opacity-50 mt-1">
                  创建知识库后无法更改嵌入模型
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-action">
            <button 
              type="button"
              className="shader-btn"
              onClick={onClose}
            >
              取消
            </button>
            <button 
              type="submit"
              className="shader-btn gold-save-btn"
              disabled={loading}
            >
              {loading ? 
                <span className="flex items-center gap-2">
                  <span className="loading loading-spinner loading-xs"></span> 创建中...
                </span> : '创建知识库'}
            </button>
          </div>
        </form>
      </div>
      <div 
        className="modal-backdrop" 
        onClick={onClose} 
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.2)", 
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}
      ></div>
    </div>
  );
};

export default AddKnowledgeBaseDialog; 