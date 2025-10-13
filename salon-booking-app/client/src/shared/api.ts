import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4301';

export const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});
