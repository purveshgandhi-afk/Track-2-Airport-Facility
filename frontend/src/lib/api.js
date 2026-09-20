/**
 * API client  centralised axios instance.
 * All requests go through here so base URL and error handling
 * are configured in one place.
 *
 * Phase 1: instance is created but no calls are made yet.
 * Phase 4: replace mock data imports with calls from this module.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor  normalise errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
