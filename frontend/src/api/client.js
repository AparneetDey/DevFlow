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

export default apiClient;
