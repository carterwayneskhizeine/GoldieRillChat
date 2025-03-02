import React, { useState, useEffect } from 'react';

export const Header = ({
  selectedModel,
  setSelectedModel,
  availableModels,
  currentConversation,
  setShowSettings,
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature,
  systemPromptEnabled
}) => {
  const [isImageBackground, setIsImageBackground] = useState(false);

  // 初始化时检查是否为图片背景模式
  useEffect(() => {
    // 检查是否有图片背景标志
    const checkImageBackgroundMode = () => {
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

  return (
    <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-100" 
         style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}>
      {/* 左侧模型选择 */}
      <div className="flex-none" 
           style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}>
        <select 
          className="select select-bordered select-xs w-[300px]"
          value={selectedModel}
          onChange={(e) => {
            setSelectedModel(e.target.value);
            localStorage.setItem('aichat_model', e.target.value);
          }}
          style={isImageBackground ? { 
            position: 'relative', 
            zIndex: 10, 
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)'
          } : {}}
        >
          {(availableModels || []).map(model => (
            <option 
              key={model} 
              value={model} 
              style={isImageBackground ? { backgroundColor: 'rgba(0, 0, 0, 0.9)', color: 'white' } : {}}
            >
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* 中间对话名称 */}
      <div className="flex items-center gap-2" 
           style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}>
        <h2 className="text-xs opacity-70" 
            style={isImageBackground ? { 
              textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: '2px 6px',
              borderRadius: '4px'
            } : {}}>
          {currentConversation?.name || '当前会话'}
        </h2>
      </div>

      {/* 右侧设置区域 */}
      <div className="flex flex-col gap-2" 
           style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}>
        {/* 标签和数值行 */}
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs opacity-70" 
                  style={isImageBackground ? { 
                    color: 'white', 
                    textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '1px 4px',
                    borderRadius: '2px'
                  } : {}}>Max Tokens:</span>
            <span className="text-xs opacity-70 min-w-[40px]" 
                  style={isImageBackground ? { 
                    color: 'white', 
                    textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '1px 4px',
                    borderRadius: '2px'
                  } : {}}>{maxTokens === 999999 ? '∞' : maxTokens}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs opacity-70" 
                  style={isImageBackground ? { 
                    color: 'white', 
                    textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '1px 4px',
                    borderRadius: '2px'
                  } : {}}>Temperature:</span>
            <span className="text-xs opacity-70 min-w-[30px]" 
                  style={isImageBackground ? { 
                    color: 'white', 
                    textShadow: '0px 0px 3px rgba(0, 0, 0, 0.8)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    padding: '1px 4px',
                    borderRadius: '2px'
                  } : {}}>{temperature.toFixed(1)}</span>
          </div>
        </div>

        {/* 滑动条行 */}
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <input
              type="range"
              min="1024"
              max="8192"
              step="128"
              value={maxTokens > 8192 ? 8192 : maxTokens}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setMaxTokens(value);
                localStorage.setItem('aichat_max_tokens', value.toString());
              }}
              className="range range-xs range-primary w-[100px]"
              style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}
            />
            <button
              className="btn btn-xs btn-ghost btn-circle"
              onClick={() => {
                const value = maxTokens === 999999 ? 2000 : 999999;
                setMaxTokens(value);
                localStorage.setItem('aichat_max_tokens', value.toString());
              }}
              title={maxTokens === 999999 ? "点击设置为默认值" : "点击设置为无限制"}
              style={isImageBackground ? { 
                position: 'relative', 
                zIndex: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              } : {}}
            >
              {maxTokens === 999999 ? "↺" : "∞"}
            </button>
          </div>
          <div className="flex items-center">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => {
                setTemperature(parseFloat(e.target.value));
                localStorage.setItem('aichat_temperature', e.target.value);
              }}
              className="range range-xs range-primary w-[100px]"
              style={isImageBackground ? { position: 'relative', zIndex: 10 } : {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 