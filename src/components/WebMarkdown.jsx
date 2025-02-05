import React, { useEffect, useRef, useState } from 'react';
import Cherry from 'cherry-markdown';
import 'cherry-markdown/dist/cherry-markdown.min.css';

export const WebMarkdown = ({ initialContent = '', setContent }) => {
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    // 清理旧的实例
    const oldEditor = document.querySelector('#cherry-markdown');
    if (oldEditor) {
      oldEditor.innerHTML = '';
    }

    if (!editor && editorRef.current) {
      // 初始化编辑器
      const config = {
        id: 'cherry-markdown',
        nameSpace: 'cherry-markdown-editor',
        height: '100%',
        forceAppend: true,
        autoScrollByHash: false,
        value: initialContent || `# Welcome to Cherry Markdown\n\nStart typing...`,
        editor: {
          defaultModel: 'edit&preview'
        },
        toc: {
          enable: true,  // 启用目录功能
          level: [1, 2, 3, 4, 5, 6],  // 目录层级
          showOrderNumber: true,  // 显示序号
          position: 'left',  // 目录位置
          style: {
            position: 'fixed',  // 固定定位，实现悬浮
            top: '60px',        // 距离窗口顶部60px
            left: '16px',       // 距离窗口左侧16px
            'z-index': '100',   // 确保目录在最上层
            'max-height': '80vh',  // 最大高度
            'overflow-y': 'auto',  // 超出高度时显示滚动条
            'background-color': 'var(--b1)',  // 使用主题变量
            'border': '1px solid var(--b3)',  // 使用主题变量
            'border-radius': '8px',
            'padding': '16px',
            'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.15)',  // 添加阴影效果
            'min-width': '200px',  // 设置最小宽度
            'max-width': '300px',  // 设置最大宽度
            'transition': 'all 0.3s ease',  // 添加过渡效果
            'backdrop-filter': 'blur(8px)',  // 背景模糊效果
            'opacity': '0.95'  // 略微透明
          },
          container: '#toc-container'  // 指定目录容器
        },
        themeSettings: {
          // 主题列表，用于切换主题
          themeList: [
            { className: 'default', label: '默认' },
            { className: 'dark', label: '黑' },
            { className: 'light', label: '白' },
            { className: 'green', label: '绿' },
            { className: 'red', label: '粉' },
            { className: 'violet', label: '紫' },
            { className: 'blue', label: '蓝' }
          ],
          // 默认使用暗黑主题
          mainTheme: 'dark',
          // 代码块主题
          codeBlockTheme: 'dark',
        },
        toolbars: {
          theme: 'dark',
          // 在工具栏中添加主题切换按钮和目录按钮
          toolbar: [
            'bold',
            'italic',
            'strikethrough',
            '|',
            'color',
            'header',
            'list',
            '|',
            'theme',
            'toc'  // 添加目录按钮
          ],
          // 移除侧边栏的主题和目录按钮
          sidebar: ['mobilePreview', 'copy'],
          // 禁用图表相关功能
          table: ['table']  // 只保留基础表格功能
        },
        engine: {
          // 禁用图表渲染
          global: {
            tableChart: false,
            echarts: false,
          },
          // 禁用代码块的在线运行功能
          syntax: {
            codeBlock: {
              wrap: true,
              lineNumber: true,
              copyCode: true,
              editCode: false,  // 禁用编辑功能
              runCode: false    // 禁用运行功能
            }
          }
        },
        callback: {
          afterInit: () => {
            // 初始化后强制更新布局
            setTimeout(() => {
              if (editor) {
                editor.resize();
              }
            }, 100);
          },
          afterChange: (md, html) => {
            // 内容变化时更新父组件的状态
            setContent?.(md);
          },
          // 主题切换的回调
          onThemeChange: (theme, type) => {
            // 保存主题设置到localStorage
            if (type === 'main') {
              localStorage.setItem('cherry-markdown-theme', theme);
            } else if (type === 'codeBlock') {
              localStorage.setItem('cherry-markdown-code-theme', theme);
            }
          },
        },
      };

      // 从localStorage读取保存的主题设置
      const savedTheme = localStorage.getItem('cherry-markdown-theme');
      const savedCodeTheme = localStorage.getItem('cherry-markdown-code-theme');
      if (savedTheme) {
        config.themeSettings.mainTheme = savedTheme;
      }
      if (savedCodeTheme) {
        config.themeSettings.codeBlockTheme = savedCodeTheme;
      }

      const cherryInstance = new Cherry(config);
      setEditor(cherryInstance);
    }

    // 组件卸载时清理
    return () => {
      if (editor) {
        editor.destroy();
        setEditor(null);
      }
    };
  }, []);  // 只在组件挂载时执行一次

  // 当initialContent变化时更新编辑器内容
  useEffect(() => {
    if (editor && initialContent) {
      editor.setValue(initialContent);
    }
  }, [initialContent, editor]);

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div id="toc-container" className="fixed top-[60px] left-4 z-50"></div>
      <div className="w-full h-full overflow-hidden bg-base-100">
        <div id="cherry-markdown" ref={editorRef} className="h-full" />
      </div>
    </div>
  );
}; 