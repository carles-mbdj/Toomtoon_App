import axios from 'axios';
import { getToken } from './tokenStorage';
import type { Article, Comment, Episode, Genre, HistoryEntry, RecentEpisode, SubscriptionPlan, Webtoon } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.log('Error getting token:', e);
  }
  return config;
});

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  is_admin?: boolean;
  subscription_type?: string | null;
  subscription_end?: string | null;
  notifications_enabled?: boolean;
  language?: string;
}

interface AuthResponse extends UserProfile {
  token: string;
}

// Auth API
export const authApi = {
  register: (email: string, password: string, username: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, username }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  getMe: () => api.get<UserProfile>('/auth/me'),
};

// User Settings API
export const userApi = {
  updateProfile: (data: { username?: string; email?: string; notifications_enabled?: boolean; language?: string }) =>
    api.put<UserProfile>('/user/profile', data),
  changePassword: (current_password: string, new_password: string) =>
    api.put('/user/password', { current_password, new_password }),
  deleteAccount: () => api.delete('/user/account'),
};

// Notifications API
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Webtoons API
export const webtoonsApi = {
  getAll: (params?: { genre?: string; status?: string; search?: string }) =>
    api.get<Webtoon[]>('/webtoons', { params }),
  getFeatured: () => api.get<Webtoon[]>('/webtoons/featured'),
  getById: (id: string) => api.get<Webtoon>(`/webtoons/${id}`),
};

// Episodes API
export const episodesApi = {
  getByWebtoon: (webtoonId: string) => api.get<Episode[]>(`/webtoons/${webtoonId}/episodes`),
  getRecent: () => api.get<RecentEpisode[]>('/episodes/recent'),
  getById: (id: string) => api.get<Episode>(`/episodes/${id}`),
};

// Genres API
export const genresApi = {
  getAll: () => api.get<Genre[]>('/genres'),
};

// Schedule API
export const scheduleApi = {
  get: () => api.get<Record<string, Webtoon[]>>('/schedule'),
};

// Subscription API
export const subscriptionApi = {
  getPlans: () => api.get<SubscriptionPlan[]>('/subscriptions/plans'),
  subscribe: (plan: string) => api.post('/subscriptions/subscribe', { plan }),
};

// Payment API (Stripe)
export const paymentApi = {
  // Get Stripe config (publishable key)
  getConfig: () => api.get('/payments/config'),
  
  // Create payment intent (legacy - for test mode)
  createPaymentIntent: (plan_id: string, currency: string = 'EUR') =>
    api.post('/payments/create-intent', { plan_id, currency }, {
      headers: {
        'Idempotency-Key': generateUUID(),
      },
    }),
  
  // Get payment status
  getPaymentStatus: (paymentId: string) => api.get(`/payments/${paymentId}`),
  
  // Confirm payment (after Stripe success)
  confirmPayment: (paymentIntentId: string) =>
    api.post(`/payments/${paymentIntentId}/confirm`),
  
  // TEST: Simulate successful payment (development only)
  testConfirmPayment: (paymentIntentId: string) =>
    api.post(`/payments/${paymentIntentId}/test-confirm`),
};

interface CheckoutSession {
  checkout_url: string;
  session_id: string;
}

interface CheckoutSessionStatus {
  session_id: string;
  status: string;
  payment_status: string;
  subscription_id?: string | null;
  customer_email?: string | null;
}

// Stripe Checkout API (Production)
export const checkoutApi = {
  // Create a Stripe Checkout session
  createSession: (plan_id: string, currency: string = 'EUR', success_url?: string, cancel_url?: string) =>
    api.post<CheckoutSession>('/checkout/create-session', { plan_id, currency, success_url, cancel_url }),

  // Get session status after redirect
  getSessionStatus: (sessionId: string) => api.get<CheckoutSessionStatus>(`/checkout/session/${sessionId}`),
  
  // Get subscription status
  getSubscriptionStatus: () => api.get('/checkout/subscription-status'),
  
  // Cancel subscription
  cancelSubscription: (immediately: boolean = false) =>
    api.post(`/checkout/cancel-subscription?immediately=${immediately}`),
  
  // Get Stripe Customer Portal URL
  getCustomerPortal: (return_url?: string) =>
    api.get('/checkout/customer-portal', { params: { return_url } }),
};

// Helper: Generate UUID for idempotency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// History API
export const historyApi = {
  save: (webtoonId: string, episodeId: string, page: number) =>
    api.post(`/history?webtoon_id=${webtoonId}&episode_id=${episodeId}&page=${page}`),
  get: () => api.get<HistoryEntry[]>('/history'),
  clear: () => api.delete('/history'),
};

interface LikeCommentResponse {
  success: boolean;
  action: 'liked' | 'unliked';
  likes: number;
}

// Comments API
export const commentsApi = {
  get: (params?: { webtoon_id?: string; episode_id?: string; article_id?: string }) =>
    api.get<Comment[]>('/comments', { params }),
  create: (data: { webtoon_id?: string; episode_id?: string; article_id?: string; content: string }) =>
    api.post<Comment>('/comments', data),
  like: (commentId: string) => api.post<LikeCommentResponse>(`/comments/${commentId}/like`),
  delete: (commentId: string) => api.delete(`/comments/${commentId}`),
};

// Articles API (Toom-Mag)
export const articlesApi = {
  getAll: (params?: { category?: string; featured?: boolean }) =>
    api.get<Article[]>('/articles', { params }),
  getById: (id: string) => api.get<Article>(`/articles/${id}`),
};

// Password Reset API
export const passwordApi = {
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyCode: (email: string, code: string) =>
    api.post(`/auth/verify-reset-code?email=${email}&code=${code}`),
  resetPassword: (email: string, code: string, new_password: string) =>
    api.post(`/auth/reset-password?email=${email}&code=${code}&new_password=${new_password}`),
};

export default api;
