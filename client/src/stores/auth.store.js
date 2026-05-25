import { create } from 'zustand';
import { setAccessToken } from '../lib/api';
export const useAuthStore = create((set) => ({
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
