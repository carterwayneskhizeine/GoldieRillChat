import React, { useState, useEffect, useRef } from 'react';
import '../styles/threejsshaders.css';
import eventBus from './ThreeBackground/utils/eventBus';

const ThreeJSShaders = () => {
  const [vertexShaderCode, setVertexShaderCode] = useState('');
  const [fragmentShaderCode, setFragmentShaderCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('fragment'); // 'vertex' or 'fragment'
  const [statusMessage, setStatusMessage] = useState('准备就绪');
  const [hasChanges, setHasChanges] = useState(false);
  const [isModified, setIsModified] = useState(false);  // 新增状态，跟踪着色器是否被修改过
  const [isImageBackground, setIsImageBackground] = useState(false); // 新增状态，跟踪是否为图片背景模式
  const originalShadersRef = useRef(null);
  
  // 初始化时检查是否为图片背景模式
  useEffect(() => {
    // 检查是否有图片背景标志
    const checkImageBackgroundMode = () => {
      // 从 window 对象检查
      if (window.isImageBackgroundMode !== undefined) {
        setIsImageBackground(window.isImageBackgroundMode);
      }
    };
    
    // 立即检查一次
    checkImageBackgroundMode();
    
    // 监听背景模式变化的事件
    const handleBackgroundModeChange = (event) => {
      if (event.detail && event.detail.isImageBackground !== undefined) {
        setIsImageBackground(event.detail.isImageBackground);
      }
    };
    
    window.addEventListener('backgroundModeChange', handleBackgroundModeChange);
    
    return () => {
      window.removeEventListener('backgroundModeChange', handleBackgroundModeChange);
    };
  }, []);

  // 从utils/shaders.js加载着色器代码
  useEffect(() => {
    const loadShaderCode = async () => {
      try {
        setIsLoading(true);
        setStatusMessage('加载着色器代码中...');
        
        // 获取原始着色器代码
        const originalShaders = eventBus.getOriginalShaders();
        
        if (originalShaders) {
          // 如果eventBus中已经有原始着色器代码，直接使用
          setVertexShaderCode(originalShaders.vertex);
          setFragmentShaderCode(originalShaders.fragment);
          originalShadersRef.current = originalShaders;
          setStatusMessage('着色器代码已加载');
        } else {
          // 否则从文件加载
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
              if (originalShadersRef.current) {
                originalShadersRef.current.vertex = vertexMatch[1];
              } else {
                originalShadersRef.current = { vertex: vertexMatch[1] };
              }
            }
            
            if (fragmentMatch && fragmentMatch[1]) {
              setFragmentShaderCode(fragmentMatch[1]);
              if (originalShadersRef.current) {
                originalShadersRef.current.fragment = fragmentMatch[1];
              } else {
                originalShadersRef.current = { 
                  ...(originalShadersRef.current || {}),
                  fragment: fragmentMatch[1] 
                };
              }
            }
            
            setStatusMessage('着色器代码已从文件加载');
          } else {
            setStatusMessage('无法加载着色器代码：Electron API不可用');
            console.error('Electron API not available');
          }
        }
      } catch (error) {
        console.error('加载着色器代码失败:', error);
        setStatusMessage(`加载失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadShaderCode();
  }, []);

  // 检查当前代码是否与原始代码不同
  useEffect(() => {
    if (originalShadersRef.current) {
      const isVertexModified = vertexShaderCode !== originalShadersRef.current.vertex;
      const isFragmentModified = fragmentShaderCode !== originalShadersRef.current.fragment;
      setIsModified(isVertexModified || isFragmentModified);
    }
  }, [vertexShaderCode, fragmentShaderCode]);

  // 处理着色器代码更改
  const handleShaderCodeChange = (e) => {
    if (activeTab === 'vertex') {
      setVertexShaderCode(e.target.value);
    } else {
      setFragmentShaderCode(e.target.value);
    }
    setHasChanges(true);
  };

  // 应用更改
  const applyChanges = () => {
    try {
      setStatusMessage('应用着色器更改...');
      
      // 使用eventBus更新着色器
      eventBus.updateShaders(vertexShaderCode, fragmentShaderCode);
      
      setStatusMessage('着色器更新成功，效果已应用到背景');
      setHasChanges(false);
    } catch (error) {
      console.error('应用着色器更改失败:', error);
      setStatusMessage(`更新失败: ${error.message}`);
    }
  };

  // 重置代码
  const resetCode = async () => {
    try {
      setIsLoading(true);
      setStatusMessage('重置着色器代码...');
      
      // 使用保存的原始着色器代码
      if (originalShadersRef.current) {
        setVertexShaderCode(originalShadersRef.current.vertex);
        setFragmentShaderCode(originalShadersRef.current.fragment);
        
        // 重置应用中的着色器
        eventBus.resetShaders();
        
        setStatusMessage('着色器代码已重置');
        setHasChanges(false);
      } else {
        setStatusMessage('无法重置：未找到原始着色器代码');
      }
    } catch (error) {
      console.error('重置着色器代码失败:', error);
      setStatusMessage(`重置失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`threejs-shaders-container ${isImageBackground ? 'image-background-mode' : ''}`}>
      <div className="shader-tabs">
        <button 
          className={`shader-tab ${activeTab === 'vertex' ? 'active' : ''}`}
          onClick={() => setActiveTab('vertex')}
        >
          vertexShader
        </button>
        <button 
          className={`shader-tab ${activeTab === 'fragment' ? 'active' : ''}`}
          onClick={() => setActiveTab('fragment')}
        >
          fragmentShader
        </button>
      </div>
      
      <div className="shaders-content">
        <div className="shaders-editor full-width">
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
      </div>
      
      <div className="shaders-button-container">
        <button 
          className="shader-btn" 
          onClick={applyChanges}
          disabled={isLoading || !hasChanges}
        >
          APPLY
        </button>
        <button 
          className="shader-btn" 
          onClick={resetCode}
          disabled={isLoading || !isModified}
        >
          RESET
        </button>
      </div>
      
      <div className="shaders-footer">
        <div className="status-bar">
          {statusMessage}
          {hasChanges && ' (有未保存的更改)'}
          {isModified && !hasChanges && ' (已修改，可重置)'}
        </div>
      </div>
    </div>
  );
};

export default ThreeJSShaders; 