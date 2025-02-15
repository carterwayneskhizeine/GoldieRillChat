import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CheckIcon, CopyIcon } from 'lucide-react';
import 'katex/dist/katex.min.css';

export const MarkdownRenderer = ({
  content,
  isCompact = false,
  className = '',
  onCopyCode = () => {},
  onLinkClick = () => {},
}) => {
  // 预处理内容，修复有序列表格式和代码块
  const processContent = (text) => {
    // 匹配以数字和右括号开头的行，将其转换为标准的 Markdown 有序列表格式
    let processed = text.replace(/^(\d+)\)(.+)$/gm, '$1.$2');

    // 处理带有反引号的序号标题格式
    processed = processed.replace(/^(#+\s*\d+\.\s+)`([^`]+)`(.*)$/gm, '$1$2$3');
    processed = processed.replace(/^(\d+\.\s+)`([^`]+)`(.*)$/gm, '$1$2$3');

    // 处理行内代码块，将非代码块的反引号去掉
    processed = processed.replace(/`([^`\n]+)`/g, (match, content) => {
      // 如果内容不包含代码特征，则去掉反引号
      if (
        // 如果是包名或技术名称（允许 @ - / . 字符）
        /^[@a-zA-Z][\w\-\/.]*$/.test(content) ||
        // 或者是多个单词（允许空格分隔的单词）
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

    // 确保标题前后有空行
    processed = processed.replace(/^(#{1,6}\s.*)/gm, '\n$1\n');

    // 确保列表项之间有正确的间距
    processed = processed.replace(/^([*-]|\d+\.)\s/gm, '\n$&');

    return processed;
  };

  const handleContextMenu = (e) => {
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
  };

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

  return (
    <div className={`markdown-content ${className}`} onContextMenu={handleContextMenu}>
      <style>
        {`
          .markdown-content {
            font-size: ${isCompact ? '0.9em' : '1em'};
            line-height: 1.6;
          }

          .markdown-content p {
            margin: 1em 0;
            white-space: pre-wrap;
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
            background-color: var(--b2);
            overflow-x: auto;
          }

          .markdown-content code {
            font-family: 'Fira Code', monospace;
            font-size: 0.9em;
            line-height: 1.5;
            padding: 0;
            border-radius: 3px;
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
            background-color: var(--b2);
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
        `}
      </style>

      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkMath, { singleDollar: true }],
          remarkBreaks
        ]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, {
            attributes: {
              '*': ['className', 'style'],
              'math': ['display', 'inline']
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
            minRuleThickness: 0.04,
            strict: (handler, style) => {
              if (style === 'display') {
                return false;
              }
              return true;
            }
          }]
        ]}
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
                    style={oneDark}
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

          // 表格渲染
          table({node, children, ...props}) {
            return (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full" {...props} onContextMenu={handleContextMenu}>
                  {children}
                </table>
              </div>
            );
          },

          // 图片渲染
          img({node, ...props}) {
            return (
              <img
                {...props}
                className="rounded-lg max-w-full"
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            );
          },

          // 数学公式块渲染
          math: ({node, inline, children, ...props}) => {
            const [error, setError] = useState(null);

            const handleError = (err) => {
              console.error('KaTeX error:', err);
              setError(err.message);
            };

            if (error) {
              return (
                <div className="katex-error">
                  Error rendering formula: {error}
                  <br />
                  Formula: {children}
                </div>
              );
            }

            return inline ? (
              <span className="math-inline" {...props}>
                {children}
              </span>
            ) : (
              <div className="math-display" {...props}>
                <div className="katex-wrapper">
                  {children}
                </div>
              </div>
            );
          },

          // 段落渲染
          p({node, children, ...props}) {
            return (
              <p {...props} onContextMenu={handleContextMenu}>
                {children}
              </p>
            );
          },

          // 列表项渲染
          li({node, children, ...props}) {
            return (
              <li {...props} onContextMenu={handleContextMenu}>
                {children}
              </li>
            );
          },

          // 添加有序列表组件
          ol: ({node, ...props}) => (
            <ol className="list-decimal pl-6 my-4" {...props} onContextMenu={handleContextMenu} />
          ),

          // 添加无序列表组件
          ul: ({node, ...props}) => (
            <ul className="list-disc pl-6 my-4" {...props} onContextMenu={handleContextMenu} />
          ),
        }}
      >
        {processContent(content)}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 