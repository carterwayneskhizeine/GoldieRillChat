class EventBus {
  constructor() {
    this.events = {};
    this.lastInputTime = 0;
    this.inputIntensity = 0;
    this.isCustomBackground = false;
    this.currentBackgroundPath = null;
    this.previousTheme = null; // 保存切换前的主题
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  off(eventName, callback) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
  }

  emit(eventName, data) {
    if (!this.events[eventName]) return;
    
    // 更新输入强度
    if (eventName === 'input') {
      const now = performance.now();
      const timeDiff = now - this.lastInputTime;
      
      // 如果输入间隔小于 500ms，增加强度
      if (timeDiff < 500) {
        this.inputIntensity = Math.min(1.0, this.inputIntensity + 0.1);
      } else {
        // 否则逐渐降低强度
        this.inputIntensity = Math.max(0.0, this.inputIntensity - 0.05);
      }
      
      this.lastInputTime = now;
      data = { ...data, intensity: this.inputIntensity };
    }

    this.events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });
  }

  // 获取当前输入强度
  getInputIntensity() {
    // 随时间自然衰减
    const now = performance.now();
    const timeDiff = now - this.lastInputTime;
    if (timeDiff > 100) {
      this.inputIntensity = Math.max(0.0, this.inputIntensity - 0.01);
    }
    return this.inputIntensity;
  }

  // 切换背景状态
  toggleBackground(imagePath) {
    this.isCustomBackground = !this.isCustomBackground;
    this.currentBackgroundPath = this.isCustomBackground ? imagePath : null;
    
    // 切换主题
    if (this.isCustomBackground) {
      // 保存当前主题
      this.previousTheme = document.documentElement.getAttribute('data-theme') || 'light';
      // 应用透明背景主题
      document.documentElement.setAttribute('data-theme', 'bg-theme');
    } else {
      // 恢复之前的主题
      if (this.previousTheme) {
        document.documentElement.setAttribute('data-theme', this.previousTheme);
        this.previousTheme = null;
      }
    }
    
    this.emit('backgroundChange', {
      isCustomBackground: this.isCustomBackground,
      path: this.currentBackgroundPath,
      theme: this.isCustomBackground ? 'bg-theme' : this.previousTheme
    });
    
    return this.isCustomBackground;
  }

  // 获取当前背景状态
  getBackgroundState() {
    return {
      isCustomBackground: this.isCustomBackground,
      path: this.currentBackgroundPath,
      theme: this.isCustomBackground ? 'bg-theme' : this.previousTheme
    };
  }

  // 处理主题变化
  handleThemeChange(newTheme) {
    // 如果用户手动切换了主题且不是我们的透明主题，则关闭自定义背景
    if (newTheme !== 'bg-theme' && this.isCustomBackground) {
      this.isCustomBackground = false;
      this.currentBackgroundPath = null;
      
      this.emit('backgroundChange', {
        isCustomBackground: false,
        path: null,
        theme: newTheme
      });
    }
  }
}

// 创建单例实例
const eventBus = new EventBus();

// 添加主题变化监听
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'data-theme' && 
          mutation.target === document.documentElement) {
        const newTheme = document.documentElement.getAttribute('data-theme');
        eventBus.handleThemeChange(newTheme);
      }
    });
  });
  
  // 在DOM加载完成后开始观察
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.documentElement, { 
      attributes: true,
      attributeFilter: ['data-theme']
    });
  });
}

export default eventBus; 