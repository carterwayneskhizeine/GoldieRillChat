class EventBus {
  constructor() {
    this.events = {};
    this.lastInputTime = 0;
    this.inputIntensity = 0;
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
}

// 创建单例实例
const eventBus = new EventBus();
export default eventBus; 