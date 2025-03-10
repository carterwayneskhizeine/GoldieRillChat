import React, { useState, useEffect } from 'react';
import '../styles/BookmarksPanel.css';

// 递归组件，用于渲染文件夹树
const FolderTree = ({ 
  folder, 
  folders, 
  bookmarks, 
  expandedFolders, 
  toggleFolder, 
  activeFolder, 
  setActiveFolder,
  searchTerm
}) => {
  // 获取当前文件夹的子文件夹
  const subfolders = folders.filter(f => f.parentId === folder.id);
  
  // 如果是搜索模式，只显示包含匹配书签的文件夹
  if (searchTerm) {
    // 查找当前文件夹和所有子文件夹中的书签是否有匹配的
    const hasMatchingBookmarks = (folderId) => {
      const folderBookmarks = bookmarks.filter(b => b.folder === folderId);
      if (folderBookmarks.some(b => 
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.url.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return true;
      }
      
      // 递归检查子文件夹
      const children = folders.filter(f => f.parentId === folderId);
      return children.some(child => hasMatchingBookmarks(child.id));
    };
    
    // 如果没有匹配的书签，不显示此文件夹
    if (!hasMatchingBookmarks(folder.id)) {
      return null;
    }
  }
  
  return (
    <div className="folder-tree-item">
      <div 
        className={`folder-item ${activeFolder === folder.id ? 'active' : ''}`}
        onClick={() => setActiveFolder(folder.id)}
      >
        <span 
          className="folder-toggle" 
          onClick={(e) => {
            e.stopPropagation();
            toggleFolder(folder.id);
          }}
        >
          {subfolders.length > 0 && (
            expandedFolders[folder.id] 
              ? <span style={{ fontSize: '10px', opacity: '0.8' }}>▼</span> 
              : <span style={{ fontSize: '10px', opacity: '0.8' }}>▶</span>
          )}
        </span>
        <span className="folder-name">
          <span>
            {folder.name}
          </span>
          <span>{bookmarks.filter(b => b.folder === folder.id).length}</span>
        </span>
      </div>
      
      {/* 显示子文件夹 */}
      {expandedFolders[folder.id] && subfolders.length > 0 && (
        <div className="subfolder-list">
          {subfolders.map(subfolder => (
            <FolderTree
              key={subfolder.id}
              folder={subfolder}
              folders={folders}
              bookmarks={bookmarks}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              activeFolder={activeFolder}
              setActiveFolder={setActiveFolder}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const BookmarksPanel = ({ onClose }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showAllBookmarks, setShowAllBookmarks] = useState(false);
  const [isCreatingDefaultFolder, setIsCreatingDefaultFolder] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 添加刷新键

  // 加载书签数据的函数
  const loadBookmarks = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setLoading(true);
      }
      
      console.log('加载书签数据...');
      
      // 获取所有书签数据和文件夹
      const allBookmarks = await window.electron.bookmarks.getBookmarks();
      const folders = await window.electron.bookmarks.getFolders();
      
      console.log(`获取到 ${allBookmarks.length} 个书签和 ${folders.length} 个文件夹`);
      
      // 确保有一个默认文件夹
      let rootFolder = folders.find(f => !f.parentId);
      if (!rootFolder && folders.length === 0 && !isCreatingDefaultFolder) {
        console.log('创建默认文件夹...');
        setIsCreatingDefaultFolder(true);
        
        // 创建默认文件夹
        const defaultFolderId = `folder_root_${Date.now()}`;
        const defaultFolder = {
          id: defaultFolderId,
          name: '我的书签',
          addDate: Date.now(),
          parentId: null
        };
        
        // 添加到文件夹列表
        const updatedFolders = [...folders, defaultFolder];
        
        // 更新书签，将没有文件夹的书签移动到默认文件夹
        const updatedBookmarks = allBookmarks.map(bookmark => {
          if (!bookmark.folder) {
            return { ...bookmark, folder: defaultFolderId };
          }
          return bookmark;
        });
        
        // 保存更新后的文件夹和书签
        try {
          await window.electron.bookmarks.importBookmarks(updatedBookmarks, updatedFolders);
          console.log('默认文件夹创建成功');
          
          // 更新状态
          setBookmarks(updatedBookmarks);
          setAllFolders(updatedFolders);
          
          // 设置默认选中的文件夹
          setActiveFolder(defaultFolderId);
          
          // 设置默认展开所有文件夹
          const initialExpanded = {};
          updatedFolders.forEach(folder => {
            initialExpanded[folder.id] = true;
          });
          setExpandedFolders(initialExpanded);
          
          // 重置创建标志
          setIsCreatingDefaultFolder(false);
        } catch (error) {
          console.error('创建默认文件夹失败:', error);
          setIsCreatingDefaultFolder(false);
        }
      } else {
        // 正常更新状态
        setBookmarks(allBookmarks);
        setAllFolders(folders);
        
        // 如果没有选中的文件夹，设置默认选中根文件夹
        if (!activeFolder && rootFolder) {
          setActiveFolder(rootFolder.id);
        }
        
        // 设置默认展开所有文件夹
        const initialExpanded = {};
        folders.forEach(folder => {
          initialExpanded[folder.id] = true;
        });
        setExpandedFolders(prev => ({...prev, ...initialExpanded}));
      }
      
      // 关闭加载状态
      setLoading(false);
    } catch (error) {
      console.error('加载书签失败:', error);
      setLoading(false);
      setIsCreatingDefaultFolder(false);
    }
  };

  // 初始加载
  useEffect(() => {
    console.log('BookmarksPanel 组件挂载，开始加载书签');
    loadBookmarks(true);
    
    // 清理函数
    return () => {
      console.log('BookmarksPanel 组件卸载');
    };
  }, [refreshKey]); // 使用 refreshKey 作为依赖项，允许强制刷新

  // 添加手动刷新函数
  const refreshBookmarks = () => {
    console.log('手动刷新书签');
    setRefreshKey(prev => prev + 1);
  };

  // 处理文件夹展开/折叠
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // 递归获取文件夹下的所有书签（包括子文件夹）
  const getAllBookmarksInFolder = (folderId) => {
    // 直接在当前文件夹中的书签
    const directBookmarks = bookmarks.filter(b => b.folder === folderId);
    
    // 获取所有子文件夹
    const subfolders = allFolders.filter(f => f.parentId === folderId);
    
    // 递归获取子文件夹中的书签
    const subfoldersBookmarks = subfolders.flatMap(subfolder => 
      getAllBookmarksInFolder(subfolder.id)
    );
    
    // 合并并返回所有书签
    return [...directBookmarks, ...subfoldersBookmarks];
  };

  // 获取当前展示的书签
  const getDisplayedBookmarks = () => {
    if (showAllBookmarks) {
      return bookmarks;
    }
    
    if (!activeFolder) {
      // 如果没有选中文件夹，返回所有没有文件夹的书签
      return bookmarks.filter(b => !b.folder);
    }
    
    // 获取当前文件夹及其所有子文件夹中的书签
    return getAllBookmarksInFolder(activeFolder);
  };

  // 过滤书签
  const filteredBookmarks = getDisplayedBookmarks().filter(bookmark => {
    if (!searchTerm) return true;
    
    return bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
           bookmark.url.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // 打开书签链接
  const openBookmark = (url) => {
    if (window.electron && window.electron.browser) {
      window.electron.browser.newTab(url);
      
      // 触发切换到浏览器工具事件
      const switchEvent = new CustomEvent('switchTool', {
        detail: { tool: 'browser' }
      });
      window.dispatchEvent(switchEvent);
      
      // 自动关闭书签面板
      if (onClose) {
        onClose();
      }
    } else {
      // 后备方案：在新窗口打开
      window.open(url, '_blank');
      
      // 自动关闭书签面板
      if (onClose) {
        onClose();
      }
    }
  };

  // 删除书签
  const deleteBookmark = async (id, e) => {
    e.stopPropagation(); // 阻止点击事件传播
    try {
      await window.electron.bookmarks.deleteBookmark(id);
      // 更新本地状态
      setBookmarks(bookmarks.filter(b => b.id !== id));
    } catch (error) {
      console.error('删除书签失败:', error);
    }
  };

  // 获取根文件夹
  const rootFolders = allFolders.filter(folder => !folder.parentId);

  // 如果没有根文件夹但有书签，显示一个提示
  const hasBookmarksNoFolders = bookmarks.length > 0 && rootFolders.length === 0;

  return (
    <div className="bookmarks-panel fixed inset-0 bg-base-100 z-50">
      <div className="bookmarks-header">      
        <div className="header-center">
          <button 
            className={`all-bookmarks-btn ${showAllBookmarks ? 'active' : ''}`}
            onClick={() => setShowAllBookmarks(!showAllBookmarks)}
          >
            所有书签
          </button>
          <button 
            className="refresh-btn" 
            onClick={refreshBookmarks}
            title="刷新书签列表"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
          <div className="search-container">
            <input
              type="text"
              placeholder="搜索书签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="bookmarks-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading loading-spinner loading-lg"></div>
            <p>正在加载书签...</p>
          </div>
        ) : (
          <div className="bookmarks-layout">
            {!showAllBookmarks && (
              <div className="folders-sidebar">
                <div className="folders-container">
                  {rootFolders.length > 0 ? (
                    rootFolders.map(folder => (
                      <FolderTree
                        key={folder.id}
                        folder={folder}
                        folders={allFolders}
                        bookmarks={bookmarks}
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                        activeFolder={activeFolder}
                        setActiveFolder={setActiveFolder}
                        searchTerm={searchTerm}
                      />
                    ))
                  ) : (
                    <div className="no-folders-message">
                      <p>没有书签文件夹</p>
                      {hasBookmarksNoFolders && (
                        <p className="text-sm opacity-70">您有 {bookmarks.length} 个未分类的书签</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="bookmarks-area">
              {/* 当前文件夹路径或标题 */}
              <div className="current-folder-path">
                {showAllBookmarks ? '所有书签' : (
                  activeFolder ? allFolders.find(f => f.id === activeFolder)?.name : '未分类书签'
                )}
                <span className="bookmark-count">({filteredBookmarks.length}个书签)</span>
              </div>
              
              {filteredBookmarks.length === 0 ? (
                <div className="empty-message">
                  {searchTerm ? '没有找到匹配的书签' : '此文件夹中没有书签'}
                </div>
              ) : (
                <div className="bookmark-grid">
                  {filteredBookmarks.map(bookmark => (
                    <div 
                      key={bookmark.id} 
                      className="bookmark-item"
                      onClick={() => openBookmark(bookmark.url)}
                      title={bookmark.url}
                    >
                      <img 
                        src={bookmark.icon || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMiIgeTE9IjEyIiB4Mj0iMjIiIHkyPSIxMiI+PC9saW5lPjxwYXRoIGQ9Ik0xMiAyYTE1LjMgMTUuMyAwIDAgMSA0IDEwIDE1LjMgMTUuMyAwIDAgMS00IDEwIDE1LjMgMTUuMyAwIDAgMS00LTEwIDE1LjMgMTUuMyAwIDAgMSA0LTEweiI+PC9wYXRoPjwvc3ZnPg=='} 
                        alt="" 
                        className="bookmark-icon"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMiIgeTE9IjEyIiB4Mj0iMjIiIHkyPSIxMiI+PC9saW5lPjxwYXRoIGQ9Ik0xMiAyYTE1LjMgMTUuMyAwIDAgMSA0IDEwIDE1LjMgMTUuMyAwIDAgMS00IDEwIDE1LjMgMTUuMyAwIDAgMS00LTEwIDE1LjMgMTUuMyAwIDAgMSA0LTEweiI+PC9wYXRoPjwvc3ZnPg==';
                        }}
                      />
                      <div className="bookmark-title">
                        {bookmark.title || '未命名书签'}
                      </div>
                      <button 
                        className="delete-bookmark" 
                        onClick={(e) => deleteBookmark(bookmark.id, e)}
                        title="删除书签"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarksPanel; 