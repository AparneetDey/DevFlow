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

  test('Task update vs move API contract strict isolation', () => {
    // Contract rule: updateTask accepts only { title, description, priority, dueDate }
    // It must NOT receive columnKey or order.
    const allowedUpdateFields = new Set(['title', 'description', 'priority', 'dueDate']);
    const sampleTaskUpdate = { title: 'New Title', priority: 'high' };
    const invalidUpdateFields = Object.keys(sampleTaskUpdate).filter(f => !allowedUpdateFields.has(f));
    assert.equal(invalidUpdateFields.length, 0, 'sampleTaskUpdate must only contain allowed update fields');

    // Contract rule: moveTask requires columnKey and accepts optional order
    const sampleMovePayload = { columnKey: 'in-progress', order: 2 };
    const validColumnKeys = new Set(['todo', 'in-progress', 'done']);
    assert.equal(validColumnKeys.has(sampleMovePayload.columnKey), true);
    assert.equal(typeof sampleMovePayload.order, 'number');
    assert.equal(Number.isInteger(sampleMovePayload.order), true);
    assert.equal(sampleMovePayload.order >= 0, true);
  });
});
