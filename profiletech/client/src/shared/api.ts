import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4300/api';

export const api = axios.create({ baseURL: apiBase });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 to avoid stale/invalid token issues
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      // Hard redirect to ensure state resets
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
