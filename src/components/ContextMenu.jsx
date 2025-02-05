import React, { useEffect } from 'react'

export const ContextMenu = ({
  contextMenu,
  onClose,
  onDelete,
  onRename,
  onCopy,
  onPaste,
  selectedElement
}) => {
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

  if (!contextMenu.visible) return null

  return (
    <div
      className="fixed z-[100]"
      style={{
        top: `${contextMenu.y}px`,
        left: `${contextMenu.x}px`
      }}
      onContextMenu={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.type === 'chat' ? (
        <ul className="menu menu-horizontal bg-base-200 rounded-box shadow-lg">
          <li>
            <button
              className="text-left px-4 py-2 hover:bg-base-300"
              onClick={() => {
                onDelete(contextMenu.data)
                onClose()
              }}
            >
              Delete
            </button>
          </li>
          <li>
            <button
              className="text-left px-4 py-2 hover:bg-base-300"
              onClick={() => {
                onRename(contextMenu.data)
                onClose()
              }}
            >
              Rename
            </button>
          </li>
        </ul>
      ) : (
        <ul className={`menu ${selectedElement?.closest('textarea') ? 'menu-horizontal' : ''} bg-base-200 ${selectedElement?.closest('textarea') ? '' : 'w-56'} rounded-box shadow-lg`}>
          <li>
            <button
              className="w-full text-left px-4 py-2 hover:bg-base-300"
              onClick={(e) => {
                e.stopPropagation()
                onCopy()
              }}
            >
              Copy
            </button>
          </li>
          <li>
            <button
              className="w-full text-left px-4 py-2 hover:bg-base-300"
              onClick={(e) => {
                e.stopPropagation()
                onPaste()
              }}
            >
              Paste
            </button>
          </li>
        </ul>
      )}
    </div>
  )
} 