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
   * Retrieves a single board by its identifier.
   * Route: GET /api/v1/boards/:boardId
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {Object} [config] - Optional Axios request configuration (e.g. { signal })
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  getBoardById: (boardId, config = {}) =>
    apiClient.get(`/boards/${boardId}`, config),

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

  /**
   * Adds a new column to a board.
   * Route: POST /api/v1/boards/:boardId/columns
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {Object} columnData - { name: string }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  addColumn: (boardId, columnData, config = {}) =>
    apiClient.post(`/boards/${boardId}/columns`, columnData, config),

  /**
   * Renames an existing column on a board.
   * Route: PATCH /api/v1/boards/:boardId/columns/:columnKey
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {string} columnKey - Unique column key
   * @param {Object} columnData - { name: string }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  renameColumn: (boardId, columnKey, columnData, config = {}) =>
    apiClient.patch(`/boards/${boardId}/columns/${columnKey}`, columnData, config),

  /**
   * Deletes a column from a board.
   * Route: DELETE /api/v1/boards/:boardId/columns/:columnKey
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {string} columnKey - Unique column key
   * @param {Object} payload - { action: 'move'|'delete', targetColumnKey?: string }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  deleteColumn: (boardId, columnKey, payload, config = {}) =>
    apiClient.delete(`/boards/${boardId}/columns/${columnKey}`, { data: payload, ...config }),

  /**
   * Reorders columns on a board.
   * Route: PATCH /api/v1/boards/:boardId/columns/reorder
   *
   * @param {string} boardId - MongoDB ObjectId string
   * @param {Object} payload - { columnKeys: string[] }
   * @param {Object} [config] - Optional Axios request configuration
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  reorderColumns: (boardId, payload, config = {}) =>
    apiClient.patch(`/boards/${boardId}/columns/reorder`, payload, config),
};

export default boardApi;
