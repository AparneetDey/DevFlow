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

  /**
   * Creates a new task under a specified board.
   * Route: POST /api/v1/boards/:boardId/tasks
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {Object} taskData - { title, description?, columnKey?, priority?, dueDate? }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  createTask: (boardId, taskData, config = {}) =>
    apiClient.post(`/boards/${boardId}/tasks`, taskData, config),

  /**
   * Retrieves a single task by ID under a specified board.
   * Route: GET /api/v1/boards/:boardId/tasks/:taskId
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {string} taskId - MongoDB ObjectId string
   * @param {Object} [config] - Optional Axios request configuration (e.g. { signal })
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getTaskById: (boardId, taskId, config = {}) =>
    apiClient.get(`/boards/${boardId}/tasks/${taskId}`, config),

  /**
   * Updates an existing task under a specified board.
   * Route: PATCH /api/v1/boards/:boardId/tasks/:taskId
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {string} taskId - MongoDB ObjectId string
   * @param {Object} updateData - { title?, description?, priority?, dueDate? }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  updateTask: (boardId, taskId, updateData, config = {}) =>
    apiClient.patch(`/boards/${boardId}/tasks/${taskId}`, updateData, config),

  /**
   * Moves a task to a different column or reorders within a column.
   * Route: PATCH /api/v1/boards/:boardId/tasks/:taskId/move
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {string} taskId - MongoDB ObjectId string
   * @param {Object} moveData - { columnKey, order? }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  moveTask: (boardId, taskId, moveData, config = {}) =>
    apiClient.patch(`/boards/${boardId}/tasks/${taskId}/move`, moveData, config),
};

export default taskApi;
