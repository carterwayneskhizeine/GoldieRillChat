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
        theme: 'dark',
        height: '100%',
        forceAppend: true,
        autoScrollByHash: false,
        value: '# Welcome to Cherry Markdown\n\nStart typing...',
        editor: {
          defaultModel: 'edit&preview'
        },
        toolbars: {
          theme: 'dark',
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
        },
      };
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