import React, { useState } from 'react';
import { Bookmark, BookmarkFolder, useBookmarkStore } from '../../stores/bookmarkStore';
import { parseBookmarksFromFile } from '../../utils/bookmarkParser';

interface BookmarkItemProps {
  bookmark: Bookmark;
  onNavigate: (url: string) => void;
}

// 单个书签项
const BookmarkItem: React.FC<BookmarkItemProps> = ({ bookmark, onNavigate }) => {
  return (
    <div
      className="flex items-center p-2 hover:bg-base-300 rounded-md cursor-pointer"
      onClick={() => onNavigate(bookmark.url)}
      title={bookmark.url}
    >
      <div className="avatar">
        <div className="w-6 h-6 rounded-full">
          {bookmark.icon ? (
            <img src={bookmark.icon} alt={bookmark.title} />
          ) : (
            <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full text-xs">
              {bookmark.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <span className="ml-2 truncate">{bookmark.title}</span>
    </div>
  );
};

interface BookmarkFolderViewProps {
  folder: BookmarkFolder;
  bookmarks: Bookmark[];
  onNavigate: (url: string) => void;
}

// 文件夹视图组件
const BookmarkFolderView: React.FC<BookmarkFolderViewProps> = ({
  folder,
  bookmarks,
  onNavigate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // 筛选当前文件夹下的书签
  const folderBookmarks = bookmarks.filter((b) => b.folder === folder.id);

  return (
    <div className="collapse collapse-arrow bg-base-200 rounded-box mb-2">
      <input
        type="checkbox"
        checked={isExpanded}
        onChange={() => setIsExpanded(!isExpanded)}
      />
      <div className="collapse-title font-medium">{folder.name}</div>
      <div className="collapse-content">
        <div className="grid grid-cols-1 gap-1">
          {folderBookmarks.map((bookmark) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              onNavigate={onNavigate}
            />
          ))}
          {folderBookmarks.length === 0 && (
            <div className="text-sm text-base-content/50 p-2">此文件夹为空</div>
          )}
        </div>
      </div>
    </div>
  );
};

interface BookmarkPanelProps {
  onNavigate: (url: string) => void;
}

// 主书签面板
const BookmarkPanel: React.FC<BookmarkPanelProps> = ({ onNavigate }) => {
  const {
    bookmarks,
    folders,
    importBookmarks,
    addBookmark,
  } = useBookmarkStore();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 处理当前页面添加书签
  const handleAddCurrentPage = (title: string, url: string, icon: string | null) => {
    addBookmark({
      id: '',
      title,
      url,
      icon,
      addDate: Date.now(),
    });
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  // 处理导入
  const handleImport = async () => {
    if (!importFile) {
      setErrorMessage('请选择一个书签文件');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { bookmarks: newBookmarks, folders: newFolders } = await parseBookmarksFromFile(importFile);
      importBookmarks(newBookmarks, newFolders);
      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error) {
      setErrorMessage((error as Error).message || '导入失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 显示根文件夹
  const rootFolders = folders.filter(f => !f.parentId);

  return (
    <div className="p-2 h-full overflow-y-auto">
      {/* 书签工具栏 */}
      <div className="navbar bg-base-300 rounded-box mb-2">
        <div className="flex-1">
          <span className="text-lg font-bold px-2">书签</span>
        </div>
        <div className="flex-none">
          <button
            className="btn btn-ghost btn-circle"
            onClick={() => setIsImportModalOpen(true)}
            title="导入书签"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 书签内容区 */}
      <div className="bookmarks-container">
        {rootFolders.length > 0 ? (
          rootFolders.map((folder) => (
            <BookmarkFolderView
              key={folder.id}
              folder={folder}
              bookmarks={bookmarks}
              onNavigate={onNavigate}
            />
          ))
        ) : (
          <div className="text-center py-6">
            <p className="text-base-content/60">没有书签</p>
            <button
              className="btn btn-primary btn-sm mt-2"
              onClick={() => setIsImportModalOpen(true)}
            >
              导入书签
            </button>
          </div>
        )}
      </div>

      {/* 导入书签模态框 */}
      {isImportModalOpen && (
        <dialog open className="modal modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-lg">导入书签</h3>
            <p className="py-4">请选择从Chrome导出的书签HTML文件</p>
            <input
              type="file"
              className="file-input file-input-bordered w-full"
              accept=".html"
              onChange={handleFileSelect}
            />
            {errorMessage && (
              <div className="alert alert-error mt-2">{errorMessage}</div>
            )}
            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setIsImportModalOpen(false)}
              >
                取消
              </button>
              <button
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                onClick={handleImport}
                disabled={isLoading || !importFile}
              >
                {isLoading ? '导入中...' : '导入'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsImportModalOpen(false)}>关闭</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default BookmarkPanel; 