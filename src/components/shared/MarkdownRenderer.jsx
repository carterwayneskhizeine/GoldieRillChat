import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
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
            margin: 0;
          }

          .markdown-content .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--b3);
            padding: 0.2rem 0.5rem;
            border-top-left-radius: 0.3rem;
            border-top-right-radius: 0.3rem;
          }

          .markdown-content .code-content {
            padding: 0.3rem;
            overflow-x: auto;
            background-color: var(--b2);
            border-bottom-left-radius: 0.3rem;
            border-bottom-right-radius: 0.3rem;
          }

          .markdown-content .math {
            overflow-x: auto;
            padding: 0.5rem 0;
          }

          .copy-button-wrapper {
            position: absolute;
            right: 0.5rem;
            top: 0.2rem;
            z-index: 50;
            pointer-events: auto;
          }

          .copy-button {
            background-color: var(--b2);
            border: 1px solid var(--b3);
            padding: 0.1rem 0.3rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            line-height: 1rem;
            cursor: pointer;
            transition: all 0.2s;
          }

          .copy-button:hover {
            background-color: var(--b3);
            transform: translateY(-1px);
          }

          .copy-button:active {
            transform: translateY(0);
          }

          /* 添加数学公式样式 */
          .math-display {
            display: block;
            overflow-x: auto;
            padding: 1rem 0;
            text-align: center;
          }

          .math-inline {
            padding: 0 0.2rem;
            display: inline-block;
          }

          /* 确保 KaTeX 公式能够正确滚动 */
          .katex-display {
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0.5rem 0;
            margin: 0.5rem 0;
          }

          .katex {
            font-size: 1.1em;
          }

          /* 处理长公式 */
          .katex-display > .katex {
            display: inline-block;
            white-space: nowrap;
            max-width: 100%;
            overflow-x: auto;
            text-align: initial;
          }

          /* 确保公式块有合适的背景和边框 */
          .math-display {
            background: var(--b2);
            border-radius: 0.3rem;
            border: 1px solid var(--b3);
            margin: 1rem 0;
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
            macros: {
              "\\d": "\\mathrm{d}",
              "\\partial": "\\partial"
            }
          }]
        ]}
        components={{
          // 代码块渲染
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            
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
              // 如果包含代码特征字符（除了 - . /），使用代码样式
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

            const language = match ? match[1] : '';
            // 定义支持的编程语言列表
            const supportedLanguages = [
              'python', 'javascript', 'java', 'cpp', 'csharp', 'ruby', 'php',
              'swift', 'go', 'rust', 'kotlin', 'typescript', 'scala', 'sql',
              'lua', 'perl', 'r', 'nodejs', 'dart', 'rails', 'erlang',
              'haskell', 'scala', 'golang', 'c', 'css', 'html', 'xml', 'yaml',
              'json', 'markdown', 'bash', 'shell', 'powershell'
            ];

            // 如果没有指定语言或者语言不在支持列表中，就当作普通文本处理
            if (!language || !supportedLanguages.includes(language.toLowerCase())) {
              return (
                <div className="whitespace-pre-wrap text-current">
                  {children}
                </div>
              );
            }

            const handleCopy = () => {
              const code = String(children).replace(/\n$/, '');
              navigator.clipboard.writeText(code).then(() => {
                // 复制成功后显示提示
                const button = document.activeElement;
                const originalText = button.textContent;
                button.textContent = '已复制';
                setTimeout(() => {
                  button.textContent = originalText;
                }, 1000);
              });
            };

            return (
              <div className="relative">
                <div className="copy-button-wrapper">
                  <button
                    className="copy-button"
                    onClick={handleCopy}
                  >
                    复制
                  </button>
                </div>
                <div className="code-block">
                  <div className="code-header">
                    <span className="text-sm opacity-50">
                      {language ? `<${language.toUpperCase()}>` : 'CODE'}
                    </span>
                  </div>
                  <div className="code-content">
                    <pre {...props} className={`language-${language} rounded-lg`} onContextMenu={handleContextMenu}>
                      <code className={className}>
                        {children}
                      </code>
                    </pre>
                  </div>
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
            return inline ? (
              <span className="math-inline" {...props}>{children}</span>
            ) : (
              <div className="math-display" {...props}>{children}</div>
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