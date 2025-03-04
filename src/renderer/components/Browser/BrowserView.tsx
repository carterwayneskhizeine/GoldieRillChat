import React, { useRef, useState, useEffect } from 'react';
// 直接导入接口而非函数，避免命名冲突
import { useBrowserStore as useBrowserStoreOriginal, Tab } from '../../stores/browserStore';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import BookmarkPanel from './BookmarkPanel';

// 使用别名避免冲突
const useBrowserStore = useBrowserStoreOriginal;

// 主界面容器
export default function BrowserView() {
  const { tabs, currentTab, addTab, closeTab, switchTab, updateTab } = useBrowserStore();
  const { showBookmarksPanel, toggleBookmarksPanel, addBookmark } = useBookmarkStore();
  const webviewRef = useRef<any>(null);
  const [url, setUrl] = useState(currentTab?.url || 'https://google.com');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // 添加翻译状态
  const [isTranslating, setIsTranslating] = useState(false);

  // 设置初始标签页
  useEffect(() => {
    if (tabs.length > 0 && !currentTab) {
      switchTab(tabs[0].id);
    }
  }, [tabs, currentTab, switchTab]);

  // 导航控制功能
  const handleNavigation = (action: 'back' | 'forward' | 'reload') => {
    const webview = webviewRef.current;
    if (!webview) return;
    
    switch(action) {
      case 'back': webview.goBack(); break;
      case 'forward': webview.goForward(); break;
      case 'reload': webview.reload(); break;
    }
  };

  // 处理导航到URL
  const handleNavigate = (targetUrl: string) => {
    if (webviewRef.current && currentTab) {
      webviewRef.current.loadURL(targetUrl);
      setUrl(targetUrl);
      updateTab(currentTab.id, { url: targetUrl });
    }
  };

  // 监听webview事件
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !currentTab) return;

    const handleDidStartLoading = () => {
      setIsLoading(true);
    };

    const handleDidStopLoading = () => {
      setIsLoading(false);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
      
      const currentUrl = webview.getURL();
      setUrl(currentUrl);
      
      // 更新标签页信息
      if (currentTab) {
        updateTab(currentTab.id, { 
          url: currentUrl,
          title: webview.getTitle() || currentUrl
        });
      }
      
      // 尝试获取网站图标
      try {
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(currentUrl).hostname}&sz=64`;
        if (currentTab) {
          updateTab(currentTab.id, { favicon: faviconUrl });
        }
      } catch (e) {
        // 忽略URL解析错误
      }
    };

    const handleTitleUpdated = (event: any) => {
      // 处理title更新
      if (event && event.title && currentTab) {
        updateTab(currentTab.id, { title: event.title });
      }
    };

    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('page-title-updated', handleTitleUpdated);

    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
    };
  }, [currentTab, updateTab]);

  // 处理添加当前页面为书签 - 由TitleBar统一处理，这里只保留函数
  const handleAddBookmark = () => {
    if (webviewRef.current && currentTab) {
      addBookmark({
        id: '',
        title: currentTab.title || url,
        url: webviewRef.current.getURL(),
        icon: currentTab.favicon || null,
        addDate: Date.now(),
      });
    }
  };

  // 处理翻译功能
  const handleTranslate = () => {
    setIsTranslating(true);
    // 这里暂时只是切换状态，实际翻译功能将在后续实现
    setTimeout(() => setIsTranslating(false), 1000);
    // 翻译功能将在这里实现
    console.log('翻译功能待实现');
  };

  return (
    <div className="browser-container h-full flex flex-col">
      {/* 标签栏 */}
      <div className="tab-bar flex items-center bg-base-200 p-2 overflow-x-auto">
        <button onClick={() => addTab()} className="btn btn-sm btn-ghost mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        <div className="tabs tabs-boxed flex-nowrap">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`tab ${tab.id === currentTab?.id ? 'tab-active' : ''} flex items-center gap-1 truncate max-w-xs`}
              onClick={() => switchTab(tab.id)}
            >
              {tab.favicon && (
                <img src={tab.favicon} alt="" className="w-4 h-4" />
              )}
              <span className="truncate">{tab.title || '新标签页'}</span>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  closeTab(tab.id); 
                }}
                className="btn btn-xs btn-ghost btn-circle"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 导航控制栏 - 移除书签按钮，保留其他操作 */}
      <div className="control-bar flex items-center gap-2 p-2 bg-base-300">
        <button 
          onClick={() => handleNavigation('back')} 
          className="btn btn-circle btn-sm" 
          disabled={!canGoBack}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          onClick={() => handleNavigation('forward')} 
          className="btn btn-circle btn-sm"
          disabled={!canGoForward}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        <button 
          onClick={() => handleNavigation('reload')} 
          className="btn btn-circle btn-sm"
        >
          {isLoading ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
        
        {/* 添加翻译按钮 */}
        <button 
          onClick={handleTranslate} 
          className={`btn btn-circle btn-sm ${isTranslating ? 'btn-primary' : ''}`}
          title="翻译页面"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </button>
        
        <div className="form-control flex-1">
          <div className="input-group">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNavigate(url)}
              className="input input-bordered w-full"
              placeholder="输入网址..."
            />
            <button 
              className="btn btn-square" 
              onClick={() => handleNavigate(url)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 - 保留书签面板和Webview */}
      <div className="flex-1 flex">
        {/* 书签面板（可折叠） */}
        {showBookmarksPanel && (
          <div className="bookmarks-sidebar w-64 h-full overflow-hidden border-r border-base-300">
            <BookmarkPanel onNavigate={handleNavigate} />
          </div>
        )}

        {/* Webview 核心组件 */}
        <webview
          ref={webviewRef}
          src={currentTab?.url || 'about:blank'}
          className="flex-1"
          webpreferences="sandbox=yes" // 安全沙箱配置
        />
      </div>
    </div>
  );
} 