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
  // 预处理内容，修复有序列表格式
  const processContent = (text) => {
    // 匹配以数字和右括号开头的行，将其转换为标准的 Markdown 有序列表格式
    return text.replace(/^(\d+)\)(.+)$/gm, '$1.$2');
  };

  return (
    <div className={`markdown-content ${className}`}>
      <style>
        {`
          .markdown-content {
            font-size: ${isCompact ? '0.9em' : '1em'};
            line-height: 1.6;
          }

          .markdown-content pre {
            margin: 0.5rem 0;
            border-radius: 0.3rem;
            background-color: var(--b2);
          }

          .markdown-content code {
            font-family: 'Fira Code', monospace;
            font-size: 0.9em;
            line-height: 1.5;
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

          .markdown-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
          }

          .markdown-content th,
          .markdown-content td {
            border: 1px solid var(--b3);
            padding: 0.5rem;
          }

          .markdown-content th {
            background-color: var(--b2);
          }

          .markdown-content a {
            color: var(--p);
            text-decoration: none;
          }

          .markdown-content a:hover {
            text-decoration: underline;
          }

          .markdown-content img {
            max-width: 100%;
            border-radius: 0.3rem;
          }

          .markdown-content blockquote {
            border-left: 4px solid var(--p);
            margin: 1rem 0;
            padding-left: 1rem;
            color: var(--bc);
          }

          .markdown-content ul,
          .markdown-content ol {
            padding-left: 1.5rem;
          }

          .markdown-content .math {
            overflow-x: auto;
            padding: 0.5rem 0;
          }
        `}
      </style>

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw, rehypeSanitize]}
        components={{
          // 代码块渲染
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (inline) {
              return (
                <code
                  className={className}
                  style={{
                    backgroundColor: 'var(--b2)',
                    padding: '2px 4px',
                    margin: '0 4px',
                    borderRadius: '4px',
                    border: '1px solid var(--b3)',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="code-block">
                <div className="code-header">
                  <span className="text-sm opacity-50">
                    {language ? `<${language.toUpperCase()}>` : 'CODE'}
                  </span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      const code = String(children).replace(/\n$/, '');
                      navigator.clipboard.writeText(code);
                      onCopyCode(code);
                    }}
                  >
                    复制
                  </button>
                </div>
                <div className="code-content">
                  <pre {...props}>
                    <code className={className}>
                      {children}
                    </code>
                  </pre>
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
                <table className="table table-zebra w-full" {...props}>
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
        {processContent(content)}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 