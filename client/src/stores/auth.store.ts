import { create } from 'zustand';
import { User } from '@split/shared';
import { setAccessToken } from '../lib/api';

interface AuthState {
  user: User | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setAuth: (user, token) => {
    setAccessToken(token);
    set({ user });
  },
  logout: () => {
    setAccessToken(null);
    set({ user: null });
  },
}));
