// 创建一个简单的事件系统来管理Toast消息
const toastManager = {
  listeners: [],
  
  /**
   * 显示一个成功提示
   * @param {string} message - 成功消息
   * @param {number} duration - 持续时间，默认3000ms
   */
  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  },
  
  /**
   * 显示一个错误提示
   * @param {string} message - 错误消息
   * @param {number} duration - 持续时间，默认4000ms
   */
  error(message, duration = 4000) {
    this.show(message, 'error', duration);
  },
  
  /**
   * 显示一个警告提示
   * @param {string} message - 警告消息
   * @param {number} duration - 持续时间，默认3500ms
   */
  warning(message, duration = 3500) {
    this.show(message, 'warning', duration);
  },
  
  /**
   * 显示一个信息提示
   * @param {string} message - 信息消息
   * @param {number} duration - 持续时间，默认3000ms
   */
  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  },
  
  /**
   * 显示提示
   * @param {string|Object} message - 消息内容或消息对象
   * @param {string} type - 消息类型
   * @param {number} duration - 持续时间
   */
  show(message, type = 'info', duration = 3000) {
    // 如果message是对象
    if (typeof message === 'object' && message !== null) {
      // 如果是消息对象，直接使用对象中的属性
      this.notify({
        message: message.message || '',
        type: message.type || type,
        duration: message.duration || duration,
        title: message.title || ''
      });
    } else {
      // 如果是字符串，使用传入的参数
      this.notify({
        message,
        type,
        duration
      });
    }
  },
  
  /**
   * 通知所有监听器
   * @param {Object} toast - Toast信息
   */
  notify(toast) {
    this.listeners.forEach(listener => listener(toast));
  },
  
  /**
   * 添加监听器
   * @param {Function} listener - 监听函数
   * @returns {Function} 用于移除监听器的函数
   */
  subscribe(listener) {
    this.listeners.push(listener);
    
    // 返回用于解绑的函数
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
};

export default toastManager; 