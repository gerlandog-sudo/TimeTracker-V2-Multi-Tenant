import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Authorization'] = `Bearer ${token}`;
    // La cookie ya se gestiona desde el backend en el login, 
    // pero la reforzamos aquí para navegadores estrictos
    document.cookie = `tt_token=${token}; path=/; max-age=86400; SameSite=Lax`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirigir si es un 401 real y no estamos ya en el login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.hash.includes('/login')) {
        window.location.href = '#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
