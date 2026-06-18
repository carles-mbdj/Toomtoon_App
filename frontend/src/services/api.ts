import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.log('Error getting token:', e);
  }
  return config;
});

// Auth API
export const authApi = {
  register: (email: string, password: string, username: string) =>
    api.post('/auth/register', { email, password, username }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

// User Settings API
export const userApi = {
  updateProfile: (data: { username?: string; email?: string; notifications_enabled?: boolean; language?: string }) =>
    api.put('/user/profile', data),
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
    api.get('/webtoons', { params }),
  getFeatured: () => api.get('/webtoons/featured'),
  getById: (id: string) => api.get(`/webtoons/${id}`),
  create: (data: any) => api.post('/webtoons', data),
};

// Episodes API
export const episodesApi = {
  getByWebtoon: (webtoonId: string) => api.get(`/webtoons/${webtoonId}/episodes`),
  getRecent: () => api.get('/episodes/recent'),
  getById: (id: string) => api.get(`/episodes/${id}`),
  create: (data: any) => api.post('/episodes', data),
};

// Genres API
export const genresApi = {
  getAll: () => api.get('/genres'),
};

// Schedule API
export const scheduleApi = {
  get: () => api.get('/schedule'),
};

// Subscription API
export const subscriptionApi = {
  getPlans: () => api.get('/subscriptions/plans'),
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

// Stripe Checkout API (Production)
export const checkoutApi = {
  // Create a Stripe Checkout session
  createSession: (plan_id: string, currency: string = 'EUR', success_url?: string, cancel_url?: string) =>
    api.post('/checkout/create-session', { plan_id, currency, success_url, cancel_url }),
  
  // Get session status after redirect
  getSessionStatus: (sessionId: string) => api.get(`/checkout/session/${sessionId}`),
  
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
  get: () => api.get('/history'),
  clear: () => api.delete('/history'),
};

// Comments API
export const commentsApi = {
  get: (params?: { webtoon_id?: string; episode_id?: string; article_id?: string }) =>
    api.get('/comments', { params }),
  create: (data: { webtoon_id?: string; episode_id?: string; article_id?: string; content: string }) =>
    api.post('/comments', data),
  like: (commentId: string) => api.post(`/comments/${commentId}/like`),
  delete: (commentId: string) => api.delete(`/comments/${commentId}`),
};

// Articles API (Toom-Mag)
export const articlesApi = {
  getAll: (params?: { category?: string; featured?: boolean }) =>
    api.get('/articles', { params }),
  getById: (id: string) => api.get(`/articles/${id}`),
};

// Password Reset API
export const passwordApi = {
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyCode: (email: string, code: string) =>
    api.post(`/auth/verify-reset-code?email=${email}&code=${code}`),
  resetPassword: (email: string, code: string, new_password: string) =>
    api.post(`/auth/reset-password?email=${email}&code=${code}&new_password=${new_password}`),
};

// Admin API
export const adminApi = {
  login: (email: string, password: string) =>
    api.post('/admin/login', { email, password }),
  getStats: () => api.get('/admin/stats'),
  
  // Users
  getUsers: (params?: { skip?: number; limit?: number; search?: string }) =>
    api.get('/admin/users', { params }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  updateUserSubscription: (userId: string, plan: string) =>
    api.put(`/admin/users/${userId}/subscription`, null, { params: { plan } }),
  
  // Webtoons
  createWebtoon: (data: any) => api.post('/admin/webtoons', data),
  updateWebtoon: (id: string, data: any) => api.put(`/admin/webtoons/${id}`, data),
  deleteWebtoon: (id: string) => api.delete(`/admin/webtoons/${id}`),
  updateWebtoonCover: (id: string, cover_image: string) =>
    api.put(`/admin/webtoons/${id}/cover`, { cover_image }),
  
  // Episodes
  createEpisode: (data: any) => api.post('/admin/episodes', data),
  updateEpisode: (id: string, data: any) => api.put(`/admin/episodes/${id}`, data),
  deleteEpisode: (id: string) => api.delete(`/admin/episodes/${id}`),
  updateEpisodePages: (id: string, pages: string[]) =>
    api.put(`/admin/episodes/${id}/pages`, { pages }),
  addEpisodePage: (id: string, page_image: string) =>
    api.post(`/admin/episodes/${id}/pages/add`, { page_image }),
  
  // Articles
  createArticle: (data: any) => api.post('/admin/articles', data),
  updateArticle: (id: string, data: any) => api.put(`/admin/articles/${id}`, data),
  deleteArticle: (id: string) => api.delete(`/admin/articles/${id}`),
  
  // Subscriptions
  getSubscriptions: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.get('/admin/subscriptions', { params }),
  
  // Subscription Plans Management
  getSubscriptionPlans: () => api.get('/admin/subscription-plans'),
  createSubscriptionPlan: (data: any) => api.post('/admin/subscription-plans', data),
  updateSubscriptionPlan: (id: string, data: any) => api.put(`/admin/subscription-plans/${id}`, data),
  deleteSubscriptionPlan: (id: string) => api.delete(`/admin/subscription-plans/${id}`),
  
  // Payments
  getPayments: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.get('/admin/payments', { params }),
  refundPayment: (paymentIntentId: string, amount?: number) =>
    api.post(`/payments/${paymentIntentId}/refund`, { amount }),
};

// Seed API
export const seedApi = {
  seed: () => api.post('/seed'),
};

export default api;
