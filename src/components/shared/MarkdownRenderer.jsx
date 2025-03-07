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
    
    // 添加对图片引用的处理，格式如[图片1]、[图片2]等
    // 将简单的图片引用转换为Markdown图片语法
    processed = processed.replace(/\[图片(\d+)\]/g, (match, num) => {
      // 图片引用会在组件级别通过传入的images数组处理
      return `![图片${num}][图片引用${num}]`;
    });

    return processed;
  }, [content]);
};

// 将 markdownComponents 移到组件外部
const createMarkdownComponents = (handleContextMenu, onLinkClick, images, setLightboxIndex, setOpenLightbox, imageReferences) => ({
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
  // ... rest of the components ...
});

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

  // 创建markdown组件集合
  const markdownComponents = useMemo(() => 
    createMarkdownComponents(
      handleContextMenu, 
      onLinkClick, 
      imagesToShow, 
      setLightboxIndex, 
      setOpenLightbox,
      imageReferences
    ), 
  [handleContextMenu, onLinkClick, imagesToShow, imageReferences]);

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
        
        console.log('处理Lightbox图片路径:', processedImg.src);
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

          /* 脚注样式 */
          .markdown-content .footnotes {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid var(--b3);
            font-size: 0.9em;
          }

          .markdown-content .footnotes ol {
            padding-left: 1.5rem;
          }

          .markdown-content .footnote-ref {
            font-size: 0.75em;
            vertical-align: super;
            line-height: 0;
            background-color: var(--b2);
            padding: 1px 4px;
            border-radius: 4px;
            color: var(--p);
            font-weight: bold;
            text-decoration: none;
          }

          .markdown-content .footnote-ref:hover {
            text-decoration: underline;
          }

          .markdown-content .footnote-backref {
            display: inline-block;
            margin-left: 0.5rem;
            font-weight: bold;
            color: var(--p);
            text-decoration: none;
          }

          .markdown-content .footnote-backref:hover {
            text-decoration: underline;
          }

          .markdown-content .footnote-item {
            margin-bottom: 0.5rem;
            position: relative;
            padding-left: 1.5rem;
          }

          .markdown-content .footnote-item p {
            display: inline;
            margin: 0;
          }

          .markdown-content a.footnote-backref {
            font-size: 0.85em;
          }

          /* 图片包装器样式 */
          .image-wrapper {
            position: relative;
            margin: 1rem 0;
            display: inline-block;
            max-width: 100%;
          }

          .image-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background-color: var(--b2);
            border-radius: 0.5rem;
            min-width: 200px;
            min-height: 100px;
          }

          .image-loading .text {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: var(--bc);
            opacity: 0.7;
          }

          .image-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background-color: var(--b2);
            border-radius: 0.5rem;
            border: 1px dashed var(--error);
            min-width: 200px;
            min-height: 100px;
          }

          .image-error .text {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: var(--error);
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
          li({node, className, children, id, ...props}) {
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
          img: ({node, src, alt, width, height, title, ...props}) => {
            const [isLoading, setIsLoading] = useState(true);
            const [error, setError] = useState(false);
            
            // 检查是否是图片引用
            if (src && src.startsWith('![图片') && imageReferences) {
              // 从alt中提取引用编号
              const refMatch = alt && alt.match(/图片(\d+)/);
              if (refMatch) {
                const refKey = `图片引用${refMatch[1]}`;
                const refSrc = imageReferences[refKey];
                
                if (refSrc) {
                  // 将引用替换为实际URL
                  src = refSrc;
                }
              }
            }
            
            // 如果是本地文件路径，添加前缀
            if (src && src.startsWith('local-file://')) {
              return (
                <div className="image-wrapper">
                  {isLoading && !error && (
                    <div className="image-loading">
                      <div className="loading loading-spinner loading-sm"></div>
                      <span className="text">加载图片中...</span>
                    </div>
                  )}
                  <img
                    src={src}
                    alt={alt || ''}
                    title={title || alt || ''}
                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      const index = imagesToShow.findIndex((img) => img.src === src);
                      if (index !== -1) {
                        setLightboxIndex(index);
                        setOpenLightbox(true);
                      }
                    }}
                    style={{ 
                      maxHeight: '300px', 
                      objectFit: 'contain',
                      display: isLoading ? 'none' : 'block' 
                    }}
                    loading="lazy"
                    onLoad={() => setIsLoading(false)}
                    onError={(e) => {
                      console.log("图片加载错误:", src);
                      setIsLoading(false);
                      setError(true);
                    }}
                    {...props}
                  />
                  {error && (
                    <div className="image-error">
                      <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text">图片加载失败</span>
                    </div>
                  )}
                </div>
              );
            }
            
            // 处理 file:// 协议的链接
            if (src && src.startsWith('file://')) {
              // 规范化Windows文件路径
              let normalizedPath = src.replace('file://', '');
              
              // 替换所有的反斜杠为正斜杠
              normalizedPath = normalizedPath.replace(/\\/g, '/');
              
              // 确保路径格式正确
              if (!normalizedPath.startsWith('/') && normalizedPath.includes(':')) {
                // Windows路径 (C:/path)，添加额外的斜杠
                normalizedPath = '/' + normalizedPath;
              }
              
              // 将处理后的路径添加到local-file://协议
              const localFileSrc = `local-file://${normalizedPath}`;
              
              return (
                <div className="image-wrapper">
                  {isLoading && !error && (
                    <div className="image-loading">
                      <div className="loading loading-spinner loading-sm"></div>
                      <span className="text">加载图片中...</span>
                    </div>
                  )}
                  <img
                    src={localFileSrc}
                    alt={alt || ''}
                    title={title || alt || ''}
                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      // 添加到可查看的图片中
                      if (imagesToShow.findIndex(img => img.src === localFileSrc) === -1) {
                        const newImageIndex = imagesToShow.length;
                        imagesToShow.push({ src: localFileSrc, title: title || alt || '' });
                        setLightboxIndex(newImageIndex);
                      } else {
                        const index = imagesToShow.findIndex(img => img.src === localFileSrc);
                        setLightboxIndex(index);
                      }
                      setOpenLightbox(true);
                    }}
                    style={{ 
                      maxHeight: '300px', 
                      objectFit: 'contain',
                      display: isLoading ? 'none' : 'block' 
                    }}
                    loading="lazy"
                    onLoad={() => setIsLoading(false)}
                    onError={(e) => {
                      console.log("图片加载错误:", src);
                      setIsLoading(false);
                      setError(true);
                    }}
                    {...props}
                  />
                  {error && (
                    <div className="image-error">
                      <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text">图片加载失败</span>
                    </div>
                  )}
                </div>
              );
            }
            
            // 外部图片URL
            return (
              <div className="image-wrapper">
                {isLoading && !error && (
                  <div className="image-loading">
                    <div className="loading loading-spinner loading-sm"></div>
                    <span className="text">加载图片中...</span>
                  </div>
                )}
                <img
                  src={src}
                  alt={alt || ''}
                  title={title || alt || ''}
                  className="max-w-full rounded-lg"
                  style={{ 
                    maxHeight: '300px', 
                    objectFit: 'contain',
                    display: isLoading ? 'none' : 'block' 
                  }}
                  loading="lazy"
                  onLoad={() => setIsLoading(false)}
                  onError={(e) => {
                    setIsLoading(false);
                    setError(true);
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTMgMTNoLTJWN2gydjZabTAgNGgtMnYtMmgydjJabTktNVYxOEE1IDUgMCAwIDEgMTcgMjJINy4zM0ExMC42MSAxMC42MSAwIDAgMSAyIDEzLjQzQzIgOC4wNSA2LjA0IDQgMTAuNCA0YzIuMjUgMCA0LjI1Ljg2IDUuNiAyLjJMMTUuNTMgNUgyMXYzaC0zLjUzYTguNDYgOC40NiAwIDAgMSAtMi4zLTJBNi41MyA2LjUzIDAgMCAwIDEwLjRBNi41IDYuNSAwIDAgMCA0IDEzLjU5QzcuMDMgMTMuNjggOS43NiAxNiAxMCAxOWE4LjM4IDguMzggMCAwIDAgNC40LTMuMjNBNyA3IDAgMCAxIDIxIDEyWiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+';
                    e.target.style.padding = '30px';
                    e.target.style.backgroundColor = 'rgba(0,0,0,0.1)';
                  }}
                  {...props}
                />
                {error && (
                  <div className="image-error">
                    <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text">图片加载失败</span>
                  </div>
                )}
              </div>
            );
          },
          // 添加脚注参考的自定义组件
          sup: ({node, children, ...props}) => {
            // 检查是否是脚注的引用
            const isFootnoteRef = node?.children?.[0]?.tagName === 'a' && 
                                 node?.children?.[0]?.properties?.className?.includes('footnote-ref');
            
            if (isFootnoteRef) {
              return (
                <sup 
                  {...props} 
                  className="footnote-ref"
                  style={{
                    fontSize: '0.75em',
                    lineHeight: '0',
                    position: 'relative',
                    top: '-0.5em',
                    fontWeight: 'bold',
                    color: 'var(--p)',
                    cursor: 'pointer',
                    marginLeft: '2px',
                    marginRight: '2px',
                    textDecoration: 'none',
                    background: 'var(--b2)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                  }}
                  data-selectable="true"
                  onContextMenu={handleContextMenu}
                >
                  {children}
                </sup>
              );
            }
            
            return (
              <sup {...props} data-selectable="true" onContextMenu={handleContextMenu}>
                {children}
              </sup>
            );
          },
          // 添加脚注定义列表的自定义组件
          section: ({node, className, children, ...props}) => {
            // 检查是否是脚注部分
            if (className?.includes('footnotes')) {
              return (
                <section {...props} className={className} data-selectable="true" onContextMenu={handleContextMenu}>
                  {children}
                </section>
              );
            }
            
            return (
              <section {...props} className={className} data-selectable="true" onContextMenu={handleContextMenu}>
                {children}
              </section>
            );
          },
        }}
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