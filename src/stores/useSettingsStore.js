import { create } from 'zustand';

// AI settings — currently managed in AIChat component; this is a placeholder for Phase 4 migration
const useSettingsStore = create((set) => ({
  storagePath: localStorage.getItem('storagePath') || '',
  setStoragePath: (path) => {
    set({ storagePath: path });
    localStorage.setItem('storagePath', path);
  },
}));

export default useSettingsStore;
