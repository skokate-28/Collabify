import { create } from 'zustand';

export const useMessageStore = create((set) => ({
  unreadTotal: 0,
  setUnreadTotal: (unreadTotal) => set({ unreadTotal: Math.max(0, unreadTotal || 0) }),
  incrementUnread: () => set((state) => ({ unreadTotal: state.unreadTotal + 1 })),
}));
