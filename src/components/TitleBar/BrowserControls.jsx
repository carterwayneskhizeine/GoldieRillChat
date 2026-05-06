import React, { useState } from 'react'
import { openUrlDirectly } from '../../utils/browserUtils'
import toastManager from '../../utils/toastManager'

function TranslateButton({ currentUrl }) {
  const [isTranslating, setIsTranslating] = useState(false)

  const handleTranslate = () => {
    if (isTranslating) return
    const url = currentUrl || window.location.href
    if (!url || url.startsWith('file:') || url.startsWith('electron:') || url.startsWith('about:')) {
      toastManager.error('当前页面无法翻译')
      return
    }
    setIsTranslating(true)
    const googleUrl = `https://translate.google.com/translate?sl=auto&tl=zh-CN&u=${encodeURIComponent(url)}`
    openUrlDirectly(googleUrl)
    toastManager.success('网页翻译中...')
    setIsTranslating(false)
  }

  return (
    <button className={`btn btn-xs btn-ghost ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleTranslate} disabled={isTranslating} title="翻译当前页面为中文">
      {isTranslating ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      )}
    </button>
  )
}

export default function BrowserControls({
  currentUrl, setCurrentUrl, isLoading, activeTabId,
  onAddBookmark, onToggleBookmarksPanel, showBookmarksPanel
}) {
  const [isNavigating, setIsNavigating] = useState(false)

  const handleNavigation = (url) => {
    if (isNavigating) return
    let formattedUrl = url.trim()
    if (!formattedUrl) return
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://') && !formattedUrl.startsWith('file://')) {
      formattedUrl = 'https://' + formattedUrl
    }
    setIsNavigating(true)
    const action = activeTabId
      ? window.electron.browser.navigate(formattedUrl)
      : window.electron.browser.newTab(formattedUrl)
    action.finally(() => setTimeout(() => setIsNavigating(false), 500))
  }

  return (
    <div className="w-[700px] flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
      <div className="join h-8 flex items-center">
        <button className="join-item btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
          onClick={() => window.electron.browser.back()}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
            <polyline points="10,7 5,12 10,17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
        <button className="join-item btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
          onClick={() => window.electron.browser.forward()}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
            <polyline points="14,7 19,12 14,17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
        <button className="join-item btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
          onClick={() => window.electron.browser.refresh()}>
          {isLoading ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
        <TranslateButton currentUrl={currentUrl} />
      </div>

      <input type="text" className="input input-bordered flex-1 h-8 min-h-[28px] px-3 text-sm"
        value={currentUrl} onChange={(e) => setCurrentUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !isNavigating) handleNavigation(currentUrl) }}
        disabled={isNavigating} placeholder="输入网址..." />

      <div className="join h-8 flex items-center ml-2">
        <button className="join-item btn btn-ghost px-2 h-8 min-h-0 flex items-center justify-center"
          onClick={onAddBookmark} title="添加当前页面到书签">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        <button className={`join-item btn ${showBookmarksPanel ? 'btn-primary' : 'btn-ghost'} px-2 h-8 min-h-0 flex items-center justify-center`}
          onClick={onToggleBookmarksPanel} title="显示书签">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </button>
      </div>
    </div>
  )
}
