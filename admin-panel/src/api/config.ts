import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// Use relative URL - works with same domain
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function clearSessionAndRedirect() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_refresh_token');
  window.location.href = '/api/admin/login';
}

// Shared across concurrent 401s so a burst of requests triggers exactly one
// refresh call instead of each racing to consume (and rotate out) the same
// refresh token.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('admin_refresh_token');
  if (!refreshToken) return null;
  try {
    // Plain axios, not `api`, so this call never goes through the
    // interceptor below and can't trigger itself on failure.
    const response = await axios.post<{ token: string; refresh_token: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken }
    );
    localStorage.setItem('admin_token', response.data.token);
    localStorage.setItem('admin_refresh_token', response.data.refresh_token);
    return response.data.token;
  } catch {
    return null;
  }
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// Handle 401/403 errors, transparently refreshing the access token once
// before giving up and sending the admin back to the login page.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    const requestConfig = config as RetryableRequestConfig | undefined;
    if (!response || !requestConfig) return Promise.reject(error);

    if (response.status === 401 && !requestConfig._retried) {
      requestConfig._retried = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        requestConfig.headers.Authorization = `Bearer ${newToken}`;
        return api(requestConfig);
      }
    }

    if (response.status === 401 || response.status === 403) {
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

export default api;
