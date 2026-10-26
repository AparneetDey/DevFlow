import apiClient from './client.js';

/**
 * Dedicated API service for DevFlow board endpoints.
 * All requests rely on HttpOnly cookie credentials managed by the browser.
 */
export const boardApi = {
  /**
   * Retrieves all boards owned by the authenticated user.
   * Route: GET /api/v1/boards
   *
   * @param {Object} [config] - Optional Axios request configuration (e.g. { signal })
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getBoards: (config = {}) => apiClient.get('/boards', config),

  /**
   * Creates a new board owned by the authenticated user.
   * Route: POST /api/v1/boards
   *
   * @param {Object} boardData - { title, description }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createBoard: (boardData, config = {}) => apiClient.post('/boards', boardData, config),
};

export default boardApi;
