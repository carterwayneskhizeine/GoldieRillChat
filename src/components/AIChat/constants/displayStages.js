// 显示阶段的常量定义
export const DISPLAY_STAGES = {
  REASONING: 'reasoning',      // 正在接收推理过程
  TYPING_REASONING: 'typing_reasoning', // 打印推理过程
  TYPING_RESULT: 'typing_result',    // 打印结果
  COMPLETED: 'completed'      // 显示最终的Markdown格式
};

// 消息状态常量
export const MESSAGE_STATES = {
  IDLE: 'idle',
  THINKING: 'thinking',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// 动画状态常量
export const ANIMATION_STATES = {
  FADE_IN: 'fade_in',
  FADE_OUT: 'fade_out',
  NONE: 'none'
}; 