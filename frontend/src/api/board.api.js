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

  /**
   * Updates an existing board owned by the authenticated user.
   * Route: PATCH /api/v1/boards/:boardId
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {Object} updateData - { title?, description? }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateBoard: (boardId, updateData, config = {}) =>
    apiClient.patch(`/boards/${boardId}`, updateData, config),

  /**
   * Deletes a board and cascades deletion to all associated tasks.
   * Route: DELETE /api/v1/boards/:boardId
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteBoard: (boardId, config = {}) =>
    apiClient.delete(`/boards/${boardId}`, config),
};

export default boardApi;
