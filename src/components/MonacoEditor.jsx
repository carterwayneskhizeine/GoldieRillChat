import React, { useState, useRef, useEffect } from 'react';
import Editor, { loader } from "@monaco-editor/react";
import { loadPyodide } from "pyodide";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import '../styles/markdown-preview.css';
import '../styles/monaco-editor.css';

// 配置 Monaco Editor 加载器
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
});

export const MonacoEditor = ({ currentNote, saveNote }) => {
  const [language, setLanguage] = useState("plaintext");
  const [theme, setTheme] = useState("vs-dark");
  const editorRef = useRef(null);
  const [fontSize, setFontSize] = useState(14);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [isImageBackground, setIsImageBackground] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  const autoSaveTimeoutRef = useRef(null);

  // 初始化时检查是否为图片背景模式
  useEffect(() => {
    // 检查是否有图片背景标志
    const checkImageBackgroundMode = () => {
      // 可以从 window 对象、localStorage 或其他全局状态检查
      if (window.isImageBackgroundMode !== undefined) {
        setIsImageBackground(window.isImageBackgroundMode);
      }
    };
    
    // 立即检查一次
    checkImageBackgroundMode();
    
    // 监听背景模式变化的事件
    const handleBackgroundModeChange = (event) => {
      if (event.detail && event.detail.isImageBackground !== undefined) {
        setIsImageBackground(event.detail.isImageBackground);
      }
    };
    
    window.addEventListener('backgroundModeChange', handleBackgroundModeChange);
    
    return () => {
      window.removeEventListener('backgroundModeChange', handleBackgroundModeChange);
    };
  }, []);

  // 监听外部传入的内容
  useEffect(() => {
    if (window.pendingMonacoContent && editorRef.current) {
      editorRef.current.setValue(window.pendingMonacoContent);
      window.pendingMonacoContent = null;
    }
  }, [isEditorReady]);

  // 当currentNote改变时，更新编辑器内容
  useEffect(() => {
    if (currentNote && editorRef.current) {
      editorRef.current.setValue(currentNote.content || '');
      // 更新文件类型
      if (currentNote.filePath.endsWith('.js') || currentNote.filePath.endsWith('.jsx')) {
        setLanguage('javascript');
      } else if (currentNote.filePath.endsWith('.ts') || currentNote.filePath.endsWith('.tsx')) {
        setLanguage('typescript');
      } else if (currentNote.filePath.endsWith('.py')) {
        setLanguage('python');
      } else if (currentNote.filePath.endsWith('.md')) {
        setLanguage('markdown');
      } else if (currentNote.filePath.endsWith('.json')) {
        setLanguage('json');
      } else if (currentNote.filePath.endsWith('.html')) {
        setLanguage('html');
      } else if (currentNote.filePath.endsWith('.css')) {
        setLanguage('css');
      } else if (currentNote.filePath.endsWith('.sql')) {
        setLanguage('sql');
      } else {
        setLanguage('plaintext');
      }
    }
  }, [currentNote]);

  // 监听编辑器内容变化，自动保存
  useEffect(() => {
    if (isEditorReady && editorRef.current && currentNote && autoSaveEnabled) {
      const model = editorRef.current.getModel();
      
      const handleContentChange = () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // 3秒后自动保存
        autoSaveTimeoutRef.current = setTimeout(() => {
          const content = editorRef.current.getValue();
          saveNote(currentNote.id, content).then(() => {
            setLastSaved(new Date().toLocaleTimeString());
          });
        }, 15000);
      };
      
      const disposable = model.onDidChangeContent(handleContentChange);
      
      return () => {
        disposable.dispose();
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }
  }, [isEditorReady, currentNote, autoSaveEnabled, saveNote]);

  // 初始化 Pyodide
  useEffect(() => {
    async function initPyodide() {
      if (language === "python" && !pyodide) {
        try {
          const py = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/",
            stdout: (text) => {
              setOutput(prev => prev + text + "\n");
            },
            stderr: (text) => {
              setOutput(prev => prev + "Error: " + text + "\n");
            }
          });
          setPyodide(py);
          
          // 预加载一些常用的 Python 包
          await py.loadPackage(['numpy', 'pandas']);
          
          console.log("Pyodide loaded successfully!");
        } catch (error) {
          console.error("Failed to load Pyodide:", error);
          setOutput("Failed to load Python runtime: " + error.message);
        }
      }
    }
    initPyodide();
  }, [language]);

  // 监听编辑器内容变化
  useEffect(() => {
    if (isEditorReady && language === "markdown" && editorRef.current) {
      const model = editorRef.current.getModel();
      // 立即设置初始内容
      setMarkdownContent(editorRef.current.getValue());
      
      const disposable = model.onDidChangeContent(() => {
        setMarkdownContent(editorRef.current.getValue());
      });
      return () => disposable.dispose();
    }
  }, [isEditorReady, language]);

  // 在显示预览时更新内容
  useEffect(() => {
    if (showPreview && language === "markdown" && editorRef.current) {
      setMarkdownContent(editorRef.current.getValue());
    }
  }, [showPreview, language]);

  // 手动保存笔记
  const handleManualSave = () => {
    if (editorRef.current && currentNote) {
      const content = editorRef.current.getValue();
      saveNote(currentNote.id, content).then(() => {
        setLastSaved(new Date().toLocaleTimeString());
      });
    }
  };

  // 运行 Python 代码
  const runPythonCode = async () => {
    if (!pyodide || !editorRef.current) return;
    
    setIsRunning(true);
    setOutput("Running...\n");
    
    try {
      const code = editorRef.current.getValue();
      
      // 直接运行代码，输出会通过 stdout/stderr 回调处理
      await pyodide.runPythonAsync(code);
      
    } catch (error) {
      setOutput(prev => prev + `Error: ${error.message}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  // 支持的语言列表
  const languages = [
    "plaintext",
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
    "vs-light",
    "hc-black"
  ];

  // 编辑器加载完成时的回调
  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    window.monacoEditor = editor;
    setIsEditorReady(true);
    
    // 如果有待处理的内容，立即设置
    if (window.pendingMonacoContent) {
      editor.setValue(window.pendingMonacoContent);
      window.pendingMonacoContent = null;
    }
    
    // 如果是 markdown，立即获取内容
    if (language === "markdown") {
      setMarkdownContent(editor.getValue());
    }
    
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

  // 添加内容预处理函数
  const processContent = (text) => {
    // 匹配以数字和右括号开头的行，将其转换为标准的 Markdown 有序列表格式
    return text.replace(/^(\d+)\)(.+)$/gm, '$1.$2');
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden monaco-editor-container">
      {/* 工具栏 */}
      <div className="monaco-editor-toolbar">
        {/* 左侧组：下拉菜单 */}
        <div className="monaco-toolbar-left-group">
          {/* 语言选择 */}
          <div className="select-wrapper">
            <select 
              className="select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={!isEditorReady}
            >
              {languages.map(lang => (
                <option 
                  key={lang} 
                  value={lang}
                >
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* 主题选择 */}
          <div className="select-wrapper">
            <select 
              className="select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={!isEditorReady}
            >
              {themes.map(t => (
                <option 
                  key={t} 
                  value={t}
                >
                  {t === 'vs-dark' ? '深色' : t === 'vs-light' ? '浅色' : t === 'hc-black' ? '高对比' : t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 中间组：字体大小调整 */}
        <div className="monaco-font-size-controls">
          <button 
            className="shader-btn"
            onClick={() => handleFontSizeChange(-1)}
            disabled={!isEditorReady}
          >
            <span>-</span>
          </button>
          <div className="monaco-font-size-display">
            {fontSize}px
          </div>
          <button 
            className="shader-btn"
            onClick={() => handleFontSizeChange(1)}
            disabled={!isEditorReady}
          >
            <span>+</span>
          </button>
        </div>

        {/* 右侧组：功能按钮 */}
        <div className="monaco-toolbar-right-group">
          {/* 自动保存开关 */}
          <div className="monaco-autosave-control">
            <span className="mr-2">自动保存</span>
            <input 
              type="checkbox" 
              className="toggle toggle-primary toggle-sm" 
              checked={autoSaveEnabled}
              onChange={() => setAutoSaveEnabled(!autoSaveEnabled)}
            />
          </div>
          
          {/* 保存按钮 */}
          <button 
            className="shader-btn save-btn"
            onClick={handleManualSave}
            disabled={!isEditorReady}
          >
            保存
          </button>
          
          {/* Markdown 预览按钮 */}
          {language === "markdown" && (
            <button 
              className="shader-btn"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!isEditorReady}
              style={showPreview ? {backgroundColor: 'rgba(60, 60, 200, 0.3)'} : {}}
            >
              {showPreview ? "编辑" : "预览"}
            </button>
          )}
          
          {/* Python 运行按钮 */}
          {language === "python" && (
            <button 
              className="shader-btn"
              onClick={runPythonCode}
              disabled={!isEditorReady || isRunning}
              style={{backgroundColor: isRunning ? 'rgba(40, 120, 40, 0.4)' : 'rgba(40, 120, 40, 0.2)'}}
            >
              {isRunning ? "运行中..." : "运行"}
            </button>
          )}
        </div>
      </div>

      {/* 编辑器和预览区域 */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* 编辑器区域 - 宽度根据是否显示预览决定 */}
        <div className={`${(showPreview || language === "python" && output) ? 'w-1/2' : 'w-full'} monaco-editor-wrapper`}>
          <Editor
            height="100%"
            language={language}
            theme={theme}
            value={currentNote?.content || ''}
            onMount={handleEditorDidMount}
            beforeMount={handleEditorWillMount}
            options={{
              fontSize: fontSize,
              wordWrap: "on",
              minimap: { enabled: true },
              scrollBeyondLastLine: true,
              lineNumbers: "on",
              roundedSelection: true,
              selectOnLineNumbers: true,
              cursorStyle: "line",
              cursorWidth: 2,
              formatOnPaste: true,
              formatOnType: true
            }}
          />
        </div>

        {/* Markdown 预览区域 */}
        {showPreview && language === "markdown" && (
          <div className="w-1/2 rounded-lg p-4 overflow-auto monaco-editor-preview">
            <div className="prose max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeRaw, rehypeSanitize]}
                components={{
                  // 自定义代码块样式
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="relative">
                        <div className="absolute right-2 top-2">
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                            }}
                          >
                            复制
                          </button>
                        </div>
                        <pre className={`language-${match[1]} rounded-lg`}>
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className={`${className} bg-base-200 rounded px-1`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // 自定义链接样式
                  a({node, children, href, ...props}) {
                    return (
                      <a
                        href={href}
                        className="text-primary hover:text-primary-focus"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  // 自定义表格样式
                  table({node, children, ...props}) {
                    return (
                      <div className="overflow-x-auto">
                        <table className="table table-zebra w-full" {...props}>
                          {children}
                        </table>
                      </div>
                    );
                  },
                  // 添加列表项组件
                  li: ({node, ordered, ...props}) => (
                    <li className="my-1" {...props} />
                  ),
                  // 添加有序列表组件
                  ol: ({node, ...props}) => (
                    <ol className="list-decimal pl-6 my-4" {...props} />
                  ),
                  // 添加无序列表组件
                  ul: ({node, ...props}) => (
                    <ul className="list-disc pl-6 my-4" {...props} />
                  ),
                }}
              >
                {processContent(markdownContent)}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Python 输出区域 */}
        {language === "python" && output && (
          <div className="w-1/2 rounded-lg p-4 overflow-auto monaco-editor-preview">
            <div className="font-mono text-sm whitespace-pre-wrap">
              {output}
            </div>
          </div>
        )}
      </div>

      {/* 最后保存时间提示 */}
      {lastSaved && (
        <div className="text-xs opacity-70 text-right mt-2">
          上次保存: {lastSaved}
        </div>
      )}
    </div>
  );
}; 