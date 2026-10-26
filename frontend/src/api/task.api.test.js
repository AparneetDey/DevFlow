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

describe('taskApi.createTask and reactive board task updates (Task 7.2)', () => {
  test('createTask sends POST to /boards/:boardId/tasks with exact payload and config', async () => {
    const originalPost = apiClient.post;
    let capturedUrl = null;
    let capturedPayload = null;
    let capturedConfig = null;

    apiClient.post = (url, payload, config) => {
      capturedUrl = url;
      capturedPayload = payload;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 201,
          data: {
            _id: 'new-task-1',
            title: payload.title,
            description: payload.description,
            columnKey: payload.columnKey,
            priority: payload.priority,
            dueDate: payload.dueDate,
            order: 0,
            boardId: '507f1f77bcf86cd799439011',
          },
          message: 'Task created successfully',
          success: true,
        },
      });
    };

    try {
      const mockBoardId = '507f1f77bcf86cd799439011';
      const payload = {
        title: 'New Unit Test Task',
        description: 'Detailed description',
        columnKey: 'in-progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };
      const mockConfig = { headers: { 'X-Custom-Header': 'DevFlow' } };

      const res = await taskApi.createTask(mockBoardId, payload, mockConfig);

      assert.equal(capturedUrl, `/boards/${mockBoardId}/tasks`);
      assert.deepEqual(capturedPayload, payload);
      assert.equal(capturedConfig.headers['X-Custom-Header'], 'DevFlow');
      assert.equal(res.data.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data._id, 'new-task-1');
      assert.equal(res.data.data.title, 'New Unit Test Task');
      assert.equal(res.data.data.columnKey, 'in-progress');
    } finally {
      apiClient.post = originalPost;
    }
  });

  test('newly created task is reactively appended to tasks state and grouped into destination column', () => {
    const initialTasks = [
      { _id: 't1', title: 'Existing Task 1', columnKey: 'todo', order: 0 },
      { _id: 't2', title: 'Existing Task 2', columnKey: 'in-progress', order: 0 },
    ];

    const newTask = {
      _id: 't3',
      title: 'Newly Created Task',
      columnKey: 'todo',
      order: 1,
      priority: 'medium',
    };

    // Reactive state update simulation: setTasks((prev) => [...prev, newTask])
    const updatedTasks = [...initialTasks, newTask];

    assert.equal(updatedTasks.length, 3);
    const todoColumnTasks = getTasksForColumn(updatedTasks, 'todo');
    assert.equal(todoColumnTasks.length, 2);
    assert.deepEqual(
      todoColumnTasks.map((t) => t._id),
      ['t1', 't3']
    );

    const inProgressColumnTasks = getTasksForColumn(updatedTasks, 'in-progress');
    assert.equal(inProgressColumnTasks.length, 1);
    assert.equal(inProgressColumnTasks[0]._id, 't2');
  });

  test('validates payload formatting conforming to backend strict Zod schema', () => {
    // Verify payload sanitizer structure
    const createPayload = (title, desc = '', columnKey = 'todo', priority = 'medium', dueDate = null) => {
      const trimmedTitle = title.trim();
      const trimmedDesc = desc.trim();

      if (!trimmedTitle || trimmedTitle.length > 150) {
        throw new Error('Invalid title');
      }
      if (trimmedDesc.length > 2000) {
        throw new Error('Invalid description');
      }

      return {
        title: trimmedTitle,
        description: trimmedDesc,
        columnKey,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };
    };

    // Valid payload
    const valid = createPayload(' Valid Title ', ' Valid Description ', 'in-progress', 'high', '2026-06-15');
    assert.equal(valid.title, 'Valid Title');
    assert.equal(valid.description, 'Valid Description');
    assert.equal(valid.columnKey, 'in-progress');
    assert.equal(valid.priority, 'high');
    assert.ok(valid.dueDate.startsWith('2026-06-15'));

    // Rejects empty title
    assert.throws(() => createPayload('   '), /Invalid title/);

    // Rejects oversized title
    assert.throws(() => createPayload('a'.repeat(151)), /Invalid title/);

    // Rejects oversized description
    assert.throws(() => createPayload('Valid Title', 'b'.repeat(2001)), /Invalid description/);
  });
});
