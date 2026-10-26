import apiClient from './client.js';

/**
 * Dedicated API service for DevFlow task endpoints.
 * All requests rely on HttpOnly cookie credentials managed by the browser.
 */
export const taskApi = {
  /**
   * Retrieves all tasks belonging to a board.
   * Route: GET /api/v1/boards/:boardId/tasks
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {Object} [config] - Optional Axios request configuration (e.g. { signal, params })
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getTasksByBoard: (boardId, config = {}) =>
    apiClient.get(`/boards/${boardId}/tasks`, config),
};

export default taskApi;
