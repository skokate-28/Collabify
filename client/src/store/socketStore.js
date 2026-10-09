import { create } from 'zustand';
import { initSocket as connect, disconnectSocket as disconnect } from '../socket/socket';

export const useSocketStore = create((set) => ({
  socket: null,

  initSocket: (token) => {
    const s = connect(token);
    set({ socket: s });
  },

  disconnectSocket: () => {
    disconnect();
    set({ socket: null });
  },
}));
