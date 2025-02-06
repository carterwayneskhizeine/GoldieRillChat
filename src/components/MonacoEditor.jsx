import React, { useState, useRef } from 'react';
import Editor, { loader } from "@monaco-editor/react";

// 配置 Monaco Editor 加载器
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
});

export const MonacoEditor = () => {
  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState("vs-dark");
  const editorRef = useRef(null);
  const [fontSize, setFontSize] = useState(14);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // 支持的语言列表
  const languages = [
    "javascript",
    "typescript",
    "python",
    "java",
    "cpp",
    "csharp",
    "html",
    "css",
    "json",
    "markdown",
    "sql",
    "xml",
    "yaml"
  ];

  // 支持的主题
  const themes = [
    "vs-dark",
    "light",
    "hc-black"
  ];

  // 编辑器加载完成时的回调
  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    setIsEditorReady(true);
    
    // 设置一些编辑器选项
    editor.updateOptions({
      fontSize: fontSize,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      automaticLayout: true,
      lineNumbers: "on",
      roundedSelection: true,
      selectOnLineNumbers: true,
      cursorStyle: "line",
      cursorWidth: 2,
      formatOnPaste: true,
      formatOnType: true
    });
  }

  // 编辑器加载中显示的内容
  function handleEditorWillMount(monaco) {
    // 这里可以在编辑器加载前进行一些配置
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
      }
    });
  }

  // 字体大小调整
  const handleFontSizeChange = (delta) => {
    const newSize = Math.max(8, Math.min(32, fontSize + delta));
    setFontSize(newSize);
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize: newSize });
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      {/* 工具栏 */}
      <div className="flex flex-wrap gap-2 items-center bg-base-200 p-2 rounded-lg">
        {/* 语言选择 */}
        <select 
          className="select select-bordered select-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={!isEditorReady}
        >
          {languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>

        {/* 主题选择 */}
        <select 
          className="select select-bordered select-sm"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          disabled={!isEditorReady}
        >
          {themes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* 字体大小调整 */}
        <div className="flex items-center gap-2">
          <button 
            className="btn btn-sm btn-square"
            onClick={() => handleFontSizeChange(-2)}
            disabled={!isEditorReady}
          >
            -
          </button>
          <span className="text-sm">{fontSize}px</span>
          <button 
            className="btn btn-sm btn-square"
            onClick={() => handleFontSizeChange(2)}
            disabled={!isEditorReady}
          >
            +
          </button>
        </div>

        {/* 其他工具按钮 */}
        <div className="flex-1 flex justify-end gap-2">
          <button 
            className="btn btn-sm"
            onClick={() => {
              if (editorRef.current) {
                editorRef.current.getAction('editor.action.formatDocument').run();
              }
            }}
            disabled={!isEditorReady}
          >
            格式化
          </button>
          <button 
            className="btn btn-sm"
            onClick={() => {
              navigator.clipboard.writeText(editorRef.current?.getValue() || '');
            }}
            disabled={!isEditorReady}
          >
            复制
          </button>
          <button 
            className="btn btn-sm"
            onClick={async () => {
              const text = await navigator.clipboard.readText();
              editorRef.current?.setValue(text);
            }}
            disabled={!isEditorReady}
          >
            粘贴
          </button>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden bg-base-200 rounded-lg">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          language={language}
          theme={theme}
          loading={<div className="flex items-center justify-center h-full">加载编辑器中...</div>}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          options={{
            fontSize: fontSize,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true
          }}
        />
      </div>
    </div>
  );
}; 