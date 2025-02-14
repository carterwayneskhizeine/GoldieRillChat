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
            margin: 1em 0;
            padding: 1em;
            border-radius: 0.3rem;
            background-color: var(--b2);
            overflow-x: auto;
          }

          .markdown-content code {
            font-family: 'Fira Code', monospace;
            font-size: 0.9em;
            line-height: 1.5;
            padding: 0.2em 0.4em;
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
          }

          .markdown-content .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--b3);
            padding: 0.5rem 1rem;
            border-top-left-radius: 0.3rem;
            border-top-right-radius: 0.3rem;
          }

          .markdown-content .code-content {
            padding: 1rem;
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
            top: 0.5rem;
            z-index: 50;
            pointer-events: auto;
          }

          .copy-button {
            background-color: var(--b2);
            border: 1px solid var(--b3);
            padding: 0.25rem 0.5rem;
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
        `}
      </style>

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw, 
          rehypeSanitize,
          [rehypeKatex, { strict: false }]  // 设置 strict: false 来禁用警告
        ]}
        components={{
          // 代码块渲染
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            
            if (inline) {
              return (
                <code
                  className="inline-code"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const language = match ? match[1] : '';

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

          // 数学公式块
          math({node, ...props}) {
            return (
              <div className="math overflow-x-auto py-2" {...props} />
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