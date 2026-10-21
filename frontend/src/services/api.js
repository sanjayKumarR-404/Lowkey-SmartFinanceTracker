// services/api.js — Configured Axios client for communicating with the backend
import axios from 'axios';

// Create Axios instance with base URL from environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token to Authorization header if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lowkey_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: If backend returns 401 (Unauthorized), clear session
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear stored credentials
      localStorage.removeItem('lowkey_token');
      localStorage.removeItem('lowkey_user');

      // Dispatch custom event so AuthContext can update reactively without a full page reload
      window.dispatchEvent(new Event('lowkey-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
