import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CheckIcon, CopyIcon, ImageIcon, Loader2Icon, XIcon, ArrowUpDown, Search, ChevronUp, ChevronDown } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'katex/dist/katex.min.css';
import '../../styles/table.css';

  // 添加语言名称映射
  const languageNameMap = {
    python: 'Python',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    java: 'Java',
    cpp: 'C++',
    csharp: 'C#',
    php: 'PHP',
    ruby: 'Ruby',
    go: 'Go',
    rust: 'Rust',
    swift: 'Swift',
    kotlin: 'Kotlin',
    scala: 'Scala',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    shell: 'Shell',
    bash: 'Bash',
    powershell: 'PowerShell',
    markdown: 'Markdown',
    json: 'JSON',
    yaml: 'YAML',
    xml: 'XML',
  };

  // 添加 KaTeX 宏定义
  const katexMacros = {
    "\\d": "\\mathrm{d}",
    "\\partial": "\\partial",
    // 常用数学符号
    "\\eps": "\\varepsilon",
    "\\phi": "\\varphi",
    "\\ell": "\\ell",
    // 集合和逻辑
    "\\set": "\\{#1\\}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}",
    "\\Q": "\\mathbb{Q}",
    "\\R": "\\mathbb{R}",
    "\\C": "\\mathbb{C}",
    // 微积分和分析
    "\\diff": "\\mathrm{d}#1",
    "\\deriv": "\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}",
    "\\pderiv": "\\frac{\\partial #1}{\\partial #2}",
    "\\limit": "\\lim_{#1 \\to #2}",
    "\\infty": "\\infty",
    // 线性代数
    "\\matrix": "\\begin{pmatrix} #1 \\end{pmatrix}",
    "\\vector": "\\begin{pmatrix} #1 \\end{pmatrix}",
    "\\det": "\\mathrm{det}",
    "\\tr": "\\mathrm{tr}",
    // 概率论
    "\\E": "\\mathbb{E}",
    "\\P": "\\mathbb{P}",
    "\\Var": "\\mathrm{Var}",
    "\\Cov": "\\mathrm{Cov}",
    // 常用函数和算子
    "\\abs": "|#1|",
    "\\norm": "\\|#1\\|",
    "\\inner": "\\langle #1, #2 \\rangle",
    "\\floor": "\\lfloor #1 \\rfloor",
    "\\ceil": "\\lceil #1 \\rceil",
    // 求和、积分等
    "\\series": "\\sum_{#1}^{#2}",
    "\\integral": "\\int_{#1}^{#2}",
    // 箭头和关系
    "\\implies": "\\Rightarrow",
    "\\iff": "\\Leftrightarrow",
    "\\compose": "\\circ"
  };

// CSS 样式
const treeViewStyles = {
  container: {
    fontFamily: 'monospace, Consolas, "Courier New", Courier, monospace',
    whiteSpace: 'pre',
    lineHeight: '1.5',
    letterSpacing: '0',
    overflow: 'visible',
    fontSize: '0.9rem',
  },
  branch: {
    color: 'inherit',
    fontWeight: 'normal',
  }
};

// 内联样式
const inlineStyles = `
  .tree-view {
    font-family: monospace, Consolas, "Courier New", Courier, monospace;
    white-space: pre;
    line-height: 1.5;
    letter-spacing: 0;
    overflow: visible;
    font-size: 0.9rem;
  }
  .tree-view ul {
    list-style-type: none !important;
    padding-left: 0 !important;
    margin: 0.5em 0;
  }
  .tree-view li {
    list-style-type: none !important;
    padding-left: 0 !important;
  }
  .tree-view ul ul {
    padding-left: 0 !important;
    margin-left: 0 !important;
  }
  .tree-view p {
    margin: 0.3em 0;
  }
  .tree-view code {
    font-family: inherit !important;
    background: none !important;
    padding: 0 !important;
  }
`;

// 树形结构容器组件
const TreeView = ({ children }) => {
  return (
    <>
      <style>{inlineStyles}</style>
      <div className="tree-view">
        {children}
      </div>
    </>
  );
};

// 添加树形结构特殊字符识别函数
const hasTreeStructure = (text) => {
  if (typeof text !== 'string') return false;
  return text.includes('┌─') || 
         text.includes('├─') || 
         text.includes('└─') || 
         text.includes('│') ||
         /^\s*[├└┬┼│]/.test(text);
};

// 检查内容是否包含树形结构
const contentHasTreeStructure = (children) => {
  const childrenArray = React.Children.toArray(children);
  return childrenArray.some(child => 
    typeof child === 'string' && hasTreeStructure(child)
  );
};

// 添加内容处理的缓存函数
const useProcessedContent = (content) => {
  return useMemo(() => {
    // 匹配以数字和右括号开头的行，将其转换为标准的 Markdown 有序列表格式
    let processed = content.replace(/^(\d+)\)(.+)$/gm, '$1.$2');

    // 处理带有反引号的序号标题格式
    processed = processed.replace(/^(#+\s*\d+\.\s+)`([^`]+)`(.*)$/gm, '$1$2$3');
    processed = processed.replace(/^(\d+\.\s+)`([^`]+)`(.*)$/gm, '$1$2$3');

    // 处理行内代码块，将非代码块的反引号去掉
    processed = processed.replace(/`([^`\n]+)`/g, (match, content) => {
      // 如果内容不包含代码特征，则去掉反引号
      if (
        /^[@a-zA-Z][\w\-\/.]*$/.test(content) ||
        /^[\w\-\./\s]+$/.test(content)
      ) {
        return content;
      }
      // 如果包含代码关键字，保持代码块格式
      if (content.includes('function') ||
          content.includes('return') ||
          content.includes('const') ||
          content.includes('let') ||
          content.includes('var') ||
          content.includes('import') ||
          content.includes('export') ||
          content.includes('class') ||
          content.includes('=>')) {
        return match;
      }
      // 如果包含代码特征字符（除了 - . /），保持代码块格式
      if (/[{}[\]()=+*<>!|&;$]/.test(content)) {
        return match;
      }
      // 其他情况去掉反引号
      return content;
    });

    // 保持缩进和换行
    processed = processed.replace(/\n/g, '  \n');
    processed = processed.replace(/^(#{1,6}\s.*)/gm, '\n$1\n');
    processed = processed.replace(/^([*-]|\d+\.)\s/gm, '\n$&');

    return processed;
  }, [content]);
};

// 将 markdownComponents 移到组件外部
const createMarkdownComponents = (handleContextMenu, onLinkClick, images, setLightboxIndex, setOpenLightbox) => ({
  // 链接渲染
  a: ({node, children, href, ...props}) => {
    if (typeof href === 'string') {
      return (
        <a
          href={href}
          className="text-primary hover:text-primary-focus"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLinkClick(href);
          }}
          onContextMenu={handleContextMenu}
          {...props}
        >
          {href}
        </a>
      );
    }
    return <span>{children}</span>;
  },
  // 段落渲染
  p: ({node, children, ...props}) => {
    // 检查是否包含树形结构特殊字符
    const containsTreeStructure = contentHasTreeStructure(children);
    
    if (containsTreeStructure) {
      return (
        <TreeView>
          <p {...props} 
            data-selectable="true" 
            onContextMenu={handleContextMenu}
          >
            {children}
          </p>
        </TreeView>
      );
    }
    
    const styles = { 
      userSelect: 'text',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      margin: '0.5em 0',
    };
    
    return (
      <p {...props} data-selectable="true" style={styles} onContextMenu={handleContextMenu}>
        {children}
      </p>
    );
  },
  // 添加加粗文本渲染
  strong: ({node, children, ...props}) => (
    <strong {...props} style={{ fontWeight: 'bold', userSelect: 'text' }}>
      {children}
    </strong>
  ),
  // 修改列表项渲染
  li: ({node, children, ordered, ...props}) => {
    // 检查是否包含树形结构特殊字符
    const containsTreeStructure = contentHasTreeStructure(children);
    
    if (containsTreeStructure) {
      return (
        <li {...props} 
          data-selectable="true" 
          style={treeViewStyles.container}
          onContextMenu={handleContextMenu}
        >
          {children}
        </li>
      );
    }
    
    return (
      <li {...props} 
        data-selectable="true" 
        style={{ userSelect: 'text' }} 
        onContextMenu={handleContextMenu}
      >
        {children}
      </li>
    );
  },
  // ... rest of the components ...
});

// 使用 React.memo 包装 MarkdownRenderer 组件
export const MarkdownRenderer = React.memo(({
  content,
  isCompact = false,
  className = '',
  onCopyCode = () => {},
  onLinkClick = () => {},
}) => {
  const processedContent = useProcessedContent(content);
  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [images, setImages] = useState([]);

  // 使用 useCallback 优化事件处理函数
  const handleCopySelectedText = useCallback((e) => {
    if (e.ctrlKey && e.key === 'c') {
      const selectedText = window.getSelection().toString();
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
      }
    }
  }, []);

  // 使用 useCallback 优化图片收集函数
  const collectImages = useCallback((content) => {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g;
    const matches = [...content.matchAll(imgRegex)];
    return matches.map(match => ({
      src: match[2],
      alt: match[1],
      title: match[1],
      description: match[3] || ''
    }));
  }, []);

  // 使用 useEffect 优化图片收集
  useEffect(() => {
    const collectedImages = collectImages(content);
    setImages(collectedImages);
  }, [content, collectImages]);

  // 使用 useCallback 优化上下文菜单处理
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const selectedText = window.getSelection().toString();
    const target = e.target;
    
    const contextMenuEvent = new CustomEvent('showContextMenu', {
      detail: {
        x: e.pageX,
        y: e.pageY,
        type: 'text',
        data: {
          text: selectedText || target.textContent
        }
      }
    });
    window.dispatchEvent(contextMenuEvent);
  }, []);

  // 使用 useMemo 缓存 rehypePlugins 配置
  const rehypePlugins = useMemo(() => [
    rehypeRaw,
    [rehypeSanitize, {
      attributes: {
        '*': ['className', 'style'],
        'a': ['href', 'target', 'rel'],
        'img': ['src', 'alt', 'title'],
        'strong': ['style']
      }
    }],
    [rehypeKatex, {
      strict: false,
      output: 'html',
      throwOnError: false,
      displayMode: true,
      trust: true,
      macros: katexMacros,
      errorColor: 'var(--error)',
      colorIsTextColor: true,
      maxSize: 500,
      maxExpand: 1000,
      minRuleThickness: 0.04
    }]
  ], []);

  // 使用 useMemo 缓存 remarkPlugins 配置
  const remarkPlugins = useMemo(() => [
    remarkGfm,
    [remarkMath, { singleDollar: true }],
    remarkBreaks
  ], []);

  // 使用 useMemo 缓存组件配置
  const markdownComponents = useMemo(() => 
    createMarkdownComponents(handleContextMenu, onLinkClick, images, setLightboxIndex, setOpenLightbox),
    [handleContextMenu, onLinkClick, images, setLightboxIndex, setOpenLightbox]
  );

  // 表格相关组件
  const TableWrapper = ({ children, ...props }) => {
    const tableRef = useRef(null);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [isCompact, setIsCompact] = useState(false);

    // 检查表格是否需要滚动和响应式模式
    useEffect(() => {
      const checkTableState = () => {
        if (tableRef.current) {
          const { scrollWidth, clientWidth } = tableRef.current;
          setHasOverflow(scrollWidth > clientWidth);
          setIsCompact(window.innerWidth < 768);
        }
      };

      checkTableState();
      window.addEventListener('resize', checkTableState);
      return () => window.removeEventListener('resize', checkTableState);
    }, []);

    return (
      <div className={`markdown-table-wrapper ${isCompact ? 'compact' : ''}`}>
        <div 
          ref={tableRef}
          className={`table-scroll ${hasOverflow ? 'has-overflow' : ''}`}
        >
          <table className="markdown-table" {...props}>
            {children}
          </table>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`markdown-content ${className} select-text`} 
      onContextMenu={handleContextMenu}
      style={{ userSelect: 'text' }}
    >
      <style>
        {`
          .markdown-content {
            font-size: ${isCompact ? '0.9em' : '1em'};
            line-height: 1.6;
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            cursor: text;
          }

          .markdown-content * {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }

          .markdown-content pre,
          .markdown-content code {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }

          .markdown-content p,
          .markdown-content h1,
          .markdown-content h2,
          .markdown-content h3,
          .markdown-content h4,
          .markdown-content h5,
          .markdown-content h6,
          .markdown-content ul,
          .markdown-content ol,
          .markdown-content li,
          .markdown-content blockquote,
          .markdown-content table,
          .markdown-content th,
          .markdown-content td {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }

          .markdown-content .prose {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }

          .markdown-content .prose * {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }

          .markdown-content h1,
          .markdown-content h2,
          .markdown-content h3,
          .markdown-content h4,
          .markdown-content h5,
          .markdown-content h6 {
            margin: 1.5em 0 1em;
            line-height: 1.3;
          }

          .markdown-content h1:first-child,
          .markdown-content h2:first-child,
          .markdown-content h3:first-child {
            margin-top: 0;
          }

          .markdown-content ul,
          .markdown-content ol {
            margin: 1em 0;
            padding-left: 2em;
          }

          .markdown-content li {
            margin: 0.5em 0;
            padding-left: 0.5em;
          }

          .markdown-content ol {
            list-style-type: decimal;
          }

          .markdown-content ul {
            list-style-type: disc;
          }

          .markdown-content pre {
            margin: 0;
            padding: 0.1rem;
            border-radius: 0.3rem;
            background-color: transparent;
            overflow-x: auto;
          }

          .markdown-content code {
            font-family: 'Fira Code', monospace;
            font-size: 0.9em;
            line-height: 1.5;
            padding: 0;
            border-radius: 3px;
            background-color: transparent;
          }

          .markdown-content blockquote {
            margin: 1em 0;
            padding: 0.5em 1em;
            border-left: 4px solid var(--p);
            background-color: var(--b2);
            border-radius: 0 0.3rem 0.3rem 0;
          }

          .markdown-content img {
            max-width: 100%;
            margin: 1em 0;
            border-radius: 0.3rem;
          }

          .markdown-content table {
            margin: 1em 0;
            border-collapse: collapse;
            width: 100%;
          }

          .markdown-content th,
          .markdown-content td {
            padding: 0.5em;
            border: 1px solid var(--b3);
          }

          .markdown-content th {
            background-color: var(--b2);
            font-weight: bold;
          }

          .markdown-content a {
            color: var(--p);
            text-decoration: none;
          }

          .markdown-content a:hover {
            text-decoration: underline;
          }

          .markdown-content .inline-code {
            background-color: var(--b2);
            padding: 2px 4px;
            margin: 0 2px;
            border-radius: 4px;
            border: 1px solid var(--b3);
            white-space: nowrap;
          }

          .markdown-content .code-block {
            position: relative;
            margin: 1rem 0;
            background-color: transparent;
            border-radius: 0.5rem;
            overflow: hidden;
          }

          .markdown-content .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 1rem;
            background-color: var(--b3);
            border-bottom: 1px solid var(--b4);
          }

          .markdown-content .language-label {
            font-size: 0.875rem;
            color: var(--bc);
            opacity: 0.7;
            font-family: 'Fira Code', monospace;
          }

          .markdown-content .copy-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0.75rem;
            font-size: 0.875rem;
            color: var(--bc);
            background-color: var(--b2);
            border: 1px solid var(--b4);
            border-radius: 0.25rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .markdown-content .copy-button:hover {
            background-color: var(--b3);
            transform: translateY(-1px);
          }

          .markdown-content .copy-button:active {
            transform: translateY(0);
          }

          .markdown-content .copy-button .icon {
            width: 1rem;
            height: 1rem;
          }

          .markdown-content .code-content {
            margin: 0;
            padding: 0;
            background-color: transparent;
          }

          .markdown-content .code-content pre {
            margin: 0 !important;
            padding: 1rem !important;
            background-color: transparent !important;
          }

          .markdown-content .math {
            overflow-x: auto;
            padding: 0.5rem 0;
          }

          .markdown-content .math-display {
            display: block;
            overflow-x: auto;
            padding: 1.5rem 1rem;
            text-align: center;
            background: var(--b2);
            border-radius: 0.5rem;
            border: 1px solid var(--b3);
            margin: 1.5rem 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .markdown-content .math-inline {
            padding: 0.1rem 0.3rem;
            display: inline-flex;
            align-items: center;
            background: var(--b2);
            border-radius: 0.25rem;
            border: 1px solid var(--b3);
            margin: 0 0.2rem;
          }

          .markdown-content .katex-display {
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0.5rem 0;
            margin: 0.5rem 0;
            -webkit-overflow-scrolling: touch;
          }

          .markdown-content .katex {
            font-size: 1.1em;
            font-family: 'KaTeX_Math', 'Times New Roman', serif;
            line-height: 1.2;
          }

          .markdown-content .katex-display > .katex {
            display: inline-block;
            white-space: nowrap;
            max-width: 100%;
            overflow-x: auto;
            text-align: initial;
            padding: 0.5rem 0;
          }

          .markdown-content .katex-display::-webkit-scrollbar {
            height: 4px;
          }

          .markdown-content .katex-display::-webkit-scrollbar-track {
            background: var(--b2);
            border-radius: 2px;
          }

          .markdown-content .katex-display::-webkit-scrollbar-thumb {
            background: var(--b3);
            border-radius: 2px;
          }

          .markdown-content .katex-display::-webkit-scrollbar-thumb:hover {
            background: var(--b4);
          }

          .markdown-content .katex-error {
            color: var(--error);
            background: var(--error-content);
            padding: 0.5rem;
            border-radius: 0.25rem;
            margin: 0.5rem 0;
            font-family: monospace;
            white-space: pre-wrap;
          }

          .markdown-content .image-wrapper {
            position: relative;
            display: inline-block;
            max-width: 100%;
            margin: 1rem 0;
            border-radius: 0.5rem;
            overflow: hidden;
            background: var(--b2);
            border: 1px solid var(--b3);
            cursor: zoom-in;
            transition: all 0.2s ease;
          }

          .markdown-content .image-wrapper:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .markdown-content .image-loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--b2);
            z-index: 1;
            gap: 0.5rem;
            padding: 1rem;
            border-radius: 0.5rem;
          }

          .markdown-content .image-loading .icon {
            width: 24px;
            height: 24px;
            stroke: var(--p);
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          .markdown-content .image-loading .text {
            font-size: 0.875rem;
            color: var(--bc);
            opacity: 0.7;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          .markdown-content .image-error {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100px;
            padding: 1rem;
            background: var(--b2);
            border: 1px dashed var(--b3);
            border-radius: 0.5rem;
            color: var(--bc);
          }

          .markdown-content .image-error-icon {
            margin-bottom: 0.5rem;
            color: var(--error);
          }

          .markdown-content .image-error-text {
            font-size: 0.875rem;
            text-align: center;
            max-width: 200px;
          }

          .markdown-content .image-error-retry {
            margin-top: 0.5rem;
            padding: 0.25rem 0.75rem;
            font-size: 0.875rem;
            color: var(--bc);
            background: var(--b3);
            border: none;
            border-radius: 0.25rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .markdown-content .image-error-retry:hover {
            background: var(--b4);
          }

          .table-container {
            margin: 1rem 0;
            background: var(--b1);
            border-radius: 0.5rem;
            border: 1px solid var(--b3);
            overflow: hidden;
          }

          .table-toolbar {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            background: var(--b2);
            border-bottom: 1px solid var(--b3);
          }

          .search-wrapper {
            position: relative;
            flex: 1;
            max-width: 300px;
          }

          .search-icon {
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--bc);
            opacity: 0.5;
          }

          .search-input {
            width: 100%;
            padding: 0.5rem 0.75rem 0.5rem 2.25rem;
            border: 1px solid var(--b3);
            border-radius: 0.25rem;
            background: var(--b1);
            color: var(--bc);
            font-size: 0.875rem;
            transition: all 0.2s ease;
          }

          .search-input:focus {
            outline: none;
            border-color: var(--p);
            box-shadow: 0 0 0 2px var(--p-focus);
          }

          .table-responsive {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .enhanced-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }

          .enhanced-table th {
            background: var(--b2);
            padding: 0.75rem 1rem;
            font-weight: 600;
            color: var(--bc);
            border-bottom: 1px solid var(--b3);
            white-space: nowrap;
          }

          .enhanced-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--b3);
            transition: background-color 0.2s ease;
          }

          .enhanced-table tbody tr:hover {
            background-color: var(--b2);
          }

          .sortable-header {
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s ease;
          }

          .sortable-header:hover {
            background-color: var(--b3);
          }

          .header-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .sort-indicator {
            display: inline-flex;
            align-items: center;
            opacity: 0.5;
            transition: opacity 0.2s ease;
          }

          .sorting .sort-indicator {
            opacity: 1;
            color: var(--p);
          }

          .no-results {
            padding: 2rem;
            text-align: center;
            color: var(--bc);
            font-size: 0.875rem;
            opacity: 0.7;
          }

          @media (max-width: 640px) {
            .enhanced-table {
              font-size: 0.875rem;
            }

            .enhanced-table th,
            .enhanced-table td {
              padding: 0.5rem 0.75rem;
            }

            .table-toolbar {
              flex-direction: column;
              gap: 0.5rem;
            }

            .search-wrapper {
              max-width: 100%;
            }
          }
        `}
      </style>

      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // 代码块渲染
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            const [isCopied, setIsCopied] = useState(false);
            
            if (inline) {
              const content = String(children).trim();
              // 检查是否是带序号和反引号的标题格式
              if (/^\d+\.\s+`.+`.*$/.test(content)) {
                return <span>{content.replace(/`/g, '')}</span>;
              }
              
              // 如果内容不包含代码特征，则不使用代码样式
              if (
                // 如果是包名或技术名称（允许 @ - / . 字符）
                /^[@a-zA-Z][\w\-\/.]*$/.test(content) ||
                // 或者是多个单词（允许空格分隔的单词）
                /^[\w\-\./\s]+$/.test(content)
              ) {
                return <span>{content}</span>;
              }
              // 如果包含代码关键字，使用代码样式
              if (content.includes('function') ||
                  content.includes('return') ||
                  content.includes('const') ||
                  content.includes('let') ||
                  content.includes('var') ||
                  content.includes('import') ||
                  content.includes('export') ||
                  content.includes('class') ||
                  content.includes('=>')) {
                return (
                  <code className="inline-code" {...props}>
                    {content}
                  </code>
                );
              }
              // 如果包含代码特征字符（除了 - . /），保持代码块格式
              if (/[{}[\]()=+*<>!|&;$]/.test(content)) {
                return (
                  <code className="inline-code" {...props}>
                    {content}
                  </code>
                );
              }
              // 其他情况不使用代码样式
              return <span>{content}</span>;
            }

            const language = match ? match[1].toLowerCase() : '';
            const displayLanguage = languageNameMap[language] || language.toUpperCase() || 'TEXT';

            const handleCopy = async () => {
              const code = String(children).replace(/\n$/, '');
              await navigator.clipboard.writeText(code);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            };

            return (
              <div className="code-block">
                <div className="code-header">
                  <span className="language-label">{displayLanguage}</span>
                  <button
                    className="copy-button"
                    onClick={handleCopy}
                    aria-label={isCopied ? "已复制" : "复制代码"}
                  >
                    {isCopied ? (
                      <>
                        <CheckIcon className="icon" />
                        已复制
                      </>
                    ) : (
                      <>
                        <CopyIcon className="icon" />
                        复制
                      </>
                    )}
                  </button>
                </div>
                <div className="code-content">
                  <SyntaxHighlighter
                    language={language}
                    style={{
                      ...oneDark,
                      'pre[class*="language-"]': {
                        ...oneDark['pre[class*="language-"]'],
                        background: 'transparent',
                      },
                      'code[class*="language-"]': {
                        ...oneDark['code[class*="language-"]'],
                        background: 'transparent',
                      }
                    }}
                    showLineNumbers={true}
                    wrapLines={true}
                    customStyle={{
                      margin: 0,
                      background: 'transparent',
                      padding: '1rem',
                    }}
                    lineNumberStyle={{
                      minWidth: '2.5em',
                      paddingRight: '1em',
                      color: 'var(--bc)',
                      opacity: 0.3,
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          },

          // 链接渲染
          a({node, children, href, ...props}) {
            return (
              <a
                href={href}
                className="text-primary hover:text-primary-focus"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLinkClick(href);
                }}
                onContextMenu={handleContextMenu}
                {...props}
              >
                {children}
              </a>
            );
          },

          // 段落渲染
          p({node, children, ...props}) {
            // 检查是否包含树形结构特殊字符
            const containsTreeStructure = contentHasTreeStructure(children);
            
            if (containsTreeStructure) {
              return (
                <TreeView>
                  <p {...props} 
                    data-selectable="true" 
                    onContextMenu={handleContextMenu}
                  >
                    {children}
                  </p>
                </TreeView>
              );
            }
            
            const styles = { 
              userSelect: 'text',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: '0.5em 0',
            };
            
            return (
              <p {...props} data-selectable="true" style={styles} onContextMenu={handleContextMenu}>
                {children}
              </p>
            );
          },

          // 列表项渲染
          li({node, children, ...props}) {
            // 检查是否包含树形结构特殊字符
            const containsTreeStructure = contentHasTreeStructure(children);
            
            if (containsTreeStructure) {
              return (
                <li {...props} 
                  data-selectable="true" 
                  style={treeViewStyles.container}
                  onContextMenu={handleContextMenu}
                >
                  {children}
                </li>
              );
            }
            
            return (
              <li {...props} 
                data-selectable="true" 
                style={{ userSelect: 'text' }} 
                onContextMenu={handleContextMenu}
              >
                {children}
              </li>
            );
          },

          // 添加有序列表组件
          ol: ({node, ...props}) => (
            <ol className="list-decimal pl-6 my-4" {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),

          // 添加无序列表组件
          ul: ({node, children, ...props}) => {
            const containsTreeStructure = contentHasTreeStructure(children);
            
            if (containsTreeStructure) {
              return (
                <TreeView>
                  <ul className="tree-view-list" {...props} 
                    data-selectable="true" 
                    onContextMenu={handleContextMenu} 
                  >
                    {children}
                  </ul>
                </TreeView>
              );
            }
            
            return (
              <ul className="list-disc pl-6 my-4" {...props} 
                data-selectable="true" 
                style={{ userSelect: 'text' }} 
                onContextMenu={handleContextMenu} 
              >
                {children}
              </ul>
            );
          },

          // 标题渲染
          h1: ({node, ...props}) => (
            <h1 {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),
          h2: ({node, ...props}) => (
            <h2 {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),
          h3: ({node, ...props}) => (
            <h3 {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),
          h4: ({node, ...props}) => (
            <h4 {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),
          h5: ({node, ...props}) => (
            <h5 {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),
          h6: ({node, ...props}) => (
            <h6 {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),

          // 其他内联元素
          strong: ({node, ...props}) => (
            <strong {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),
          em: ({node, ...props}) => (
            <em {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),
          del: ({node, ...props}) => (
            <del {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),
          blockquote: ({node, ...props}) => (
            <blockquote {...props} data-selectable="true" style={{ userSelect: 'text' }} onContextMenu={handleContextMenu} />
          ),

          // 表格相关组件
          table: TableWrapper,
          thead: ({node, children, ...props}) => (
            <thead {...props}>{children}</thead>
          ),
          tbody: ({node, children, ...props}) => (
            <tbody {...props}>{children}</tbody>
          ),
          tr: ({node, children, ...props}) => (
            <tr {...props}>{children}</tr>
          ),
          th: ({node, children, ...props}) => (
            <th {...props}>{children}</th>
          ),
          td: ({node, children, ...props}) => (
            <td {...props}>{children}</td>
          ),
          img: ({node, src, alt, ...props}) => {
            const [isLoading, setIsLoading] = useState(true);
            const [error, setError] = useState(false);

            return (
              <div className="image-wrapper">
                {isLoading && !error && (
                  <div className="image-loading">
                    <svg className="icon" viewBox="0 0 24 24" fill="none">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path d="M9 9l.01 0" />
                      <path d="M15 9l.01 0" />
                      <path d="M8 13h8a4 4 0 01-8 0z" />
                    </svg>
                    <span className="text">加载图片中...</span>
                  </div>
                )}
                <img
                  src={src}
                  alt={alt}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setError(true);
                  }}
                  style={{
                    display: isLoading ? 'none' : 'block',
                    maxWidth: '100%',
                    height: 'auto'
                  }}
                  {...props}
                />
                {error && (
                  <div className="image-error">
                    <svg className="icon" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text">图片加载失败</span>
                  </div>
                )}
              </div>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>

      {/* 图片预览 Lightbox */}
      <Lightbox
        open={openLightbox}
        close={() => setOpenLightbox(false)}
        index={lightboxIndex}
        slides={images}
        plugins={[Zoom, Thumbnails, Captions]}
        animation={{ fade: 300 }}
        carousel={{ finite: images.length <= 1 }}
        render={{
          iconPrev: () => <ChevronLeftIcon size={24} />,
          iconNext: () => <ChevronRightIcon size={24} />,
          iconClose: () => <XIcon size={24} />
        }}
        zoom={{
          maxZoomPixelRatio: 5,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          doubleClickMaxStops: 2,
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true
        }}
        captions={{
          showToggle: true,
          descriptionTextAlign: 'center',
          descriptionMaxLines: 3,
        }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在内容或紧凑模式改变时重新渲染
  return (
    prevProps.content === nextProps.content &&
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.className === nextProps.className
  );
});

export default MarkdownRenderer; 