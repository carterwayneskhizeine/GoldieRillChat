import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CheckIcon, CopyIcon, ImageIcon, Loader2Icon, XIcon, ArrowUpDown, Search, ChevronUp, ChevronDown, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
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
    textAlign: 'left'
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
    white-space: pre !important;
    line-height: 1.5;
    letter-spacing: 0;
    overflow: visible;
    font-size: 0.9rem;
    text-align: left;
    padding: 1em;
    background-color: var(--b2);
    border-radius: 0.5rem;
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
    white-space: pre !important;
  }
  .tree-view code {
    font-family: inherit !important;
    background: none !important;
    padding: 0 !important;
    white-space: pre !important;
    display: block;
  }
  .tree-view pre {
    white-space: pre !important;
    font-family: inherit !important;
    background: none !important;
    border: none !important;
    margin: 0 !important;
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
  
  // 检查是否包含树形结构符号
  const hasTreeSymbols = text.includes('┌─') || 
                         text.includes('├─') || 
                         text.includes('└─') || 
                         text.includes('│') ||
                         /^\s*[├└┬┼│]/.test(text);
  
  // 检查是否有缩进的行，以数字或项目符号开头，表示树形结构
  const hasIndentedList = /^\s+[1-9]\d*\.\s/.test(text) || 
                         /^\s+[•◦▪▫-]\s/.test(text);
  
  // 检查是否有类似树形结构的行模式
  // 例如：
  // ├─ 条目1
  //    ├─ 子条目1
  //    └─ 子条目2
  const lines = text.split('\n');
  if (lines.length > 2) {
    let hasPattern = false;
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i].trim();
      const nextLine = lines[i + 1].trim();
      if ((currentLine.startsWith('├─') || currentLine.startsWith('└─')) && 
          (nextLine.startsWith('   ├─') || nextLine.startsWith('   └─'))) {
        hasPattern = true;
        break;
      }
    }
    if (hasPattern) return true;
  }
  
  return hasTreeSymbols || hasIndentedList;
};

// 检查内容是否包含树形结构
const contentHasTreeStructure = (children) => {
  const childrenArray = React.Children.toArray(children);
  return childrenArray.some(child => 
    typeof child === 'string' && hasTreeStructure(child)
  );
};

// 格式化树形结构文本
const formatTreeStructure = (text) => {
  if (typeof text !== 'string') return text;
  
  // 将文本按行分割
  const lines = text.split('\n');
  
  // 处理带有树形结构的行
  const formattedLines = lines.map(line => {
    // 保留原始的缩进
    const leadingSpaces = line.match(/^\s*/)[0];
    const trimmedLine = line.trimStart();
    
    // 检查是否是树形结构行或数字列表项
    if (
      // 树形结构符号
      trimmedLine.startsWith('├─') || 
      trimmedLine.startsWith('└─') || 
      trimmedLine.startsWith('│') ||
      /^[├└┬┼│]/.test(trimmedLine) ||
      // 数字列表项，如 "1. 标题"
      /^\d+\.\s/.test(trimmedLine)
    ) {
      // 为了确保缩进正确，我们保持原始格式
      return line;
    }
    
    return line;
  });
  
  // 用```包裹整个文本，以确保它作为一个代码块渲染
  // 这样可以保持原始的空格和缩进
  return "```\n" + formattedLines.join('\n') + "\n```";
};

// 修改 useProcessedContent 函数
const useProcessedContent = (content) => {
  return useMemo(() => {
    // 不再在预处理阶段处理内联代码，而是依赖 rehype 插件
    // 只进行其他必要的处理
    
    // 匹配以数字和右括号开头的行，将其转换为标准的 Markdown 有序列表格式
    let processed = content.replace(/^(\d+)\)(.+)$/gm, '$1.$2');

    // 处理带有反引号的序号标题格式
    processed = processed.replace(/^(#+\s*\d+\.\s+)`([^`]+)`(.*)$/gm, '$1$2$3');
    processed = processed.replace(/^(\d+\.\s+)`([^`]+)`(.*)$/gm, '$1$2$3');

    // 保持缩进和换行，但不影响代码块
    // 不再使用 processed = processed.replace(/\n/g, '  \n');
    processed = processed.replace(/^(#{1,6}\s.*)/gm, '\n$1\n');
    processed = processed.replace(/^([*-]|\d+\.)\s/gm, '\n$&');
    
    // 添加对图片引用的处理
    processed = processed.replace(/\[图片(\d+)\]/g, (match, num) => {
      return `![图片${num}][图片引用${num}]`;
    });

    return processed;
  }, [content]);
};

// 使用 React.memo 包装 MarkdownRenderer 组件
export const MarkdownRenderer = React.memo(({
  content = '',
  isCompact = false,
  className = '',
  onCopyCode = () => {},
  onLinkClick = () => {},
  searchImages = []
}) => {
  const [processedContent, setProcessedContent] = useState(content);
  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [imagesToShow, setImagesToShow] = useState([...searchImages]);
  const [hasScrollIndicator, setHasScrollIndicator] = useState(false);
  const codeBlockRef = useRef(null);
  const [isTableOverflowing, setIsTableOverflowing] = useState(false);
  const [codeCopyTooltip, setCodeCopyTooltip] = useState({});

  // 处理content中的内容，包括处理树形结构和图片引用
  useEffect(() => {
    let newContent = content;
    
    // 处理file://路径转换为本地可访问的路径
    if (newContent.includes('file://')) {
      // 使用正则表达式找出所有Markdown格式的图片链接
      const imgRegex = /!\[(.*?)\]\((file:\/\/[^)]+)\)/g;
      let match;
      const existingImages = imagesToShow || [];
      let newImages = [];
      let hasNewImages = false;
      
      // 收集所有file://开头的图片URL
      while ((match = imgRegex.exec(newContent)) !== null) {
        const [fullMatch, altText, imgUrl] = match;
        
        // 规范化Windows文件路径
        let normalizedPath = imgUrl.replace('file://', '');
        
        // 替换所有的反斜杠为正斜杠
        normalizedPath = normalizedPath.replace(/\\/g, '/');
        
        // 确保路径格式正确
        if (!normalizedPath.startsWith('/') && normalizedPath.includes(':')) {
          // Windows路径 (C:/path)，添加额外的斜杠
          normalizedPath = '/' + normalizedPath;
        }
        
        // 将处理后的路径添加到local-file://协议
        const localFileUrl = `local-file://${normalizedPath}`;
        
        // 检查这个图片是否已经在列表中
        if (!existingImages.some(img => (img.src === localFileUrl || img.url === localFileUrl))) {
          newImages.push({
            src: localFileUrl,
            title: altText || '搜索图片'
          });
          hasNewImages = true;
        }
      }
      
      // 只有当有新图片时才更新状态
      if (hasNewImages) {
        setImagesToShow(prev => [...prev, ...newImages]);
      }
    }
    
    // 处理树形结构
    if (hasTreeStructure(newContent)) {
      newContent = formatTreeStructure(newContent);
    }
    
    setProcessedContent(newContent);
  }, [content]); // 只依赖于content变化
  
  // 确保searchImages数组中的所有图片都有src属性
  useEffect(() => {
    if (searchImages && searchImages.length > 0) {
      // 将searchImages中的数据标准化，确保每个图片对象都有src属性
      const normalizedImages = searchImages.map(img => ({
        ...img,
        src: img.src || img.url,
        title: img.title || img.description || '搜索图片'
      }));
      
      setImagesToShow(normalizedImages);
    }
  }, [searchImages]);

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
    setImagesToShow(collectedImages);
  }, [content, collectImages]);

  // 使用 useCallback 优化上下文菜单处理
  const handleContextMenu = useCallback((e) => {
    // 在bg-theme模式下，允许默认右键菜单显示
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'bg-theme') {
      return; // 不阻止默认行为，允许原生右键菜单显示
    }
    
    // 其他主题下继续使用自定义右键菜单
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

  // 支持图片引用的图片集合
  const imageReferences = useMemo(() => {
    const references = {};
    // 为每个searchImage创建图片引用
    searchImages.forEach((img, index) => {
      references[`图片引用${index + 1}`] = img.url;
    });
    return references;
  }, [searchImages]);

  // 使用 useMemo 缓存 remarkPlugins 配置
  const remarkPlugins = useMemo(() => [
    remarkGfm,
    [remarkMath, { singleDollar: true }],
    remarkBreaks
  ], []);

  // 添加一个自定义 rehype 插件，用于处理内联代码
  const rehypeInlineCodeAsText = useCallback(() => {
    return (tree) => {
      visit(tree, 'element', (node) => {
        // 找到所有内联代码元素
        if (node.tagName === 'code' && 
            node.properties && 
            !node.properties.className) {  // 内联代码没有 className
          
          // 将 code 元素替换为 span 元素
          node.tagName = 'span';
          
          // 移除所有可能的代码样式
          if (node.properties) {
            delete node.properties.className;
            node.properties.style = 'font-family: inherit; background: none; padding: 0; margin: 0; border: none; color: inherit;';
          }
        }
      });
    };
  }, []);

  // 修改 rehypePlugins 配置
  const rehypePlugins = useMemo(() => [
    rehypeRaw,
    rehypeInlineCodeAsText,  // 添加自定义插件
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
  ], [rehypeInlineCodeAsText]);

  // 将 createMarkdownComponents 移到组件内部
  const markdownComponents = useMemo(() => {
    return {
      // 链接渲染
      a: ({node, children, href, className, ...props}) => {
        // 处理脚注引用链接
        if (className?.includes('footnote-ref')) {
          return (
            <a
              href={href}
              className="footnote-ref"
              {...props}
              data-selectable="true"
              onClick={(e) => {
                e.preventDefault();
                // 平滑滚动到脚注位置
                const id = href.substring(1); // 移除 # 符号
                const element = document.getElementById(id);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            >
              {children}
            </a>
          );
        }

        // 处理脚注返回链接
        if (className?.includes('footnote-backref')) {
          return (
            <a
              href={href}
              className="footnote-backref"
              {...props}
              data-selectable="true"
              onClick={(e) => {
                e.preventDefault();
                // 平滑滚动回引用位置
                const id = href.substring(1); // 移除 # 符号
                const element = document.getElementById(id);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            >
              ↩ 返回
            </a>
          );
        }

        // 处理普通URL链接
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
              {children}
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
        
        // 检查是否有子元素需要特殊处理
        const processedChildren = React.Children.map(children, child => {
          // 如果子元素是一个带有classname的React元素
          if (React.isValidElement(child) && 
              child.props && 
              child.props.className === 'inline-text-block') {
            // 将其转换为行内元素，确保正确显示
            return <span className="inline-text-in-paragraph">{child.props.children}</span>;
          }
          return child;
        });
        
        return (
          <p {...props} data-selectable="true" style={styles} onContextMenu={handleContextMenu}>
            {processedChildren}
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
      li: ({node, className, children, id, ...props}) => {
        // 检查是否是脚注项
        if (id?.startsWith('fn-')) {
          return (
            <li 
              {...props}
              id={id}
              className={`footnote-item ${className || ''}`}
              style={{
                marginBottom: '0.5rem',
                lineHeight: '1.6',
                position: 'relative',
                paddingLeft: '1.5rem'
              }}
              data-selectable="true"
              onContextMenu={handleContextMenu}
            >
              {children}
            </li>
          );
        }
        
        // 检查是否包含树形结构特殊字符
        const containsTreeStructure = contentHasTreeStructure(children);
        
        if (containsTreeStructure) {
          return (
            <li {...props} 
              className={className}
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
            className={className}
            data-selectable="true" 
            style={{ userSelect: 'text' }} 
            onContextMenu={handleContextMenu}
          >
            {children}
          </li>
        );
      },
      // 代码块渲染
      code: ({node, inline, className, children, ...props}) => {
        const match = /language-(\w+)/.exec(className || '');
        const [isCopied, setIsCopied] = useState(false);
        
        // 内联代码处理
        if (inline) {
          // 直接返回纯文本
          return <span>{children}</span>;
        }
        
        // 以下是代码块处理逻辑（三个反引号包围）- 保持不变
        const codeContent = String(children).replace(/\n$/, '');
        
        // 检查是否包含树形结构，如果是，使用特殊的树形渲染
        if (hasTreeStructure(codeContent)) {
          return (
            <TreeView>
              <pre>
                <code className="tree-structure-code">{codeContent}</code>
              </pre>
            </TreeView>
          );
        }
        
        // 特殊情况：单行中文内容或技术名称，作为文本渲染
        if (!codeContent.includes('\n') && 
            (
              // 纯中文内容
              /^[\u4e00-\u9fa5]+$/.test(codeContent) || 
              // 包含中文的内容且不包含代码特征字符
              (/[\u4e00-\u9fa5]/.test(codeContent) && !/[{}[\]()=+*<>!|&;$]/.test(codeContent)) ||
              // 简单技术名称，如：axios, react 等（排除CODE/code特殊关键字）
              (/^[@a-zA-Z][\w\-\/.]*$/.test(codeContent) && !['CODE', 'code'].includes(codeContent)) ||
              // 简单词汇
              /^[\w\-\./\s]+$/.test(codeContent)
            )
        ) {
          return <span className="inline-text-block">{codeContent}</span>;
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
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="icon" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="code-content">
              <pre style={{
                margin: 0,
                padding: '1rem',
                whiteSpace: 'pre',
                overflowX: 'auto',
                backgroundColor: 'var(--b2)',
                borderRadius: '0 0 0.5rem 0.5rem',
                fontFamily: 'monospace',
              }}>
                <code className={className} style={{
                  fontFamily: 'monospace',
                  whiteSpace: 'pre',
                  wordWrap: 'normal',
                  wordBreak: 'normal',
                }}>
                  {String(children)}
                </code>
              </pre>
            </div>
          </div>
        );
      },
    };
  }, [handleContextMenu, onLinkClick, imagesToShow, setLightboxIndex, setOpenLightbox, imageReferences]);

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

  // 处理Lightbox显示的图片
  const processLightboxSlides = useMemo(() => {
    return imagesToShow.map(img => {
      // 创建新对象避免修改原始对象
      const processedImg = { ...img };
      
      // 如果是本地图片，需要特殊处理
      if (img.src && img.src.startsWith('local-file://')) {
        let localPath = img.src.replace('local-file://', '');
        
        // 解码URL编码的路径
        try {
          localPath = decodeURIComponent(localPath);
        } catch (e) {
          console.error('解码路径失败:', e);
        }
        
        // 路径标准化
        localPath = localPath.replace(/\\/g, '/');
        
        // 检查是否在Electron环境中
        const isElectron = window.electron || window.electronAPI || typeof openFileLocation === 'function';
        
        if (isElectron) {
          // 在Electron环境中，使用file://协议
          processedImg.src = `file://${localPath}`;
        } else {
          // 在浏览器环境中，暂时保持原协议，但可能需要备用方案
          processedImg.src = `local-file://${localPath}`;
          
          // 添加标记，表示这是本地文件，可能无法在浏览器中显示
          processedImg.isLocalFile = true;
        }
      }
      
      return processedImg;
    });
  }, [imagesToShow]);
  
  // 处理Lightbox中图片加载错误
  const handleSlideError = (e, slide) => {
    console.error('Lightbox图片加载错误:', slide);
    
    // 如果是本地文件
    if (slide.isLocalFile || (slide.src && (slide.src.startsWith('file://') || slide.src.startsWith('local-file://')))) {
      console.log('本地文件加载失败:', slide.src);
      
      // 显示错误消息
      e.target.onerror = null; // 防止无限循环
      e.target.src = ''; // 清除源
      e.target.alt = '无法显示本地文件 - 此功能仅在桌面应用中可用';
      
      // 如果父元素存在，添加一个错误覆盖层
      const containerElement = e.target.closest('.yarl__slide_image') || e.target.parentNode;
      if (containerElement) {
        // 检查是否已经有错误覆盖层
        let overlay = containerElement.querySelector('.local-file-error-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'local-file-error-overlay';
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.display = 'flex';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
          overlay.style.color = 'white';
          overlay.style.padding = '20px';
          overlay.style.textAlign = 'center';
          overlay.style.zIndex = '10';
          overlay.style.fontWeight = 'bold';
          overlay.style.fontSize = '16px';
          overlay.innerHTML = `
            <div>
              <p style="margin-bottom: 10px;">⚠️ 无法显示本地文件</p>
              <p style="font-size: 14px; opacity: 0.8;">此功能仅在桌面应用程序中可用</p>
              <button 
                style="
                  margin-top: 15px; 
                  padding: 8px 15px; 
                  background-color: #4a4a4a; 
                  border: none; 
                  border-radius: 4px; 
                  color: white; 
                  cursor: pointer;
                  font-size: 14px;
                "
                class="error-close-button"
              >
                关闭查看器
              </button>
            </div>
          `;
          
          containerElement.appendChild(overlay);
          
          // 添加关闭按钮点击事件
          setTimeout(() => {
            const closeButton = overlay.querySelector('.error-close-button');
            if (closeButton) {
              closeButton.addEventListener('click', () => {
                close(); // 关闭Lightbox
              });
            }
          }, 100);
        }
      }
      
      // 尝试直接在默认程序中打开图片
      if (window.electron && typeof window.electron.openFileLocation === 'function') {
        try {
          // 提取本地路径
          let localPath = '';
          if (slide.src.startsWith('file://')) {
            localPath = slide.src.replace('file://', '');
          } else if (slide.src.startsWith('local-file://')) {
            localPath = slide.src.replace('local-file://', '');
          }
          
          // 解码路径
          try {
            localPath = decodeURIComponent(localPath);
          } catch (error) {
            console.error('解码图片路径失败:', error);
          }
          
          // 在覆盖层中添加打开按钮
          const containerElement = e.target.closest('.yarl__slide_image') || e.target.parentNode;
          if (containerElement) {
            const overlay = containerElement.querySelector('.local-file-error-overlay');
            if (overlay) {
              const openButton = document.createElement('button');
              openButton.style.marginTop = '10px';
              openButton.style.padding = '8px 15px';
              openButton.style.backgroundColor = '#2563eb';
              openButton.style.border = 'none';
              openButton.style.borderRadius = '4px';
              openButton.style.color = 'white';
              openButton.style.cursor = 'pointer';
              openButton.style.marginLeft = '10px';
              openButton.style.fontSize = '14px';
              openButton.textContent = '在文件夹中显示';
              openButton.onclick = (event) => {
                event.stopPropagation();
                window.electron.openFileLocation(localPath);
              };
              
              const buttonContainer = overlay.querySelector('div');
              if (buttonContainer) {
                const closeButton = buttonContainer.querySelector('.error-close-button');
                if (closeButton) {
                  closeButton.parentNode.insertBefore(openButton, closeButton.nextSibling);
                } else {
                  buttonContainer.appendChild(openButton);
                }
              }
            }
          }
        } catch (error) {
          console.error('尝试打开文件失败:', error);
        }
      }
    }
  };

  return (
    <div 
      className={`markdown-content ${className} select-text`} 
      onContextMenu={handleContextMenu}
      style={{ userSelect: 'text' }}
    >
      <style>
        {`
          /* 确保内联代码不应用任何代码样式 */
          .markdown-content span {
            font-family: inherit !important;
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            color: inherit !important;
            font-size: inherit !important;
            white-space: normal !important;
          }
          
          /* 确保代码块正确显示 */
          .markdown-content .code-block {
            margin: 1rem 0;
            border-radius: 0.5rem;
            overflow: hidden;
            background-color: var(--b2);
            border: 1px solid var(--b3);
          }
          
          .markdown-content .code-content {
            overflow-x: auto;
            position: relative;
          }
          
          .markdown-content pre {
            margin: 0 !important;
            padding: 1rem !important;
            white-space: pre !important;
            overflow-x: auto !important;
            word-wrap: normal !important;
            word-break: normal !important;
          }
          
          .markdown-content code {
            font-family: 'Fira Code', monospace !important;
            white-space: pre !important;
            word-wrap: normal !important;
            word-break: normal !important;
          }
          
          /* 修复行号和代码对齐 */
          .markdown-content .linenumber {
            display: inline-block !important;
            min-width: 2.5em !important;
            padding-right: 1em !important;
            text-align: right !important;
            user-select: none !important;
          }
          
          /* 调整代码块标题栏样式 */
          .markdown-content .code-header {
            display: flex;
            justify-content: space-between; /* 左右两端对齐 */
            align-items: center;
            padding: 0.5rem 1rem;
            background-color: var(--b3);
            border-bottom: 1px solid var(--b4);
            border-radius: 0.5rem 0.5rem 0 0;
          }
          
          .markdown-content .language-label {
            font-size: 0.875rem;
            color: var(--bc);
            opacity: 0.7;
            font-family: 'Fira Code', monospace;
            flex-grow: 1; /* 占据剩余空间 */
          }
          
          .markdown-content .copy-button {
            display: inline-flex;
            align-items: center;
            justify-content: center; /* 确保内容居中 */
            gap: 0.5rem;
            padding: 0.25rem 0.75rem;
            min-width: 80px; /* 设置最小宽度 */
            font-size: 0.875rem;
            color: var(--bc);
            background-color: var(--b2);
            border: 1px solid var(--b4);
            border-radius: 0.25rem;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-left: auto; /* 确保靠右对齐 */
            overflow: visible; /* 确保内容不会被截断 */
            white-space: nowrap; /* 防止文本换行 */
          }
          
          .markdown-content .copy-button .icon {
            width: 1rem;
            height: 1rem;
            flex-shrink: 0; /* 防止图标缩小 */
          }
        `}
      </style>

      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>

      {/* 图片预览 Lightbox */}
      <Lightbox
        open={openLightbox}
        close={() => setOpenLightbox(false)}
        index={lightboxIndex}
        slides={processLightboxSlides}
        controller={{ closeOnBackdropClick: true }}
        carousel={{
          finite: processLightboxSlides.length <= 5,
          preload: 1,
        }}
        animation={{ fade: 300 }}
        plugins={[Zoom, Thumbnails, Captions]}
        zoom={{
          maxZoomPixelRatio: 5,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
        }}
        toolbar={{
          buttons: [
            'close',
          ],
        }}
        on={{
          error: handleSlideError,
        }}
        render={{
          iconPrev: () => <ChevronLeftIcon size={24} />,
          iconNext: () => <ChevronRightIcon size={24} />,
          iconClose: () => <XIcon size={24} />,
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