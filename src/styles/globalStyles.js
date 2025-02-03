// 定义全局样式常量
export const globalStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;     /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;            /* Chrome, Safari, Opera */
  }
  
  /* 添加窗口拖拽样式 */
  .app-drag-region {
    -webkit-app-region: drag;
    app-region: drag;
  }
  
  button, input, .no-drag {
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }

  .chat-view-compact {
    height: calc(100vh - 180px); /* 调整高度以留出底部按钮的空间 */
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }

  .chat-view-compact .messages-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 1rem;
  }

  .chat-view-compact .input-container {
    flex-shrink: 0;
    margin-bottom: 1rem;
  }
` 