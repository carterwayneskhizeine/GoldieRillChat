// 使用Zustand状态管理
export const useBrowserStore = create<BrowserState>((set) => ({
  tabs: [/* 初始标签数据 */],
  currentTab: null,
  
  addTab: () => set(state => ({
    tabs: [...state.tabs, newTab],
    currentTab: newTab
  })),
  
  closeTab: (tabId) => set(state => {
    // 处理关闭逻辑并自动切换标签
  }),
  
  switchTab: (tabId) => set({ currentTab: state.tabs.find(t => t.id === tabId) })
})); 