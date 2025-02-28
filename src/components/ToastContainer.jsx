import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import toastManager from '../utils/toastManager';

/**
 * 全局Toast容器组件，用于显示各种提示信息
 * 会自动监听toastManager的事件并显示提示
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  
  useEffect(() => {
    // 订阅toastManager发出的消息
    const unsubscribe = toastManager.subscribe(newToast => {
      // 为每个Toast生成一个唯一ID
      const id = Date.now().toString();
      
      // 添加新的Toast到状态
      setToasts(prevToasts => [...prevToasts, { ...newToast, id }]);
      
      // 设置自动移除计时器
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    });
    
    // 清理订阅
    return () => unsubscribe();
  }, []);
  
  // 移除指定ID的Toast
  const removeToast = (id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };
  
  // 渲染所有活跃的Toast
  return (
    <div className="fixed top-0 left-0 right-0 flex flex-col items-center pointer-events-none z-[9999]">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          visible={true}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration}
        />
      ))}
    </div>
  );
}

export default ToastContainer; 