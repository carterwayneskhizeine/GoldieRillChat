import { create } from 'zustand';
import { tools } from '../config/toolsConfig';

const useToolStore = create((set, get) => ({
  activeTool: localStorage.getItem('active_tool') || 'aichat',

  setActiveTool: (tool) => {
    set({ activeTool: tool });
    localStorage.setItem('active_tool', tool);
    // Keep backward-compat event so legacy listeners (DaisyTextarea, AIChat) still work
    window.dispatchEvent(new CustomEvent('tool-changed', { detail: { tool } }));
  },

  switchTool: (direction) => {
    const { activeTool, setActiveTool } = get();
    // Accept a direct tool name as well as 'next' / 'prev'
    if (direction !== 'next' && direction !== 'prev') {
      setActiveTool(direction);
      return;
    }
    const currentIndex = tools.indexOf(activeTool);
    const next =
      direction === 'next'
        ? tools[(currentIndex + 1) % tools.length]
        : tools[(currentIndex - 1 + tools.length) % tools.length];
    setActiveTool(next);
  },
}));

export default useToolStore;
