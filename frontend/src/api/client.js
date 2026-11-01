import axios from 'axios';

const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Centralized Axios client configured for DevFlow API communication.
 * Configured with credentials enabled to allow automatic transmission of HttpOnly authentication cookies.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];
let onSessionExpiredCallback = null;

/**
 * Register a listener to be invoked when silent token refresh fails (session expired/revoked).
 * Allows AuthContext to cleanly transition state to unauthenticated without page reload.
 */
export const setOnSessionExpired = (callback) => {
  onSessionExpiredCallback = callback;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: automatically handles expired access tokens via HttpOnly refresh token rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Guard against non-Axios or unhandled errors
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    // Determine if this is a 401 Unauthorized on a protected endpoint
    const is401 = error.response.status === 401;
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token') ||
      originalRequest.url?.includes('/auth/logout');

    if (is401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        originalRequest._retry = true;
        // Queue concurrent requests while token renewal is actively in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent session renewal via backend cookie
        await apiClient.post('/auth/refresh-token', {});

        // Process all queued requests upon successful rotation
        processQueue(null);

        // Retry the original request with renewed session cookies
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Session fully expired, revoked, or refresh token replay detected
        processQueue(refreshError, null);

        if (typeof onSessionExpiredCallback === 'function') {
          onSessionExpiredCallback();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
