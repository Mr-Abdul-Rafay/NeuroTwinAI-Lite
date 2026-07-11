/**
 * api/client.js
 * Configured Axios instance for NeuroTwinAI-Lite backend.
 * Auto-injects Bearer token from localStorage on every request.
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout for large files
});

// ── Request interceptor: attach JWT if present ─────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('neuro_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: normalise errors ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout');
      const err = new Error('Request timed out. Please try again.');
      err.displayMessage = 'Request timed out. Please try again.';
      return Promise.reject(err);
    }
    
    if (error.response) {
      console.error('🔴 Server error:', error.response.status, error.response.data);
      
      const detail =
        error.response.data?.detail ||
        error.response.data?.message ||
        error.message ||
        'Server error';

      // If 401 — token expired, force logout
      if (error.response.status === 401) {
        localStorage.removeItem('neuro_token');
        localStorage.removeItem('neuro_user');
        window.dispatchEvent(new CustomEvent('neuro:logout'));
      }

      // Attach a readable message to the error object
      error.displayMessage = Array.isArray(detail)
        ? detail.map((d) => d.msg || d).join(', ')
        : String(detail);

      return Promise.reject(error);
    }
    
    if (error.request) {
      console.error('📡 No response from server:', error.request);
      const err = new Error('Network error. Please check if the backend is running.');
      err.displayMessage = 'Network error. Please check if the backend is running.';
      return Promise.reject(err);
    }

    return Promise.reject(error);
  }
);

export default api;
