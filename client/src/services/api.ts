import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('omnes_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || 'Error de conexión';
    if (error.response?.status === 401) {
      localStorage.removeItem('omnes_token');
      localStorage.removeItem('omnes_user');
      window.location.href = '/login';
    }
    toast.error(message);
    return Promise.reject(error);
  }
);

export default api;
