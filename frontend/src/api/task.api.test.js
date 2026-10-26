import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { taskApi } from './task.api.js';
import apiClient from './client.js';
import { getTasksForColumn, getUnmatchedTasks } from '../utils/taskGrouping.js';

describe('taskApi service', () => {
  test('getTasksByBoard constructs the correct endpoint and forwards config', async () => {
    // Intercept/mock apiClient.get temporarily
    const originalGet = apiClient.get;
    let capturedUrl = null;
    let capturedConfig = null;

    apiClient.get = (url, config) => {
      capturedUrl = url;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: [
            {
              _id: 'task-1',
              title: 'Test Task',
              columnKey: 'todo',
              order: 0,
              priority: 'high',
              dueDate: null,
            },
          ],
          message: 'Tasks fetched successfully',
          success: true,
        },
      });
    };

    try {
      const mockSignal = {};
      const res = await taskApi.getTasksByBoard('507f1f77bcf86cd799439011', { signal: mockSignal });

      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011/tasks');
      assert.equal(capturedConfig.signal, mockSignal);
      assert.equal(res.data.success, true);
      assert.equal(Array.isArray(res.data.data), true);
      assert.equal(res.data.data[0].title, 'Test Task');
      assert.equal(res.data.data[0].columnKey, 'todo');
    } finally {
      apiClient.get = originalGet;
    }
  });

  test('response envelope contract verification', () => {
    // Standard DevFlow ApiResponse envelope
    const mockEnvelope = {
      statusCode: 200,
      data: [
        { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0 },
        { _id: 't2', title: 'Task 2', columnKey: 'in-progress', order: 0 },
      ],
      message: 'Tasks fetched successfully',
      success: true,
    };

    const parsedTasks = Array.isArray(mockEnvelope.data) ? mockEnvelope.data : [];
    assert.equal(parsedTasks.length, 2);
    assert.equal(parsedTasks[0]._id, 't1');
    assert.equal(parsedTasks[1]._id, 't2');
  });
});

describe('Task display, column mapping, and edge case safety', () => {
  const mockTasks = [
    { _id: 't1', title: 'Task In Todo 1', columnKey: 'todo', order: 1 },
    { _id: 't2', title: 'Task In Todo 0', columnKey: 'todo', order: 0 },
    { _id: 't3', title: 'Task In Progress', columnKey: 'in-progress', order: 0 },
    { _id: 't4', title: 'Task Unknown Column', columnKey: 'archived', order: 0 },
    { _id: 't5', title: 'Task Missing ColumnKey', order: 0 },
    null,
    undefined,
    { title: 123, columnKey: 'todo' }, // non-string title filtered out
  ];

  test('tasks render in their correct matching columns in ascending order', () => {
    const todoTasks = getTasksForColumn(mockTasks, 'todo');
    assert.deepEqual(
      todoTasks.map((t) => t._id),
      ['t2', 't1']
    );

    const inProgressTasks = getTasksForColumn(mockTasks, 'in-progress');
    assert.deepEqual(
      inProgressTasks.map((t) => t._id),
      ['t3']
    );
  });

  test('columns without matching tasks return empty array (triggering empty state)', () => {
    const doneTasks = getTasksForColumn(mockTasks, 'done');
    assert.deepEqual(doneTasks, []);
  });

  test('tasks with missing or unknown columns are safely filtered out without crashing', () => {
    const boardColumns = [
      { key: 'todo', title: 'Todo' },
      { key: 'in-progress', title: 'In Progress' },
      { key: 'done', title: 'Done' },
    ];

    const unmatched = getUnmatchedTasks(mockTasks, boardColumns);
    // t4 has columnKey 'archived', t5 has no columnKey
    assert.deepEqual(
      unmatched.map((t) => t._id),
      ['t4', 't5']
    );
  });

  test('missing optional fields (description, priority, dueDate) are handled gracefully', () => {
    const minimalTask = {
      _id: 'min-1',
      title: 'Minimal Task',
      columnKey: 'todo',
      order: 0,
    };

    const tasks = getTasksForColumn([minimalTask], 'todo');
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].title, 'Minimal Task');
    assert.equal(tasks[0].description, undefined);
    assert.equal(tasks[0].priority, undefined);
    assert.equal(tasks[0].dueDate, undefined);
  });
});
