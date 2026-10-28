import api from './config';
import type {
  AdminUser,
  Article,
  ArticleInput,
  DashboardStats,
  Episode,
  EpisodeInput,
  Genre,
  Payment,
  SubscriptionPlan,
  SubscriptionPlanInput,
  Webtoon,
  WebtoonInput,
} from '../types';

interface WebtoonFilters {
  genre?: string;
  status?: string;
  search?: string;
}

interface ArticleFilters {
  category?: string;
  featured?: boolean;
}

interface PaymentFilters {
  skip?: number;
  limit?: number;
  status?: string;
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ id: string; email: string; username: string; is_admin: boolean; token: string }>('/admin/login', { email, password }),
  getMe: () => api.get<AdminUser>('/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    api.put<{ success: boolean; message: string }>('/user/password', { current_password, new_password }),
};

// Webtoons
export const webtoonsApi = {
  getAll: (params?: WebtoonFilters) => api.get<Webtoon[]>('/webtoons', { params }),
  getById: (id: string) => api.get<Webtoon>(`/webtoons/${id}`),
  create: (data: WebtoonInput) => api.post<Webtoon>('/admin/webtoons', data),
  update: (id: string, data: Partial<WebtoonInput>) => api.put<Webtoon>(`/admin/webtoons/${id}`, data),
  delete: (id: string) => api.delete(`/admin/webtoons/${id}`),
  updateCover: (id: string, cover_image: string) =>
    api.put(`/admin/webtoons/${id}/cover`, { cover_image }),
};

// Episodes
export const episodesApi = {
  getByWebtoon: (webtoonId: string) => api.get<Episode[]>(`/webtoons/${webtoonId}/episodes`),
  getById: (id: string) => api.get<Episode>(`/episodes/${id}`),
  create: (data: EpisodeInput) => api.post<Episode>('/admin/episodes', data),
  update: (id: string, data: Partial<EpisodeInput>) => api.put<Episode>(`/admin/episodes/${id}`, data),
  delete: (id: string) => api.delete(`/admin/episodes/${id}`),
  updatePages: (id: string, pages: string[]) =>
    api.put(`/admin/episodes/${id}/pages`, { pages }),
  addPage: (id: string, page_image: string) =>
    api.post(`/admin/episodes/${id}/pages/add`, { page_image }),
};

// Users
export const usersApi = {
  getAll: () => api.get<{ total: number; users: AdminUser[] }>('/admin/users'),
  getById: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
  update: (id: string, data: Partial<Pick<AdminUser, 'subscription_type'>>) => api.put(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
};

// Articles (Toom-Mag)
export const articlesApi = {
  getAll: (params?: ArticleFilters) => api.get<Article[]>('/articles', { params }),
  getById: (id: string) => api.get<Article>(`/articles/${id}`),
  create: (data: ArticleInput) => api.post<Article>('/admin/articles', data),
  update: (id: string, data: ArticleInput) => api.put<Article>(`/admin/articles/${id}`, data),
  delete: (id: string) => api.delete(`/admin/articles/${id}`),
};

// Genres
export const genresApi = {
  getAll: () => api.get<Genre[]>('/genres'),
  create: (data: { name: string }) => api.post<Genre>('/admin/genres', data),
  update: (id: string, data: { name: string }) => api.put<Genre>(`/admin/genres/${id}`, data),
  delete: (id: string) => api.delete(`/admin/genres/${id}`),
};

// Subscriptions
export const subscriptionsApi = {
  getPlans: () => api.get<SubscriptionPlan[]>('/admin/subscription-plans'),
  createPlan: (data: SubscriptionPlanInput) => api.post<SubscriptionPlan>('/admin/subscription-plans', data),
  updatePlan: (id: string, data: Partial<SubscriptionPlanInput>) => api.put<SubscriptionPlan>(`/admin/subscription-plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/admin/subscription-plans/${id}`),
  // Payments
  getPayments: (params?: PaymentFilters) => api.get<{ total: number; payments: Payment[] }>('/admin/payments', { params }),
  refundPayment: (paymentIntentId: string, amount?: number) =>
    api.post(`/payments/${paymentIntentId}/refund`, { amount }),
};

// Stats
export const statsApi = {
  getDashboard: () => api.get<DashboardStats>('/admin/stats'),
};
