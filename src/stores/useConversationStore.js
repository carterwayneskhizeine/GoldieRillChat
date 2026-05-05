import { create } from 'zustand';

// Minimal conversation store — full migration happens in Phase 2
const useConversationStore = create((set) => ({
  conversations: (() => {
    try {
      const saved = localStorage.getItem('aichat_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  currentConversation: (() => {
    try {
      const saved = localStorage.getItem('aichat_current_conversation');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  messages: [],

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  setMessages: (messages) => set({ messages }),
}));

export default useConversationStore;
