import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { openUrl } from './utils/browserUtils'

// 添加全局链接点击拦截器
document.addEventListener('click', (e) => {
  // 查找点击事件中最近的a标签祖先
  let target = e.target;
  while (target && target.tagName !== 'A') {
    target = target.parentElement;
  }

  // 如果点击的是链接，并且链接是http或https开头
  if (target && target.tagName === 'A' && target.href && 
      (target.href.startsWith('http://') || target.href.startsWith('https://'))) {
    
    // 阻止默认行为
    e.preventDefault();
    
    // 使用openUrl函数处理链接
    openUrl(target.href, true, false);
    
    console.log('链接被拦截并处理:', target.href);
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
