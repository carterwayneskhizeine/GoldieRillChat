import { Bookmark, BookmarkFolder } from '../stores/bookmarkStore';

// 生成唯一ID
const generateId = (): string => Math.random().toString(36).substring(2, 9);

/**
 * 解析Chrome书签HTML文件内容
 * @param fileContent HTML书签文件的字符串内容
 * @returns 解析后的书签和文件夹数据
 */
export function parseBookmarksFile(fileContent: string): { bookmarks: Bookmark[], folders: BookmarkFolder[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(fileContent, 'text/html');
  
  const bookmarks: Bookmark[] = [];
  const folders: BookmarkFolder[] = [];
  const folderMap = new Map<Element, string>(); // 保存DT元素到文件夹ID的映射
  
  // 解析所有DT>H3元素（文件夹）
  const folderElements = doc.querySelectorAll('DT > H3');
  folderElements.forEach((folderEl) => {
    const parentDT = folderEl.parentElement;
    if (!parentDT) return;
    
    const folderId = generateId();
    folderMap.set(parentDT, folderId);
    
    // 获取父文件夹ID
    let parentId: string | undefined;
    let parentDTElement = parentDT.parentElement?.parentElement;
    if (parentDTElement && parentDTElement.tagName === 'DT') {
      parentId = folderMap.get(parentDTElement);
    }
    
    // 创建文件夹对象
    folders.push({
      id: folderId,
      name: folderEl.textContent || '未命名文件夹',
      addDate: Number(folderEl.getAttribute('ADD_DATE') || Date.now()),
      lastModified: Number(folderEl.getAttribute('LAST_MODIFIED') || Date.now()),
      parentId
    });
    
    // 解析文件夹内的书签
    const bookmarkElements = parentDT.querySelectorAll(':scope > DL > DT > A');
    bookmarkElements.forEach((bookmarkEl) => {
      bookmarks.push({
        id: generateId(),
        title: bookmarkEl.textContent || '未命名书签',
        url: bookmarkEl.getAttribute('HREF') || '',
        icon: bookmarkEl.getAttribute('ICON') || null,
        addDate: Number(bookmarkEl.getAttribute('ADD_DATE') || Date.now()),
        folder: folderId
      });
    });
  });
  
  return { bookmarks, folders };
}

/**
 * 从文件对象读取内容并解析书签
 * @param file HTML书签文件
 * @returns Promise，解析后的书签和文件夹数据
 */
export async function parseBookmarksFromFile(file: File): Promise<{ bookmarks: Bookmark[], folders: BookmarkFolder[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        try {
          const content = event.target.result as string;
          const result = parseBookmarksFile(content);
          resolve(result);
        } catch (error) {
          reject(new Error('解析书签文件失败'));
        }
      } else {
        reject(new Error('读取文件内容失败'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file);
  });
} 