import { create } from 'zustand';

export interface Tab {
  id: string;
  title?: string;
  url?: string;
  favicon?: string;
}

interface BrowserState {
  tabs: Tab[];
  currentTab: Tab | null;
  addTab: (url?: string) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTab: (id: string, data: Partial<Tab>) => void;
}

// 生成唯一ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// 创建浏览器状态管理
export const useBrowserStore = create<BrowserState>((set) => ({
  tabs: [{ id: generateId(), title: '新标签页', url: 'https://google.com' }],
  currentTab: null,
  
  addTab: (url = 'https://google.com') => set((state) => {
    const newTab = { id: generateId(), title: '新标签页', url };
    return {
      tabs: [...state.tabs, newTab],
      currentTab: newTab
    };
  }),
  
  closeTab: (id) => set((state) => {
    // 如果只有一个标签页，创建一个新的
    if (state.tabs.length === 1) {
      const newTab = { id: generateId(), title: '新标签页', url: 'https://google.com' };
      return {
        tabs: [newTab],
        currentTab: newTab
      };
    }
    
    // 计算要切换到的标签页
    let newCurrentTab = state.currentTab;
    if (state.currentTab?.id === id) {
      const currentIndex = state.tabs.findIndex(t => t.id === id);
      const nextTab = state.tabs[currentIndex + 1] || state.tabs[currentIndex - 1];
      newCurrentTab = nextTab;
    }
    
    return {
      tabs: state.tabs.filter((tab) => tab.id !== id),
      currentTab: newCurrentTab
    };
  }),
  
  switchTab: (id) => set((state) => ({
    currentTab: state.tabs.find((tab) => tab.id === id) || state.currentTab
  })),
  
  updateTab: (id, data) => set((state) => ({
    tabs: state.tabs.map((tab) => 
      tab.id === id ? { ...tab, ...data } : tab
    ),
    currentTab: state.currentTab?.id === id 
      ? { ...state.currentTab, ...data } 
      : state.currentTab
  }))
})); 