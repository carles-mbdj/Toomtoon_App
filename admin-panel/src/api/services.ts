import api from './config';

// Auth
export const authApi = {
  login: (email: string, password: string) => 
    api.post('/admin/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

// Webtoons
export const webtoonsApi = {
  getAll: (params?: any) => api.get('/webtoons', { params }),
  getById: (id: string) => api.get(`/webtoons/${id}`),
  create: (data: any) => api.post('/admin/webtoons', data),
  update: (id: string, data: any) => api.put(`/admin/webtoons/${id}`, data),
  delete: (id: string) => api.delete(`/admin/webtoons/${id}`),
  updateCover: (id: string, cover_image: string) => 
    api.put(`/admin/webtoons/${id}/cover`, { cover_image }),
};

// Episodes
export const episodesApi = {
  getByWebtoon: (webtoonId: string) => api.get(`/webtoons/${webtoonId}/episodes`),
  getById: (id: string) => api.get(`/episodes/${id}`),
  create: (data: any) => api.post('/admin/episodes', data),
  update: (id: string, data: any) => api.put(`/admin/episodes/${id}`, data),
  delete: (id: string) => api.delete(`/admin/episodes/${id}`),
  updatePages: (id: string, pages: string[]) => 
    api.put(`/admin/episodes/${id}/pages`, { pages }),
  addPage: (id: string, page_image: string) => 
    api.post(`/admin/episodes/${id}/pages/add`, { page_image }),
};

// Users
export const usersApi = {
  getAll: () => api.get('/admin/users'),
  getById: (id: string) => api.get(`/admin/users/${id}`),
  update: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
};

// Articles (Toom-Mag)
export const articlesApi = {
  getAll: (params?: any) => api.get('/articles', { params }),
  getById: (id: string) => api.get(`/articles/${id}`),
  create: (data: any) => api.post('/admin/articles', data),
  update: (id: string, data: any) => api.put(`/admin/articles/${id}`, data),
  delete: (id: string) => api.delete(`/admin/articles/${id}`),
};

// Genres
export const genresApi = {
  getAll: () => api.get('/genres'),
  create: (data: any) => api.post('/admin/genres', data),
  update: (id: string, data: any) => api.put(`/admin/genres/${id}`, data),
  delete: (id: string) => api.delete(`/admin/genres/${id}`),
};

// Subscriptions
export const subscriptionsApi = {
  getPlans: () => api.get('/admin/subscription-plans'),
  createPlan: (data: any) => api.post('/admin/subscription-plans', data),
  updatePlan: (id: string, data: any) => api.put(`/admin/subscription-plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/admin/subscription-plans/${id}`),
  // Payments
  getPayments: (params?: any) => api.get('/admin/payments', { params }),
  refundPayment: (paymentIntentId: string, amount?: number) => 
    api.post(`/payments/${paymentIntentId}/refund`, { amount }),
};

// Stats
export const statsApi = {
  getDashboard: () => api.get('/admin/stats'),
};
