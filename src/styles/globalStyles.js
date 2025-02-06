// 定义全局样式常量
export const globalStyles = `
  /* 基础滚动条样式 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.7);
  }

  /* 确保滚动容器可见 */
  .overflow-auto {
    overflow: auto !important;
  }
  .overflow-y-auto {
    overflow-y: auto !important;
  }

  /* 仅在特定组件中隐藏滚动条 */
  .browser-content::-webkit-scrollbar,
  .monaco-content::-webkit-scrollbar,
  .web-markdown-content::-webkit-scrollbar,
  .image-editor-content::-webkit-scrollbar {
    display: none;
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

  /* Chat视图样式 */
  .chat-view-compact {
    height: calc(100vh - 180px);
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

  /* 侧边栏样式 */
  .sidebar-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  /* 聊天界面样式 */
  .chat-container {
    display: flex;
    height: 100%;
  }

  .chat-sidebar {
    width: 250px;
    height: 100%;
    overflow-y: auto;
    border-right: 1px solid var(--border-color);
  }

  .chat-main {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .chat-input {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
  }
` 