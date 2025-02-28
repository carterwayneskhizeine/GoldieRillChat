import React, { useEffect } from 'react';

/**
 * Toast组件 - 用于显示临时消息提示
 * @param {Object} props - 组件属性
 * @param {string} props.message - 消息内容
 * @param {string} props.type - 消息类型，可以是 'success', 'error', 'info', 'warning'
 * @param {boolean} props.visible - 是否可见
 * @param {Function} props.onClose - 关闭时的回调函数
 * @param {number} props.duration - 显示持续时间，单位为毫秒，默认为3000ms
 * @returns {JSX.Element}
 */
export function Toast({ message, type = 'info', visible, onClose, duration = 3000 }) {
  // 自动关闭计时器
  useEffect(() => {
    if (visible && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, onClose, duration]);

  if (!visible) return null;

  // 根据type选择样式
  const alertClass = {
    'success': 'alert-success',
    'error': 'alert-error',
    'warning': 'alert-warning',
    'info': 'alert-info'
  }[type] || 'alert-info';

  // 根据type选择图标
  const icons = {
    'success': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'error': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'warning': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    'info': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }[type] || null;

  return (
    <div className="toast toast-top toast-center pointer-events-auto my-2">
      <div className={`alert ${alertClass} shadow-lg shadow-base-300 opacity-100 border border-base-300`}>
        {icons}
        <div className="font-medium">{message}</div>
      </div>
    </div>
  );
}

export default Toast; 