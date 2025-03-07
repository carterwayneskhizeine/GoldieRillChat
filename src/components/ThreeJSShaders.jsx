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
  const [isModified, setIsModified] = useState(false);  // 跟踪着色器是否被修改过
  const [presets, setPresets] = useState([]);  // 着色器预设列表
  const [currentPresetId, setCurrentPresetId] = useState('Shaders1');  // 当前预设ID
  const [isImageBackground, setIsImageBackground] = useState(false); // 跟踪是否为图片背景模式
  const originalShadersRef = useRef(null);
  const currentPresetRef = useRef({
    vertex: '',
    fragment: ''
  });
  
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
  
  // 初始化预设列表
  useEffect(() => {
    const initPresets = async () => {
      try {
        setIsLoading(true);
        setStatusMessage('初始化着色器预设...');
        
        // 初始化预设
        if (window.electron && window.electron.shaderPresets) {
          const presetsInfo = await window.electron.shaderPresets.initShaderPresets();
          setPresets(presetsInfo);
          
          // 加载默认预设
          await loadPreset('Shaders1');
          
          // 触发自定义事件通知侧边栏更新预设列表
          window.dispatchEvent(new CustomEvent('shaderPresetsLoaded', { 
            detail: { presets: presetsInfo }
          }));
        } else {
          setStatusMessage('无法初始化着色器预设：Electron API不可用');
          console.error('Electron Shader Presets API not available');
          
          // 回退到原始加载方式
          await loadOriginalShaders();
        }
      } catch (error) {
        console.error('初始化着色器预设失败:', error);
        setStatusMessage(`初始化失败: ${error.message}`);
        
        // 回退到原始加载方式
        await loadOriginalShaders();
      } finally {
        setIsLoading(false);
      }
    };
    
    initPresets();
    
    // 监听预设选择事件
    const handlePresetSelect = (event) => {
      if (event.detail && event.detail.presetId) {
        loadPreset(event.detail.presetId);
      }
    };
    
    window.addEventListener('selectShaderPreset', handlePresetSelect);
    
    return () => {
      window.removeEventListener('selectShaderPreset', handlePresetSelect);
    };
  }, []);
  
  // 原始着色器加载（回退方法）
  const loadOriginalShaders = async () => {
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
        currentPresetRef.current = {
          vertex: originalShaders.vertex,
          fragment: originalShaders.fragment
        };
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
            currentPresetRef.current.vertex = vertexMatch[1];
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
            currentPresetRef.current.fragment = fragmentMatch[1];
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
  
  // 加载指定预设
  const loadPreset = async (presetId) => {
    try {
      if (!window.electron || !window.electron.shaderPresets) {
        throw new Error('Electron Shader Presets API not available');
      }
      
      setIsLoading(true);
      setStatusMessage(`加载预设 ${presetId} 中...`);
      
      const preset = await window.electron.shaderPresets.loadPreset(presetId);
      
      if (preset) {
        setVertexShaderCode(preset.vertex);
        setFragmentShaderCode(preset.fragment);
        setCurrentPresetId(preset.id);
        
        // 更新当前预设引用
        currentPresetRef.current = {
          vertex: preset.vertex,
          fragment: preset.fragment
        };
        
        // 如果是默认预设，也更新原始着色器引用
        if (presetId === 'Shaders1') {
          originalShadersRef.current = {
            vertex: preset.vertex,
            fragment: preset.fragment
          };
          
          // 保存到eventBus
          eventBus.saveOriginalShaders(preset.vertex, preset.fragment);
        }
        
        // 触发预设加载事件
        window.dispatchEvent(new CustomEvent('shaderPresetLoaded', { 
          detail: { presetId, preset }
        }));
        
        setStatusMessage(`预设 ${presetId} 已加载`);
        setHasChanges(false);
        setIsModified(false);
        
        // 检查着色器代码是否为空
        const isEmpty = !preset.vertex.trim() && !preset.fragment.trim();
        
        // 如果着色器不为空，自动应用着色器
        if (!isEmpty) {
          // 使用setTimeout确保状态更新后再应用
          setTimeout(() => {
            // 使用eventBus更新着色器
            eventBus.updateShaders(preset.vertex, preset.fragment);
            setStatusMessage(`预设 ${presetId} 已加载并应用`);
          }, 100);
        } else {
          // 如果着色器为空，通知不显示任何效果
          eventBus.updateShaders('', '');
          setStatusMessage(`预设 ${presetId} 为空，不显示效果`);
        }
      } else {
        throw new Error(`预设 ${presetId} 加载失败`);
      }
    } catch (error) {
      console.error(`加载预设 ${presetId} 失败:`, error);
      setStatusMessage(`加载预设失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 保存当前预设
  const savePreset = async () => {
    try {
      if (!window.electron || !window.electron.shaderPresets) {
        throw new Error('Electron Shader Presets API not available');
      }
      
      setStatusMessage(`保存预设 ${currentPresetId} 中...`);
      
      const result = await window.electron.shaderPresets.savePreset(
        currentPresetId,
        vertexShaderCode,
        fragmentShaderCode
      );
      
      if (result.success) {
        // 更新当前预设引用
        currentPresetRef.current = {
          vertex: vertexShaderCode,
          fragment: fragmentShaderCode
        };
        
        setStatusMessage(`预设 ${currentPresetId} 已保存`);
        setHasChanges(false);
        
        // 如果是默认预设，不更新isModified
        if (currentPresetId !== 'Shaders1') {
          setIsModified(false);
        }
      } else {
        throw new Error(`预设 ${currentPresetId} 保存失败`);
      }
    } catch (error) {
      console.error(`保存预设 ${currentPresetId} 失败:`, error);
      setStatusMessage(`保存预设失败: ${error.message}`);
    }
  };

  // 检查当前代码是否与预设不同
  useEffect(() => {
    if (currentPresetRef.current) {
      const isVertexModified = vertexShaderCode !== currentPresetRef.current.vertex;
      const isFragmentModified = fragmentShaderCode !== currentPresetRef.current.fragment;
      
      setIsModified(isVertexModified || isFragmentModified);
      setHasChanges(isVertexModified || isFragmentModified);
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

  // 检查着色器是否为空的函数
  const isShaderEmpty = () => {
    return !vertexShaderCode.trim() && !fragmentShaderCode.trim();
  };

  // 应用更改
  const applyChanges = () => {
    try {
      setStatusMessage('应用着色器更改...');
      
      // 检查着色器是否为空
      if (isShaderEmpty()) {
        // 如果为空，通知不显示任何效果
        eventBus.updateShaders('', '');
        setStatusMessage('着色器为空，不显示效果');
      } else {
        // 使用eventBus更新着色器
        eventBus.updateShaders(vertexShaderCode, fragmentShaderCode);
        setStatusMessage('着色器更新成功，效果已应用到背景');
      }
      
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
      
      if (currentPresetId === 'Shaders1') {
        // 对于Shaders1，重置为原始代码
        if (originalShadersRef.current) {
          setVertexShaderCode(originalShadersRef.current.vertex);
          setFragmentShaderCode(originalShadersRef.current.fragment);
          
          // 重置应用中的着色器
          eventBus.resetShaders();
          
          // 更新当前预设引用
          currentPresetRef.current = {
            vertex: originalShadersRef.current.vertex,
            fragment: originalShadersRef.current.fragment
          };
          
          setStatusMessage('默认着色器代码已重置');
        } else {
          setStatusMessage('无法重置：未找到原始着色器代码');
        }
      } else {
        // 对于其他预设，重新加载该预设
        await loadPreset(currentPresetId);
        setStatusMessage(`预设 ${currentPresetId} 已重置`);
      }
      
      setHasChanges(false);
      setIsModified(false);
    } catch (error) {
      console.error('重置着色器代码失败:', error);
      setStatusMessage(`重置失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`threejs-shaders-container ${isImageBackground ? 'image-background-mode' : ''}`}>
      <div className="shader-header-container">
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
          disabled={isLoading}
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
        {currentPresetId !== 'Shaders1' && (
          <button 
            className="shader-btn save-btn gold-save-btn" 
            onClick={savePreset}
            disabled={isLoading}
            style={{backgroundColor: 'rgba(255, 215, 0, 0.3)', borderColor: 'rgba(255, 215, 0, 0.4)', color: 'white'}}
          >
            SAVE
          </button>
        )}
      </div>
      
      <div className="shaders-footer">
        <div className="status-bar">
          {statusMessage}
          {hasChanges && ' (有未保存的更改)'}
          {isModified && !hasChanges && ' (已修改，可重置)'}
          <span className="current-preset-id">{currentPresetId}</span>
        </div>
      </div>
    </div>
  );
};

export default ThreeJSShaders; 