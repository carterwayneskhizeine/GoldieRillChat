import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarMode: 'default',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarMode: (mode) => set({ sidebarMode: mode }),

  // Settings modal
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),

  // Theme — persisted manually so DOM stays in sync
  currentTheme: localStorage.getItem('theme') || 'bg-theme',
  setCurrentTheme: (theme) => {
    set({ currentTheme: theme });
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },
}));

export default useUIStore;
