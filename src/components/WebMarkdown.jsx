import React, { useEffect, useRef, useState } from 'react';
import Cherry from 'cherry-markdown';
import 'cherry-markdown/dist/cherry-markdown.min.css';

export const WebMarkdown = () => {
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
        value: '# Welcome to Cherry Markdown\n\nStart typing...',
        editor: {
          defaultModel: 'edit&preview'
        },
        themeSettings: {
          // 主题列表，用于切换主题
          themeList: [
            { className: 'default', label: '默认' },
            { className: 'dark', label: '暗黑' },
            { className: 'light', label: '明亮' }
          ],
          // 默认使用暗黑主题
          mainTheme: 'dark',
          // 代码块主题
          codeBlockTheme: 'dark',
        },
        toolbars: {
          theme: 'dark',
          // 在工具栏中添加主题切换按钮
          toolbar: [
            'bold',
            'italic',
            'strikethrough',
            '|',
            'color',
            'header',
            'list',
            '|',
            'theme'
          ],
          // 在侧边栏也添加主题切换按钮
          sidebar: ['mobilePreview', 'copy', 'theme'],
          // 禁用图表相关功能
          table: ['table']  // 只保留基础表格功能
        },
        engine: {
          // 禁用图表渲染
          global: {
            tableChart: false,
            echarts: false,
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
            // 可以在这里处理内容变化
            console.log('content changed');
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

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="w-full h-full overflow-hidden bg-base-100">
        <div id="cherry-markdown" ref={editorRef} className="h-full" />
      </div>
    </div>
  );
}; 