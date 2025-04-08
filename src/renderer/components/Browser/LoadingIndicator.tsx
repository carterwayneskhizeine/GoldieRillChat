import React, { useState, useEffect } from 'react';

// 顶部加载进度条
const LoadingIndicator = ({ isLoading }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const webview = webviewRef.current;
    webview?.addEventListener('did-start-loading', () => {
      setProgress(10);
      // 模拟加载进度动画...
    });
    webview?.addEventListener('did-stop-loading', () => setProgress(100));
  }, []);

  return (
    <div className="loading-bar" style={{ width: `${progress}%` }} />
  );
};

export default LoadingIndicator; 