import React, { useState, useEffect } from 'react';

// 独立封装的导航按钮组件
const NavigationControls = ({ webviewRef }) => {
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // 监听导航状态变化
  useEffect(() => {
    const webview = webviewRef.current;
    const updateNavigationState = () => {
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };

    webview?.addEventListener('did-navigate', updateNavigationState);
    return () => webview?.removeEventListener('did-navigate', updateNavigationState);
  }, []);
};

export default NavigationControls; 