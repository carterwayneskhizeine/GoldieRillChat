import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const MarkdownEditor = () => {
  const [markdownContent, setMarkdownContent] = useState('# Welcome to Markdown Editor\n\nStart typing...');

  // 处理链接点击，在新窗口打开
  const handleLinkClick = (href) => {
    if (href) {
      // 使用window.open打开新窗口，设置窗口大小和位置
      const width = 800;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      window.open(
        href,
        '_blank',
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`
      );
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* 编辑器部分 */}
      <div className="w-1/2 h-full overflow-auto bg-base-200 p-4">
        <CodeMirror
          value={markdownContent}
          height="100%"
          extensions={[
            markdown(),
            EditorView.lineWrapping
          ]}
          onChange={(value) => setMarkdownContent(value)}
          theme="dark"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: true,
          }}
        />
      </div>

      {/* 预览部分 */}
      <div className="w-1/2 h-full overflow-auto bg-base-100 p-4 prose prose-invert prose-headings:font-bold max-w-none">
        <style>
          {`
            .prose h1 {
              font-size: 2.5em !important;
              margin-top: 0.5em !important;
              margin-bottom: 0.5em !important;
            }
            .prose h2 {
              font-size: 2em !important;
              margin-top: 0.5em !important;
              margin-bottom: 0.5em !important;
            }
            .prose h3 {
              font-size: 1.75em !important;
            }
            .prose h4 {
              font-size: 1.5em !important;
            }
            .prose h5 {
              font-size: 1.25em !important;
            }
            .prose h6 {
              font-size: 1.1em !important;
            }
            .prose a {
              cursor: pointer;
              color: #3b82f6 !important;
              text-decoration: none !important;
            }
            .prose a:hover {
              text-decoration: underline !important;
            }
          `}
        </style>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, inline, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            a({node, href, children, ...props}) {
              return (
                <a
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(href);
                  }}
                  {...props}
                >
                  {children}
                </a>
              );
            }
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}; 