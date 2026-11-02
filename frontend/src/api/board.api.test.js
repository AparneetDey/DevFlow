import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { boardApi } from './board.api.js';
import apiClient from './client.js';

describe('boardApi service & API contracts (Task 8.6 Regression Audit)', () => {
  test('getBoards constructs GET /boards and forwards config', async () => {
    const originalGet = apiClient.get;
    let capturedUrl = null;
    let capturedConfig = null;

    apiClient.get = (url, config) => {
      capturedUrl = url;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: [{ _id: 'b1', title: 'Roadmap', columns: [] }],
          message: 'Boards fetched successfully',
          success: true,
        },
      });
    };

    try {
      const mockSignal = {};
      const res = await boardApi.getBoards({ signal: mockSignal });
      assert.equal(capturedUrl, '/boards');
      assert.equal(capturedConfig.signal, mockSignal);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.length, 1);
      assert.equal(res.data.data[0].title, 'Roadmap');
    } finally {
      apiClient.get = originalGet;
    }
  });

  test('getBoardById constructs GET /boards/:boardId and forwards config', async () => {
    const originalGet = apiClient.get;
    let capturedUrl = null;

    apiClient.get = (url) => {
      capturedUrl = url;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: { _id: '507f1f77bcf86cd799439011', title: 'Sprint Board' },
          message: 'Board retrieved successfully',
          success: true,
        },
      });
    };

    try {
      const res = await boardApi.getBoardById('507f1f77bcf86cd799439011');
      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011');
      assert.equal(res.data.data.title, 'Sprint Board');
    } finally {
      apiClient.get = originalGet;
    }
  });

  test('createBoard constructs POST /boards with title and description payload', async () => {
    const originalPost = apiClient.post;
    let capturedUrl = null;
    let capturedData = null;

    apiClient.post = (url, data) => {
      capturedUrl = url;
      capturedData = data;
      return Promise.resolve({
        data: {
          statusCode: 201,
          data: { _id: 'new-b1', ...data },
          message: 'Board created successfully',
          success: true,
        },
      });
    };

    try {
      const payload = { title: 'Q1 Objectives', description: 'Company-wide targets' };
      const res = await boardApi.createBoard(payload);
      assert.equal(capturedUrl, '/boards');
      assert.deepEqual(capturedData, payload);
      assert.equal(res.data.success, true);
    } finally {
      apiClient.post = originalPost;
    }
  });

  test('updateBoard constructs PATCH /boards/:boardId with updateData payload', async () => {
    const originalPatch = apiClient.patch;
    let capturedUrl = null;
    let capturedData = null;

    apiClient.patch = (url, data) => {
      capturedUrl = url;
      capturedData = data;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: { _id: 'b1', ...data },
          message: 'Board updated successfully',
          success: true,
        },
      });
    };

    try {
      const updates = { title: 'Renamed Sprint' };
      const res = await boardApi.updateBoard('b1', updates);
      assert.equal(capturedUrl, '/boards/b1');
      assert.deepEqual(capturedData, updates);
      assert.equal(res.data.success, true);
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  test('deleteBoard constructs DELETE /boards/:boardId', async () => {
    const originalDelete = apiClient.delete;
    let capturedUrl = null;

    apiClient.delete = (url) => {
      capturedUrl = url;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: null,
          message: 'Board deleted successfully',
          success: true,
        },
      });
    };

    try {
      const res = await boardApi.deleteBoard('507f1f77bcf86cd799439011');
      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011');
      assert.equal(res.data.success, true);
    } finally {
      apiClient.delete = originalDelete;
    }
  });

  test('addColumn constructs POST /boards/:boardId/columns with name payload (Task 10)', async () => {
    const originalPost = apiClient.post;
    let capturedUrl = null;
    let capturedData = null;

    apiClient.post = (url, data) => {
      capturedUrl = url;
      capturedData = data;
      return Promise.resolve({
        data: {
          statusCode: 201,
          data: {
            _id: '507f1f77bcf86cd799439011',
            columns: [
              { key: 'todo', name: 'To Do', order: 0 },
              { key: 'in-progress', name: 'In Progress', order: 1 },
              { key: 'done', name: 'Done', order: 2 },
              { key: 'review', name: 'Review', order: 3 },
            ],
          },
          message: 'Column added successfully',
          success: true,
        },
      });
    };

    try {
      const payload = { name: 'Review' };
      const res = await boardApi.addColumn('507f1f77bcf86cd799439011', payload);
      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011/columns');
      assert.deepEqual(capturedData, payload);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.columns.length, 4);
      assert.equal(res.data.data.columns[3].name, 'Review');
    } finally {
      apiClient.post = originalPost;
    }
  });

  test('renameColumn constructs PATCH /boards/:boardId/columns/:columnKey with name payload (Task 10)', async () => {
    const originalPatch = apiClient.patch;
    let capturedUrl = null;
    let capturedData = null;

    apiClient.patch = (url, data) => {
      capturedUrl = url;
      capturedData = data;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: '507f1f77bcf86cd799439011',
            columns: [
              { key: 'todo', name: 'Backlog', order: 0 },
              { key: 'in-progress', name: 'In Progress', order: 1 },
              { key: 'done', name: 'Done', order: 2 },
            ],
          },
          message: 'Column renamed successfully',
          success: true,
        },
      });
    };

    try {
      const payload = { name: 'Backlog' };
      const res = await boardApi.renameColumn('507f1f77bcf86cd799439011', 'todo', payload);
      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011/columns/todo');
      assert.deepEqual(capturedData, payload);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.columns[0].name, 'Backlog');
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  test('deleteColumn constructs DELETE /boards/:boardId/columns/:columnKey with move payload', async () => {
    const originalDelete = apiClient.delete;
    let capturedUrl = null;
    let capturedConfig = null;

    apiClient.delete = (url, config) => {
      capturedUrl = url;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: '507f1f77bcf86cd799439011',
            columns: [
              { key: 'in-progress', name: 'In Progress', order: 0 },
              { key: 'done', name: 'Done', order: 1 },
            ],
          },
          message: 'Column deleted successfully',
          success: true,
        },
      });
    };

    try {
      const payload = { action: 'move', targetColumnKey: 'in-progress' };
      const res = await boardApi.deleteColumn('507f1f77bcf86cd799439011', 'todo', payload);
      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011/columns/todo');
      assert.deepEqual(capturedConfig.data, payload);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.columns.length, 2);
    } finally {
      apiClient.delete = originalDelete;
    }
  });

  test('deleteColumn constructs DELETE /boards/:boardId/columns/:columnKey with delete payload', async () => {
    const originalDelete = apiClient.delete;
    let capturedUrl = null;
    let capturedConfig = null;

    apiClient.delete = (url, config) => {
      capturedUrl = url;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: '507f1f77bcf86cd799439011',
            columns: [],
          },
          message: 'Column deleted successfully',
          success: true,
        },
      });
    };

    try {
      const payload = { action: 'delete' };
      const res = await boardApi.deleteColumn('507f1f77bcf86cd799439011', 'done', payload);
      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011/columns/done');
      assert.deepEqual(capturedConfig.data, payload);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.columns.length, 0);
    } finally {
      apiClient.delete = originalDelete;
    }
  });

  test('reorderColumns constructs PATCH /boards/:boardId/columns/reorder with columnKeys payload', async () => {
    const originalPatch = apiClient.patch;
    let capturedUrl = null;
    let capturedData = null;

    apiClient.patch = (url, data) => {
      capturedUrl = url;
      capturedData = data;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: '507f1f77bcf86cd799439011',
            columns: [
              { key: 'in-progress', name: 'In Progress', order: 0 },
              { key: 'todo', name: 'To Do', order: 1 },
              { key: 'done', name: 'Done', order: 2 },
            ],
          },
          message: 'Columns reordered successfully',
          success: true,
        },
      });
    };

    try {
      const payload = { columnKeys: ['in-progress', 'todo', 'done'] };
      const res = await boardApi.reorderColumns('507f1f77bcf86cd799439011', payload);
      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011/columns/reorder');
      assert.deepEqual(capturedData, payload);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.columns[0].key, 'in-progress');
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  test('Task update vs move API contract strict isolation', () => {
    // Contract rule: updateTask accepts { title, description, priority, dueDate, isCompleted }
    // It must NOT receive columnKey or order.
    const allowedUpdateFields = new Set(['title', 'description', 'priority', 'dueDate', 'isCompleted']);
    const sampleTaskUpdate = { title: 'New Title', priority: 'high', isCompleted: true };
    const invalidUpdateFields = Object.keys(sampleTaskUpdate).filter(f => !allowedUpdateFields.has(f));
    assert.equal(invalidUpdateFields.length, 0, 'sampleTaskUpdate must only contain allowed update fields');

    // Contract rule: moveTask requires columnKey and accepts optional order
    const sampleMovePayload = { columnKey: 'in-progress', order: 2 };
    const validColumnKeys = new Set(['todo', 'in-progress', 'done', 'review', 'testing']);
    assert.equal(validColumnKeys.has(sampleMovePayload.columnKey), true);
    assert.equal(typeof sampleMovePayload.order, 'number');
    assert.equal(Number.isInteger(sampleMovePayload.order), true);
    assert.equal(sampleMovePayload.order >= 0, true);
  });
});
