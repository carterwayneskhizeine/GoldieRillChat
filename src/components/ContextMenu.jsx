import React, { useEffect } from 'react'

export function ContextMenu({ contextMenu, onClose, onDelete, onRename, onCopy, onPaste, selectedElement }) {
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

  if (!contextMenu.visible) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    onClose();
  };

  const renderMenuItems = () => {
    if (contextMenu.options) {
      return contextMenu.options.map((option, index) => (
        <li key={index}>
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
            <li><a onClick={() => { onDelete(contextMenu.data); onClose(); }}>Delete</a></li>
            <li><a onClick={() => { onRename(contextMenu.data); onClose(); }}>Rename</a></li>
          </>
        );
      case 'code':
        return (
          <>
            <li><a onClick={() => { onCopy(); onClose(); }}>Copy</a></li>
            <li><a onClick={() => { onPaste(); onClose(); }}>Paste</a></li>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed z-50"
      style={{
        left: contextMenu.x,
        top: contextMenu.y
      }}
      onClick={handleClick}
    >
      <ul className="menu bg-base-200 w-56 rounded-box shadow-lg">
        {renderMenuItems()}
      </ul>
    </div>
  );
} 