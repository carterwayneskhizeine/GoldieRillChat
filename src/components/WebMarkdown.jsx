import React, { useEffect, useRef, useState } from 'react';
import Cherry from 'cherry-markdown';
import 'cherry-markdown/dist/cherry-markdown.min.css';

export const WebMarkdown = () => {
  const editorRef = useRef(null);
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    if (editor == null) {
      // 初始化编辑器
      const config = {
        id: 'cherry-markdown',
        theme: 'dark',
        height: '100%',
        value: '# Welcome to Cherry Markdown\n\nStart typing...',
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
          afterChange: (md, html) => {
            // 可以在这里处理内容变化
            console.log('content changed');
          },
        },
      };
      setEditor(new Cherry(config));
    }
  }, [editor]);

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="w-full h-full overflow-hidden bg-base-100">
        <div id="cherry-markdown" ref={editorRef} className="h-full" />
      </div>
    </div>
  );
}; 