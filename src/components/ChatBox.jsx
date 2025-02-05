import React from 'react';

export const ChatBox = () => {
  return (
    <div className="chatbox-container">
      <div className="chatbox-header">
        <h1 className="text-2xl font-bold">ChatBox</h1>
      </div>
      <div className="chatbox-content">
        <p className="text-base-content opacity-70">
          功能开发中...
        </p>
      </div>
      <div className="chatbox-footer">
        {/* 这里可以添加输入框等控件 */}
      </div>
    </div>
  );
}; 