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
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'katex/dist/katex.min.css';
import '../../styles/table.css';

// 添加语言名称映射
const languageNameMap = {
  js: 'JavaScript',
  jsx: 'React JSX',
  ts: 'TypeScript',
  tsx: 'React TSX',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  json: 'JSON',
  md: 'Markdown',
  yaml: 'YAML',
  yml: 'YAML',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Bash',
  py: 'Python',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  cs: 'C#',
  go: 'Go',
  rs: 'Rust',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
  dart: 'Dart',
  r: 'R',
  matlab: 'MATLAB',
  scala: 'Scala',
  perl: 'Perl',
  lua: 'Lua',
  xml: 'XML',
  graphql: 'GraphQL',
  dockerfile: 'Dockerfile',
  docker: 'Docker',
  nginx: 'Nginx',
  apache: 'Apache',
  powershell: 'PowerShell',
  plaintext: '纯文本'
};

// 预定义的 remarkPlugins 和 rehypePlugins 配置
const remarkPluginsConfig = [remarkGfm, remarkMath, remarkBreaks];
const rehypePluginsConfig = [rehypeKatex, rehypeRaw, rehypeSanitize];

// 添加 processContent 函数
const processContent = (content) => {
  if (!content) return '';
  
  // 处理有序列表的格式
  content = content.replace(/^(\d+)\.\s/gm, '$1\\. ');
  
  // 处理行内代码的格式
  content = content.replace(/`([^`]+)`/g, (match, code) => {
    return `\`${code.trim()}\``;
  });
  
  // 处理代码块的格式
  content = content.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
    return `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``;
  });
  
  // 处理数学公式的格式
  content = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    return `$$${formula.trim()}$$`;
  });
  
  content = content.replace(/\$([\s\S]+?)\$/g, (match, formula) => {
    return `$${formula.trim()}$`;
  });
  
  return content;
};

// 添加 TableWrapper 组件
const TableWrapper = React.memo(({ children }) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const tableRef = useRef(null);
  const searchInputRef = useRef(null);

  // 检测表格是否溢出
  useEffect(() => {
    const checkOverflow = () => {
      if (tableRef.current) {
        const { scrollWidth, clientWidth } = tableRef.current;
        setIsOverflowing(scrollWidth > clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, []);

  // 处理搜索
  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    if (tableRef.current) {
      const table = tableRef.current;
      const searchText = e.target.value.toLowerCase();
      const rows = table.querySelectorAll('tbody tr');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchText) ? '' : 'none';
      });
    }
  }, []);

  // 处理搜索快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'f' && isOverflowing) {
        e.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
        if (tableRef.current) {
          const rows = tableRef.current.querySelectorAll('tbody tr');
          rows.forEach(row => {
            row.style.display = '';
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOverflowing, isSearchOpen]);

  return (
    <div className="table-container">
      {isOverflowing && (
        <div className="table-toolbar">
          <div className="search-wrapper">
            <Search className="search-icon w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="搜索表格内容..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>
      )}
      <div className="table-responsive" ref={tableRef}>
        <table className="enhanced-table">
          {children}
        </table>
      </div>
    </div>
  );
});

export const MarkdownRenderer = React.memo(({
  content,
  isCompact = false,
  className = '',
  onCopyCode = () => {},
  onLinkClick = () => {},
}) => {
  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [images, setImages] = useState([]);

  // 使用 useCallback 优化复制功能
  const handleCopySelectedText = useCallback((e) => {
    if (e.ctrlKey && e.key === 'c') {
      const selectedText = window.getSelection().toString();
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
      }
    }
  }, []);

  // 使用 useCallback 优化图片收集
  const collectImages = useCallback((content) => {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = [...content.matchAll(imgRegex)];
    return matches.map(match => ({
      src: match[2],
      alt: match[1],
      title: match[1]
    }));
  }, []);

  // 使用 useMemo 缓存处理后的内容
  const processedContent = useMemo(() => {
    return processContent(content);
  }, [content]);

  // 使用 useEffect 优化事件监听
  useEffect(() => {
    document.addEventListener('keydown', handleCopySelectedText);
    return () => {
      document.removeEventListener('keydown', handleCopySelectedText);
    };
  }, [handleCopySelectedText]);

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

  // 使用 useMemo 缓存 Markdown 组件配置
  const markdownComponents = useMemo(() => ({
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const displayName = languageNameMap[language] || language;

      if (inline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }

      return (
        <div className="relative group">
          {language && (
            <div className="absolute right-2 top-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">{displayName}</span>
              <button
                onClick={() => onCopyCode(String(children))}
                className="hidden group-hover:flex items-center gap-1 px-2 py-1 text-xs rounded bg-base-300 hover:bg-base-200 transition-colors"
              >
                <CopyIcon className="w-3 h-3" />
                复制
              </button>
            </div>
          )}
          <SyntaxHighlighter
            style={oneDark}
            language={language}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    },
    table: TableWrapper,
    a: ({ node, href, children, ...props }) => (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          onLinkClick(href);
        }}
        className="link link-primary"
        {...props}
      >
        {children}
      </a>
    ),
  }), [onCopyCode, onLinkClick]);

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
            align-items: center;
            justify-content: center;
            background: var(--b2);
            z-index: 1;
          }

          .markdown-content .image-loading .spinner {
            animation: spin 1s linear infinite;
            color: var(--p);
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

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
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
        remarkPlugins={remarkPluginsConfig}
        rehypePlugins={rehypePluginsConfig}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>

      <Lightbox
        open={openLightbox}
        close={() => setOpenLightbox(false)}
        index={lightboxIndex}
        slides={images}
        plugins={[Zoom, Thumbnails]}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在内容真正改变时重新渲染
  return (
    prevProps.content === nextProps.content &&
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.className === nextProps.className
  );
});

export default MarkdownRenderer; 