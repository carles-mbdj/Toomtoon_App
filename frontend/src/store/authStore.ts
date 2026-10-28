import { create } from 'zustand';
import { getRefreshToken, getToken, removeRefreshToken, removeToken, setRefreshToken, setToken } from '../services/tokenStorage';
import { authApi, setOnAuthFailure, userApi, type UserProfile } from '../services/api';
import { getErrorMessage } from '../utils/errors';

type User = UserProfile;

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
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
      const { token, refresh_token, ...user } = response.data;

      await setToken(token);
      await setRefreshToken(refresh_token);
      set({ user, token, isAuthenticated: true, isAdmin: user.is_admin || false, isLoading: false });
      return true;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Erreur de connexion'), isLoading: false });
      return false;
    }
  },

  register: async (email: string, password: string, username: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.register(email, password, username);
      const { token, refresh_token, ...user } = response.data;

      await setToken(token);
      await setRefreshToken(refresh_token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      set({ error: getErrorMessage(error, "Erreur d'inscription"), isLoading: false });
      return false;
    }
  },

  logout: async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      // Best-effort: revoke server-side so the refresh token can't be used
      // again, but don't block clearing the local session on it.
      authApi.logout(refreshToken).catch(() => {});
    }
    await removeToken();
    await removeRefreshToken();
    set({ user: null, token: null, isAuthenticated: false, isAdmin: false });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const token = await getToken();
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
      await removeToken();
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
    } catch (error) {
      set({ error: getErrorMessage(error, 'Erreur de mise à jour'), isLoading: false });
      return false;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      set({ isLoading: true, error: null });
      await userApi.changePassword(currentPassword, newPassword);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Erreur de changement de mot de passe'), isLoading: false });
      return false;
    }
  },

  deleteAccount: async () => {
    try {
      set({ isLoading: true, error: null });
      await userApi.deleteAccount();
      await removeToken();
      await removeRefreshToken();
      set({ user: null, token: null, isAuthenticated: false, isAdmin: false, isLoading: false });
      return true;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Erreur de suppression du compte'), isLoading: false });
      return false;
    }
  },
  
  clearError: () => set({ error: null }),

  refreshUser: async () => {
    try {
      const token = await getToken();
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

// If the API layer ever fails to refresh an expired access token (its
// refresh token is itself invalid/expired/revoked), fully log the user out
// so the UI reflects it instead of silently keeping stale "authenticated" state.
setOnAuthFailure(() => {
  useAuthStore.getState().logout();
});
