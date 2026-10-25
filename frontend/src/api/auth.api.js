import apiClient from './client.js';

/**
 * Dedicated API service for DevFlow authentication endpoints.
 * All requests rely on HttpOnly cookie credentials managed by the browser.
 */
export const authApi = {
  /**
   * Registers a new user account.
   * @param {Object} userData - { username, email, password }
   */
  register: (userData) => apiClient.post('/auth/register', userData),

  /**
   * Authenticates user credentials.
   * @param {Object} credentials - { email, password }
   */
  login: (credentials) => apiClient.post('/auth/login', credentials),

  /**
   * Rotates the refresh token and issues a fresh access token pair.
   */
  refreshToken: () => apiClient.post('/auth/refresh-token', {}),

  /**
   * Terminates the current authenticated session and clears cookies.
   */
  logout: () => apiClient.delete('/auth/logout'),

  /**
   * Retrieves the currently authenticated user profile.
   */
  getCurrentUser: () => apiClient.get('/auth/me'),
};

export default authApi;
