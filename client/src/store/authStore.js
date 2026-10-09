import { create } from 'zustand';
import api from '../services/api';
import { useSocketStore } from './socketStore';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => {
    set({ accessToken: token });
    if (token) {
      useSocketStore.getState().initSocket(token);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    useSocketStore.getState().disconnectSocket();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const refreshRes = await api.post('/auth/refresh');
      const { accessToken } = refreshRes.data.data;
      set({ accessToken });

      useSocketStore.getState().initSocket(accessToken);

      const userRes = await api.get('/auth/me');
      set({
        user: userRes.data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      useSocketStore.getState().disconnectSocket();
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
