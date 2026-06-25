import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isGerencia: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('omnes_user') || 'null'),
  token: localStorage.getItem('omnes_token'),
  setAuth: (user, token) => {
    localStorage.setItem('omnes_user', JSON.stringify(user));
    localStorage.setItem('omnes_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('omnes_user');
    localStorage.removeItem('omnes_token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },
  isAuthenticated: () => !!get().token,
  isAdmin: () => get().user?.role === 'ADMIN',
  isGerencia: () => get().user?.role === 'GERENCIA' || get().user?.role === 'ADMIN',
}));
