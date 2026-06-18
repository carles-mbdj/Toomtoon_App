import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, adminApi, userApi } from '../services/api';

interface User {
  id: string;
  email: string;
  username: string;
  is_admin?: boolean;
  subscription_type?: string;
  subscription_end?: string;
  notifications_enabled?: boolean;
  language?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  updateProfile: (data: { username?: string; email?: string; notifications_enabled?: boolean; language?: string }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.login(email, password);
      const { token, ...user } = response.data;
      
      await AsyncStorage.setItem('auth_token', token);
      set({ user, token, isAuthenticated: true, isAdmin: user.is_admin || false, isLoading: false });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur de connexion';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  adminLogin: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await adminApi.login(email, password);
      const { token, ...user } = response.data;
      
      await AsyncStorage.setItem('auth_token', token);
      set({ user, token, isAuthenticated: true, isAdmin: true, isLoading: false });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Identifiants administrateur invalides';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (email: string, password: string, username: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.register(email, password, username);
      const { token, ...user } = response.data;
      
      await AsyncStorage.setItem('auth_token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur d\'inscription';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false, isAdmin: false });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      
      const response = await authApi.getMe();
      set({ 
        user: response.data, 
        token, 
        isAuthenticated: true, 
        isAdmin: response.data.is_admin || false,
        isLoading: false 
      });
    } catch (error) {
      await AsyncStorage.removeItem('auth_token');
      set({ user: null, token: null, isAuthenticated: false, isAdmin: false, isLoading: false });
    }
  },

  updateUser: (user: User) => set({ user, isAdmin: user.is_admin || false }),

  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await userApi.updateProfile(data);
      set({ user: response.data, isLoading: false });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur de mise à jour';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      set({ isLoading: true, error: null });
      await userApi.changePassword(currentPassword, newPassword);
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur de changement de mot de passe';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  deleteAccount: async () => {
    try {
      set({ isLoading: true, error: null });
      await userApi.deleteAccount();
      await AsyncStorage.removeItem('auth_token');
      set({ user: null, token: null, isAuthenticated: false, isAdmin: false, isLoading: false });
      return true;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur de suppression du compte';
      set({ error: message, isLoading: false });
      return false;
    }
  },
  
  clearError: () => set({ error: null }),

  refreshUser: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await authApi.getMe();
      set({ 
        user: response.data, 
        isAdmin: response.data.is_admin || false,
      });
    } catch (error) {
      console.log('Error refreshing user:', error);
    }
  },
}));
