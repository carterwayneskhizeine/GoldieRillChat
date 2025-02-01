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

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* 编辑器部分 */}
      <div className="w-1/2 h-full overflow-auto bg-base-200 p-4">
        <CodeMirror
          value={markdownContent}
          height="100%"
          extensions={[markdown()]}
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
      <div className="w-1/2 h-full overflow-auto bg-base-100 p-4 prose prose-invert max-w-none">
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
            }
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}; 