import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4301';

export const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // AxiosRequestHeaders is a plain object-like type; ensure we merge into it safely
    const headers = (config.headers || {}) as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers as any;
  }
  return config;
});
