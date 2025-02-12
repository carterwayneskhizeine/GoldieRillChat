import React from 'react';

export const Header = ({
  selectedModel,
  setSelectedModel,
  availableModels,
  currentConversation,
  setShowSettings
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

      {/* 右侧设置按钮 */}
      <button 
        className="btn btn-ghost btn-sm btn-circle flex-none"
        onClick={() => setShowSettings(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
}; 