import React, { useState, useEffect, useRef } from 'react';
import '../styles/threejsshaders.css';

const ThreeJSShaders = () => {
  const [vertexShaderCode, setVertexShaderCode] = useState('');
  const [fragmentShaderCode, setFragmentShaderCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('fragment'); // 'vertex' or 'fragment'
  
  // 从utils/shaders.js加载着色器代码
  useEffect(() => {
    const loadShaderCode = async () => {
      try {
        setIsLoading(true);
        
        // 使用electron API读取文件
        if (window.electron) {
          const shaderFilePath = window.electron.path.join(
            window.electron.app.getAppPath(),
            'src/components/ThreeBackground/utils/shaders.js'
          );
          
          const fileContent = await window.electron.readFile(shaderFilePath);
          
          // 解析顶点着色器和片段着色器
          const vertexMatch = fileContent.match(/export const vertexShader = `([\s\S]*?)`;/);
          const fragmentMatch = fileContent.match(/export const fragmentShader = `([\s\S]*?)`;/);
          
          if (vertexMatch && vertexMatch[1]) {
            setVertexShaderCode(vertexMatch[1]);
          }
          
          if (fragmentMatch && fragmentMatch[1]) {
            setFragmentShaderCode(fragmentMatch[1]);
          }
        } else {
          console.error('Electron API not available');
        }
      } catch (error) {
        console.error('加载着色器代码失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadShaderCode();
  }, []);

  // 处理着色器代码更改
  const handleShaderCodeChange = (e) => {
    if (activeTab === 'vertex') {
      setVertexShaderCode(e.target.value);
    } else {
      setFragmentShaderCode(e.target.value);
    }
  };

  // 应用更改
  const applyChanges = () => {
    // 这里将实现应用更改的逻辑
    console.log('应用着色器更改');
  };

  // 重置代码
  const resetCode = async () => {
    // 重新加载原始代码
    setIsLoading(true);
    try {
      // 实现重置逻辑
      console.log('重置着色器代码');
    } catch (error) {
      console.error('重置着色器代码失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="threejs-shaders-container">
      <div className="shaders-header">
        <h2>ThreeJS 着色器编辑器</h2>
        <div className="shaders-toolbar">
          <button className="btn btn-primary" onClick={applyChanges}>应用更改</button>
          <button className="btn btn-secondary" onClick={resetCode}>重置</button>
        </div>
      </div>
      
      <div className="shader-tabs">
        <button 
          className={`shader-tab ${activeTab === 'vertex' ? 'active' : ''}`}
          onClick={() => setActiveTab('vertex')}
        >
          顶点着色器
        </button>
        <button 
          className={`shader-tab ${activeTab === 'fragment' ? 'active' : ''}`}
          onClick={() => setActiveTab('fragment')}
        >
          片段着色器
        </button>
      </div>
      
      <div className="shaders-content">
        <div className="shaders-editor">
          {isLoading ? (
            <div className="loading-spinner">加载中...</div>
          ) : (
            <textarea 
              className="shader-code-editor"
              value={activeTab === 'vertex' ? vertexShaderCode : fragmentShaderCode}
              onChange={handleShaderCodeChange}
              spellCheck="false"
            />
          )}
        </div>
        
        <div className="shaders-preview">
          <div className="preview-header">预览</div>
          <div className="preview-canvas-container">
            <canvas className="preview-canvas" />
            <div className="preview-info">
              <p>着色器预览功能正在开发中...</p>
              <p>修改着色器代码后点击"应用更改"按钮将更新应用背景</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="shaders-footer">
        <div className="status-bar">
          {isLoading ? '加载中...' : '准备就绪'}
        </div>
      </div>
    </div>
  );
};

export default ThreeJSShaders; 