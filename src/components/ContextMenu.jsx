import React, { useEffect, useRef, useState } from 'react'

export function ContextMenu({ contextMenu, onClose, onDelete, onRename }) {
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});

  // 添加全局点击事件监听，当点击页面其它区域时隐藏上下文菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        onClose();
      }
    };
    
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible, onClose]);

  // 计算菜单位置
  useEffect(() => {
    if (contextMenu.visible && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      let x = contextMenu.x;
      let y = contextMenu.y;
      let transformOrigin = 'top left';

      // 检查右边界
      if (x + menuRect.width > windowWidth) {
        x = windowWidth - menuRect.width - 8;
      }

      // 检查底部边界
      if (y + menuRect.height > windowHeight) {
        y = y - menuRect.height;
        transformOrigin = 'bottom left';
      }

      setMenuStyle({
        left: `${x}px`,
        top: `${y}px`,
        transformOrigin
      });
    }
  }, [contextMenu.visible, contextMenu.x, contextMenu.y]);

  if (!contextMenu.visible) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    onClose();
  };

  const renderMenuItems = () => {
    if (contextMenu.options) {
      return contextMenu.options.map((option, index) => (
        <li key={index} className="context-menu-item">
          <a onClick={() => {
            option.onClick();
            onClose();
          }}>
            {option.label}
          </a>
        </li>
      ));
    }

    // 默认菜单项
    switch (contextMenu.type) {
      case 'chat':
        return (
          <>
            <li className="context-menu-item">
              <a onClick={() => { onDelete(contextMenu.data); onClose(); }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </a>
            </li>
            <li className="context-menu-item">
              <a onClick={() => { onRename(contextMenu.data); onClose(); }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </a>
            </li>
          </>
        );
      case 'text':
        return (
          <>
            <li className="context-menu-item">
              <a onClick={() => {
                if (contextMenu.data?.text) {
                  navigator.clipboard.writeText(contextMenu.data.text);
                }
                onClose();
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy
              </a>
            </li>
            <li className="context-menu-item">
              <a onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (contextMenu.data?.onPaste) {
                    contextMenu.data.onPaste(text);
                  }
                } catch (err) {
                  console.error('Failed to paste:', err);
                }
                onClose();
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Paste
              </a>
            </li>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={menuStyle}
      onClick={handleClick}
    >
      <style>
        {`
          .context-menu {
            min-width: 120px;
            max-width: 180px;
            padding: 4px;
            font-size: 0.8125rem;
            transform-origin: inherit;
            animation: scaleIn 0.15s ease-out;
            border: 1px solid var(--b3);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
          
          .context-menu-item > a {
            padding: 5px 10px;
            display: flex;
            align-items: center;
            border-radius: 4px;
            transition: all 0.2s;
            color: var(--bc);
            opacity: 0.9;
            margin: 1px 0;
          }
          
          .context-menu-item > a:hover {
            background-color: var(--b3);
            transform: translateX(2px);
            opacity: 1;
          }
          
          .context-menu-item > a:active {
            transform: translateX(2px) scale(0.98);
          }
          
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          .context-menu::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 8px;
            padding: 1px;
            background: linear-gradient(
              45deg,
              transparent 40%,
              rgba(68, 68, 68, 0.1) 45%,
              rgba(68, 68, 68, 0.2) 50%,
              rgba(68, 68, 68, 0.1) 55%,
              transparent 60%
            );
            mask: linear-gradient(#fff 0 0) content-box,
                  linear-gradient(#fff 0 0);
            -webkit-mask: linear-gradient(#fff 0 0) content-box,
                         linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
          }
        `}
      </style>
      <ul className="menu bg-base-200/80 rounded-lg shadow-lg context-menu">
        {renderMenuItems()}
      </ul>
    </div>
  );
} 