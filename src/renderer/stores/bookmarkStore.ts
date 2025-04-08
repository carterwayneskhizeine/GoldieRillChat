import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 书签数据结构
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  addDate: number;
  folder?: string;
}

// 书签文件夹结构
export interface BookmarkFolder {
  id: string;
  name: string;
  addDate: number;
  lastModified: number;
  parentId?: string;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  showBookmarksPanel: boolean;
  
  // 操作方法
  toggleBookmarksPanel: () => void;
  importBookmarks: (bookmarks: Bookmark[], folders: BookmarkFolder[]) => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, data: Partial<Bookmark>) => void;
  addFolder: (folder: BookmarkFolder) => void;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, data: Partial<BookmarkFolder>) => void;
}

// 生成唯一ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// 创建持久化存储
export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set) => ({
      bookmarks: [],
      folders: [],
      showBookmarksPanel: false,
      
      toggleBookmarksPanel: () => set((state) => ({ 
        showBookmarksPanel: !state.showBookmarksPanel 
      })),
      
      importBookmarks: (bookmarks, folders) => set({
        bookmarks,
        folders
      }),
      
      addBookmark: (bookmark) => set((state) => ({
        bookmarks: [...state.bookmarks, { ...bookmark, id: bookmark.id || generateId() }]
      })),
      
      removeBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter(b => b.id !== id)
      })),
      
      updateBookmark: (id, data) => set((state) => ({
        bookmarks: state.bookmarks.map(b => 
          b.id === id ? { ...b, ...data } : b
        )
      })),
      
      addFolder: (folder) => set((state) => ({
        folders: [...state.folders, { ...folder, id: folder.id || generateId() }]
      })),
      
      removeFolder: (id) => set((state) => ({
        folders: state.folders.filter(f => f.id !== id)
      })),
      
      updateFolder: (id, data) => set((state) => ({
        folders: state.folders.map(f => 
          f.id === id ? { ...f, ...data } : f
        )
      }))
    }),
    {
      name: 'goldie-bookmarks-storage'
    }
  )
); 