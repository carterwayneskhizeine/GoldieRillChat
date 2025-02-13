import React from 'react';

export const Header = ({
  selectedModel,
  setSelectedModel,
  availableModels,
  currentConversation,
  setShowSettings,
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature
}) => {
  return (
    <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-100">
      {/* 左侧模型选择 */}
      <div className="flex-none">
        <select 
          className="select select-bordered select-xs w-[300px]"
          value={selectedModel}
          onChange={(e) => {
            setSelectedModel(e.target.value);
            localStorage.setItem('aichat_model', e.target.value);
          }}
        >
          {availableModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      {/* 中间对话名称 */}
      <h2 className="text-xs opacity-70 flex-1 text-center">
        {currentConversation?.name || '当前会话'}
      </h2>

      {/* 右侧设置区域 */}
      <div className="flex items-center gap-4">
        {/* Max Tokens 滑块 */}
        <div className="flex flex-col items-center">
          <span className="text-xs opacity-70">Max Tokens: {maxTokens === 999999 ? '∞' : maxTokens}</span>
          <div className="flex items-center gap-1">
            <input
              type="range"
              min="1000"
              max="8000"
              step="100"
              value={maxTokens > 8000 ? 8000 : maxTokens}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setMaxTokens(value);
                localStorage.setItem('aichat_max_tokens', value.toString());
              }}
              className="range range-xs range-primary w-[100px]"
            />
            <button
              className="btn btn-xs btn-ghost btn-circle"
              onClick={() => {
                const value = maxTokens === 999999 ? 2000 : 999999;
                setMaxTokens(value);
                localStorage.setItem('aichat_max_tokens', value.toString());
              }}
              title={maxTokens === 999999 ? "点击设置为默认值" : "点击设置为无限制"}
            >
              {maxTokens === 999999 ? "↺" : "∞"}
            </button>
          </div>
        </div>

        {/* Temperature 滑块 */}
        <div className="flex flex-col items-center">
          <span className="text-xs opacity-70">Temperature: {temperature.toFixed(2)}</span>
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
          />
        </div>
      </div>
    </div>
  );
}; 