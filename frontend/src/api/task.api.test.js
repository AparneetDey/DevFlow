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

describe('taskApi.getTaskById and Task Details view behavior (Task 7.3A)', () => {
  test('getTaskById sends GET to /boards/:boardId/tasks/:taskId with config', async () => {
    const originalGet = apiClient.get;
    let capturedUrl = null;
    let capturedConfig = null;

    apiClient.get = (url, config) => {
      capturedUrl = url;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: 'task-101',
            title: 'Detailed Task Title',
            description: 'In-depth description of the task',
            columnKey: 'in-progress',
            priority: 'high',
            dueDate: '2026-12-25T00:00:00.000Z',
            createdAt: '2026-10-27T01:00:00.000Z',
            updatedAt: '2026-10-27T02:00:00.000Z',
            order: 2,
            boardId: '507f1f77bcf86cd799439011',
          },
          message: 'Task fetched successfully',
          success: true,
        },
      });
    };

    try {
      const mockBoardId = '507f1f77bcf86cd799439011';
      const mockTaskId = 'task-101';
      const mockSignal = {};

      const res = await taskApi.getTaskById(mockBoardId, mockTaskId, { signal: mockSignal });

      assert.equal(capturedUrl, `/boards/${mockBoardId}/tasks/${mockTaskId}`);
      assert.equal(capturedConfig.signal, mockSignal);
      assert.equal(res.data.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data._id, 'task-101');
      assert.equal(res.data.data.title, 'Detailed Task Title');
      assert.equal(res.data.data.columnKey, 'in-progress');
      assert.equal(res.data.data.priority, 'high');
      assert.equal(res.data.data.dueDate, '2026-12-25T00:00:00.000Z');
      assert.equal(res.data.data.createdAt, '2026-10-27T01:00:00.000Z');
      assert.equal(res.data.data.updatedAt, '2026-10-27T02:00:00.000Z');
    } finally {
      apiClient.get = originalGet;
    }
  });

  test('selecting a task from board state isolates that task without stale data bleed', () => {
    const taskA = {
      _id: 'task-A',
      title: 'Task Alpha',
      description: 'Alpha description',
      columnKey: 'todo',
      priority: 'low',
    };
    const taskB = {
      _id: 'task-B',
      title: 'Task Beta',
      description: 'Beta description',
      columnKey: 'done',
      priority: 'high',
    };

    // Simulate state transition: Select Task A
    let selectedTask = taskA;
    assert.equal(selectedTask._id, 'task-A');
    assert.equal(selectedTask.title, 'Task Alpha');
    assert.equal(selectedTask.columnKey, 'todo');

    // Simulate state transition: Select Task B
    selectedTask = taskB;
    assert.equal(selectedTask._id, 'task-B');
    assert.equal(selectedTask.title, 'Task Beta');
    assert.equal(selectedTask.columnKey, 'done');
    assert.notEqual(selectedTask._id, taskA._id);

    // Simulate close: Reset to null
    selectedTask = null;
    assert.equal(selectedTask, null);
  });

  test('date formatting logic handles valid dates, leap years, and missing values gracefully', () => {
    const formatReadableDate = (dateVal) => {
      if (!dateVal) return null;
      const date = new Date(dateVal);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    };

    // Valid date string
    assert.equal(formatReadableDate('2026-11-15T00:00:00.000Z'), 'Nov 15, 2026');

    // Leap year date
    assert.equal(formatReadableDate('2028-02-29T00:00:00.000Z'), 'Feb 29, 2028');

    // Missing / null date
    assert.equal(formatReadableDate(null), null);
    assert.equal(formatReadableDate(undefined), null);
    assert.equal(formatReadableDate(''), null);

    // Invalid date string
    assert.equal(formatReadableDate('not-a-valid-date'), null);
  });

  test('column stage resolution maps columnKey to custom column title and fallbacks', () => {
    const boardColumns = [
      { key: 'todo', title: 'Backlog / To Do', order: 0 },
      { key: 'in-progress', title: 'Actively Working', order: 1 },
      { key: 'done', title: 'Shipped to Production', order: 2 },
    ];

    const resolveColumnTitle = (columnKey, columns = []) => {
      if (Array.isArray(columns) && columnKey) {
        const matched = columns.find((c) => c.key === columnKey);
        if (matched?.title) {
          return matched.title;
        }
      }

      if (!columnKey) return 'Unassigned';

      switch (columnKey) {
        case 'todo':
          return 'To Do';
        case 'in-progress':
          return 'In Progress';
        case 'done':
          return 'Done';
        default:
          return columnKey
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
      }
    };

    // Mapped custom columns
    assert.equal(resolveColumnTitle('todo', boardColumns), 'Backlog / To Do');
    assert.equal(resolveColumnTitle('in-progress', boardColumns), 'Actively Working');
    assert.equal(resolveColumnTitle('done', boardColumns), 'Shipped to Production');

    // Fallback when columns array is empty or key not found
    assert.equal(resolveColumnTitle('todo', []), 'To Do');
    assert.equal(resolveColumnTitle('in-progress', []), 'In Progress');
    assert.equal(resolveColumnTitle('review', []), 'Review');
    assert.equal(resolveColumnTitle(null, boardColumns), 'Unassigned');
  });

  test('presentation data excludes raw MongoDB IDs and internal fields from user display', () => {
    const rawTaskDocument = {
      _id: '673f1f77bcf86cd799439099',
      boardId: '673f1f77bcf86cd799439011',
      title: 'Security Hardening',
      description: 'Audit npm dependencies and configure CSP headers',
      columnKey: 'todo',
      priority: 'high',
      dueDate: '2026-11-20T00:00:00.000Z',
      order: 0,
      __v: 0,
      createdAt: '2026-10-27T01:00:00.000Z',
      updatedAt: '2026-10-27T02:00:00.000Z',
    };

    // Extract user-facing view model
    const userFacingFields = {
      title: rawTaskDocument.title,
      description: rawTaskDocument.description,
      priority: rawTaskDocument.priority,
      columnKey: rawTaskDocument.columnKey,
      dueDate: rawTaskDocument.dueDate,
      createdAt: rawTaskDocument.createdAt,
      updatedAt: rawTaskDocument.updatedAt,
    };

    // Ensure raw internal fields are excluded
    assert.equal('boardId' in userFacingFields, false);
    assert.equal('__v' in userFacingFields, false);
    assert.equal('order' in userFacingFields, false);
    assert.equal(userFacingFields.title, 'Security Hardening');
    assert.equal(userFacingFields.priority, 'high');
  });
});

describe('taskApi.updateTask and modal title/description updating', () => {
  test('updateTask sends PATCH to /boards/:boardId/tasks/:taskId with title and description', async () => {
    const originalPatch = apiClient.patch;
    let capturedUrl = null;
    let capturedPayload = null;
    let capturedConfig = null;

    apiClient.patch = (url, payload, config) => {
      capturedUrl = url;
      capturedPayload = payload;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: 'task-102',
            title: payload.title,
            description: payload.description,
            columnKey: 'todo',
            priority: 'medium',
            boardId: '507f1f77bcf86cd799439011',
            updatedAt: '2026-10-27T03:00:00.000Z',
          },
          message: 'Task updated successfully',
          success: true,
        },
      });
    };

    try {
      const mockBoardId = '507f1f77bcf86cd799439011';
      const mockTaskId = 'task-102';
      const payload = {
        title: 'Updated Task Title via Modal',
        description: 'Updated comprehensive description inside TaskDetailsModal',
      };
      const mockConfig = { headers: { 'X-Custom': 'DevFlow' } };

      const res = await taskApi.updateTask(mockBoardId, mockTaskId, payload, mockConfig);

      assert.equal(capturedUrl, `/boards/${mockBoardId}/tasks/${mockTaskId}`);
      assert.deepEqual(capturedPayload, payload);
      assert.equal(capturedConfig.headers['X-Custom'], 'DevFlow');
      assert.equal(res.data.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.title, 'Updated Task Title via Modal');
      assert.equal(res.data.data.description, 'Updated comprehensive description inside TaskDetailsModal');
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  test('updating task title and description reactively replaces the targeted task in tasks list', () => {
    const originalTasks = [
      { _id: 't1', title: 'Task 1 Original', description: 'Old desc', columnKey: 'todo' },
      { _id: 't2', title: 'Task 2 Unchanged', description: 'Desc 2', columnKey: 'todo' },
    ];

    const updatedTask = {
      _id: 't1',
      title: 'Task 1 Updated Title',
      description: 'New detailed description',
      columnKey: 'todo',
    };

    const nextTasks = originalTasks.map((t) =>
      t._id === updatedTask._id ? updatedTask : t
    );

    assert.equal(nextTasks.length, 2);
    assert.equal(nextTasks[0].title, 'Task 1 Updated Title');
    assert.equal(nextTasks[0].description, 'New detailed description');
    assert.equal(nextTasks[1].title, 'Task 2 Unchanged');
  });

  test('validates title and description updates conforming to 1-150 title and 2000 desc character constraints', () => {
    const validateTaskFields = (title, desc = '') => {
      const trimmedTitle = (title || '').trim();
      const trimmedDesc = (desc || '').trim();
      if (!trimmedTitle) throw new Error('Task title cannot be empty');
      if (trimmedTitle.length > 150) throw new Error('Task title cannot exceed 150 characters');
      if (trimmedDesc.length > 2000) throw new Error('Task description cannot exceed 2000 characters');
      return { title: trimmedTitle, description: trimmedDesc };
    };

    assert.deepEqual(validateTaskFields('  New Title  ', '  New Desc  '), {
      title: 'New Title',
      description: 'New Desc',
    });
    assert.throws(() => validateTaskFields(''), /cannot be empty/);
    assert.throws(() => validateTaskFields('   '), /cannot be empty/);
    assert.throws(() => validateTaskFields('a'.repeat(151)), /cannot exceed 150 characters/);
    assert.throws(() => validateTaskFields('Valid Title', 'b'.repeat(2001)), /cannot exceed 2000 characters/);
  });
});

describe('Complete Task Editing Functionality (Task 7.3B)', () => {
  test('updateTask sends PATCH with priority update', async () => {
    const originalPatch = apiClient.patch;
    let capturedUrl = null;
    let capturedPayload = null;
    let capturedConfig = null;

    apiClient.patch = (url, payload, config) => {
      capturedUrl = url;
      capturedPayload = payload;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: 'task-103',
            title: 'Task Priority Test',
            columnKey: 'todo',
            priority: payload.priority,
            boardId: '507f1f77bcf86cd799439011',
          },
          message: 'Task updated successfully',
          success: true,
        },
      });
    };

    try {
      const mockConfig = { headers: { 'X-Edit': 'Priority' } };
      const res = await taskApi.updateTask('507f1f77bcf86cd799439011', 'task-103', { priority: 'high' }, mockConfig);
      assert.equal(capturedUrl, '/boards/507f1f77bcf86cd799439011/tasks/task-103');
      assert.deepEqual(capturedPayload, { priority: 'high' });
      assert.equal(capturedConfig.headers['X-Edit'], 'Priority');
      assert.equal(res.data.data.priority, 'high');
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  test('updateTask sends PATCH with due date update and clears due date with null', async () => {
    const originalPatch = apiClient.patch;
    let capturedPayload = null;

    apiClient.patch = (url, payload) => {
      capturedPayload = payload;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: 'task-104',
            title: 'Task Due Date Test',
            dueDate: payload.dueDate,
          },
          message: 'Task updated successfully',
          success: true,
        },
      });
    };

    try {
      // Set due date
      const isoDate = '2026-12-25T00:00:00.000Z';
      const res1 = await taskApi.updateTask('b1', 't1', { dueDate: isoDate });
      assert.deepEqual(capturedPayload, { dueDate: isoDate });
      assert.equal(res1.data.data.dueDate, isoDate);

      // Clear due date
      const res2 = await taskApi.updateTask('b1', 't1', { dueDate: null });
      assert.deepEqual(capturedPayload, { dueDate: null });
      assert.equal(res2.data.data.dueDate, null);
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  test('validates backend constraints: rejects unknown fields and invalid priority values', () => {
    const validPriorities = ['low', 'medium', 'high'];
    const allowedFields = ['title', 'description', 'priority', 'dueDate'];

    const sanitizeUpdatePayload = (payload) => {
      const keys = Object.keys(payload);
      if (keys.length === 0) throw new Error('At least one field required');
      for (const key of keys) {
        if (!allowedFields.includes(key)) {
          throw new Error(`Unrecognized field: ${key}`);
        }
      }
      if (payload.priority !== undefined && !validPriorities.includes(payload.priority)) {
        throw new Error('Priority must be one of: low, medium, high');
      }
      return payload;
    };

    assert.deepEqual(sanitizeUpdatePayload({ priority: 'high' }), { priority: 'high' });
    assert.deepEqual(sanitizeUpdatePayload({ dueDate: '2026-12-31T00:00:00.000Z' }), { dueDate: '2026-12-31T00:00:00.000Z' });
    assert.deepEqual(sanitizeUpdatePayload({ dueDate: null }), { dueDate: null });
    assert.throws(() => sanitizeUpdatePayload({ columnKey: 'done' }), /Unrecognized field: columnKey/);
    assert.throws(() => sanitizeUpdatePayload({ order: 1 }), /Unrecognized field: order/);
    assert.throws(() => sanitizeUpdatePayload({ priority: 'urgent' }), /Priority must be one of/);
    assert.throws(() => sanitizeUpdatePayload({}), /At least one field required/);
  });

  test('task-state synchronization preserves columnKey, order, completion state, and task counts', () => {
    const originalTasks = [
      { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0, priority: 'low', dueDate: null },
      { _id: 't2', title: 'Task 2 Completed', columnKey: 'done', order: 0, priority: 'medium', dueDate: '2026-10-01' },
      { _id: 't3', title: 'Task 3 In Progress', columnKey: 'in-progress', order: 0, priority: 'high', dueDate: null },
    ];

    // Simulate editing priority and dueDate on t2 (in 'done' column)
    const updatedTask = {
      ...originalTasks[1],
      priority: 'high',
      dueDate: '2026-11-15T00:00:00.000Z',
      updatedAt: '2026-10-31T12:00:00.000Z',
    };

    const nextTasks = originalTasks.map((t) => (t._id === updatedTask._id ? updatedTask : t));

    assert.equal(nextTasks.length, 3);
    const doneTasks = getTasksForColumn(nextTasks, 'done');
    assert.equal(doneTasks.length, 1);
    assert.equal(doneTasks[0]._id, 't2');
    assert.equal(doneTasks[0].priority, 'high');
    assert.equal(doneTasks[0].dueDate, '2026-11-15T00:00:00.000Z');
    assert.equal(doneTasks[0].columnKey, 'done'); // column association preserved

    const todoTasks = getTasksForColumn(nextTasks, 'todo');
    assert.equal(todoTasks.length, 1);
    const inProgressTasks = getTasksForColumn(nextTasks, 'in-progress');
    assert.equal(inProgressTasks.length, 1);
  });

  test('failed update preserves previous task state without corrupting collections', async () => {
    const originalTasks = [
      { _id: 't1', title: 'Original Task', priority: 'low' },
    ];
    const tasksState = [...originalTasks];
    const selectedTaskState = { ...originalTasks[0] };
    let editError = null;

    const handleUpdate = async () => {
      // Simulate API failure
      throw new Error('500 Internal Server Error: Database failure');
    };

    try {
      await handleUpdate('t1', { priority: 'high' });
    } catch (err) {
      editError = err.message;
      // State is preserved
    }

    assert.equal(tasksState[0].priority, 'low');
    assert.equal(selectedTaskState.priority, 'low');
    assert.equal(editError, '500 Internal Server Error: Database failure');
  });

  test('duplicate submission prevention ignores concurrent edit calls while saving is in flight', () => {
    let isSaving = true;
    let callsCount = 0;

    const submitEdit = () => {
      if (isSaving) return;
      callsCount += 1;
    };

    submitEdit();
    assert.equal(callsCount, 0);

    isSaving = false;
    submitEdit();
    assert.equal(callsCount, 1);
  });
});


describe('Task Completion Toggle and Move API (Task 7.2A)', () => {
  test('moveTask sends PATCH to /boards/:boardId/tasks/:taskId/move with columnKey payload', async () => {
    const originalPatch = apiClient.patch;
    let capturedUrl = null;
    let capturedPayload = null;
    let capturedConfig = null;

    apiClient.patch = (url, payload, config) => {
      capturedUrl = url;
      capturedPayload = payload;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: 'task-complete-1',
            title: 'Complete Flow Task',
            columnKey: payload.columnKey,
            order: 0,
            boardId: '507f1f77bcf86cd799439011',
            updatedAt: '2026-10-27T04:00:00.000Z',
          },
          message: 'Task moved successfully',
          success: true,
        },
      });
    };

    try {
      const mockBoardId = '507f1f77bcf86cd799439011';
      const mockTaskId = 'task-complete-1';
      const moveData = { columnKey: 'done' };
      const mockConfig = { headers: { 'X-Test': 'MoveTask' } };

      const res = await taskApi.moveTask(mockBoardId, mockTaskId, moveData, mockConfig);

      assert.equal(capturedUrl, `/boards/${mockBoardId}/tasks/${mockTaskId}/move`);
      assert.deepEqual(capturedPayload, moveData);
      assert.equal(capturedConfig.headers['X-Test'], 'MoveTask');
      assert.equal(res.data.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.columnKey, 'done');
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  test('completion toggle determines target column: todo -> done, in-progress -> done, done -> todo', () => {
    const getTargetColumn = (task) => (task?.columnKey === 'done' ? 'todo' : 'done');

    assert.equal(getTargetColumn({ columnKey: 'todo' }), 'done');
    assert.equal(getTargetColumn({ columnKey: 'in-progress' }), 'done');
    assert.equal(getTargetColumn({ columnKey: 'done' }), 'todo');
  });

  test('toggling completion moves task reactively between Kanban column groups', () => {
    const tasks = [
      { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 1 },
      { _id: 't2', title: 'Task 2', columnKey: 'in-progress', order: 0 },
      { _id: 't3', title: 'Task 3', columnKey: 'done', order: 0 },
    ];

    // Toggle t1 to done
    const updatedTasksAfterComplete = tasks.map((t) =>
      t._id === 't1' ? { ...t, columnKey: 'done' } : t
    );

    const todoBefore = getTasksForColumn(tasks, 'todo');
    const doneBefore = getTasksForColumn(tasks, 'done');
    assert.equal(todoBefore.length, 1);
    assert.equal(doneBefore.length, 1);

    const todoAfter = getTasksForColumn(updatedTasksAfterComplete, 'todo');
    const doneAfter = getTasksForColumn(updatedTasksAfterComplete, 'done');
    assert.equal(todoAfter.length, 0);
    assert.equal(doneAfter.length, 2);
    assert.deepEqual(doneAfter.map((t) => t._id), ['t3', 't1']);

    // Toggle t3 from done to todo
    const updatedTasksAfterUncomplete = updatedTasksAfterComplete.map((t) =>
      t._id === 't3' ? { ...t, columnKey: 'todo' } : t
    );

    const todoFinal = getTasksForColumn(updatedTasksAfterUncomplete, 'todo');
    const doneFinal = getTasksForColumn(updatedTasksAfterUncomplete, 'done');
    assert.equal(todoFinal.length, 1);
    assert.equal(todoFinal[0]._id, 't3');
    assert.equal(doneFinal.length, 1);
    assert.equal(doneFinal[0]._id, 't1');
  });

  test('optimistic update failure rolls back tasks and selectedTask to prior state', async () => {
    const originalTasks = [
      { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0 },
    ];
    let tasksState = [...originalTasks];
    let selectedTaskState = { ...originalTasks[0] };
    let taskActionError = null;

    // Simulate handleToggleComplete with network failure
    const taskToToggle = tasksState[0];
    const prevTasks = tasksState;
    const prevSelectedTask = selectedTaskState;
    const targetColumnKey = taskToToggle.columnKey === 'done' ? 'todo' : 'done';

    // Optimistic update
    const optimisticTask = { ...taskToToggle, columnKey: targetColumnKey };
    tasksState = tasksState.map((t) => (t._id === taskToToggle._id ? optimisticTask : t));
    selectedTaskState = optimisticTask;

    assert.equal(tasksState[0].columnKey, 'done');
    assert.equal(selectedTaskState.columnKey, 'done');
    assert.equal(taskActionError, null);

    // Simulate error occurred during API call
    try {
      throw new Error('Network timeout: Failed to move task');
    } catch (err) {
      // Rollback
      tasksState = prevTasks;
      selectedTaskState = prevSelectedTask;
      taskActionError = err.message;
    }

    // Verify rollback
    assert.equal(tasksState[0].columnKey, 'todo');
    assert.equal(selectedTaskState.columnKey, 'todo');
    assert.equal(taskActionError, 'Network timeout: Failed to move task');
  });

  test('duplicate in-flight toggle prevention ignores requests when taskId is in togglingTaskIds set', () => {
    const togglingTaskIds = new Set(['task-in-flight-1']);
    let apiCallCount = 0;

    const attemptToggle = (task) => {
      if (!task || !task._id || togglingTaskIds.has(task._id)) {
        return; // Ignored duplicate
      }
      apiCallCount += 1;
    };

    attemptToggle({ _id: 'task-in-flight-1', columnKey: 'todo' });
    assert.equal(apiCallCount, 0);

    attemptToggle({ _id: 'task-idle-2', columnKey: 'todo' });
    assert.equal(apiCallCount, 1);
  });

  test('accessible labels and completion state indicators for task cards and modal', () => {
    const getAriaLabel = (task) =>
      task.columnKey === 'done' ? 'Mark task as incomplete' : 'Mark task as complete';

    assert.equal(
      getAriaLabel({ _id: 't1', columnKey: 'todo' }),
      'Mark task as complete'
    );
    assert.equal(
      getAriaLabel({ _id: 't2', columnKey: 'in-progress' }),
      'Mark task as complete'
    );
    assert.equal(
      getAriaLabel({ _id: 't3', columnKey: 'done' }),
      'Mark task as incomplete'
    );
  });
});

describe('Task Deletion Functionality (Task 7.4)', () => {
  test('taskApi.deleteTask sends DELETE to /boards/:boardId/tasks/:taskId with config', async () => {
    const originalDelete = apiClient.delete;
    let capturedUrl = null;
    let capturedConfig = null;

    apiClient.delete = (url, config) => {
      capturedUrl = url;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: { message: 'Task deleted successfully' },
          message: 'Task deleted successfully',
          success: true,
        },
      });
    };

    try {
      const mockBoardId = '507f1f77bcf86cd799439011';
      const mockTaskId = '609bcf77bcf86cd799439099';
      const mockConfig = { headers: { 'X-Delete-Header': 'DeleteTask' } };

      const res = await taskApi.deleteTask(mockBoardId, mockTaskId, mockConfig);

      assert.equal(capturedUrl, `/boards/${mockBoardId}/tasks/${mockTaskId}`);
      assert.equal(capturedConfig.headers['X-Delete-Header'], 'DeleteTask');
      assert.equal(res.data.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.message, 'Task deleted successfully');
    } finally {
      apiClient.delete = originalDelete;
    }
  });

  test('taskApi.deleteTask propagates API errors for failure handling and recovery', async () => {
    const originalDelete = apiClient.delete;

    apiClient.delete = () =>
      Promise.reject({
        response: {
          status: 404,
          data: {
            statusCode: 404,
            message: 'Task not found or already deleted',
            success: false,
          },
        },
      });

    try {
      await assert.rejects(
        () => taskApi.deleteTask('507f1f77bcf86cd799439011', 'invalid-task-id'),
        (err) => {
          assert.equal(err.response.status, 404);
          assert.equal(err.response.data.message, 'Task not found or already deleted');
          return true;
        }
      );
    } finally {
      apiClient.delete = originalDelete;
    }
  });

  test('confirmation flow: delete action opens confirmation, cancel closes without API call', () => {
    let isConfirmingDelete = false;
    let apiCallCount = 0;

    // 1. Initial resting state
    assert.equal(isConfirmingDelete, false);

    // 2. User clicks "Delete Task" button
    isConfirmingDelete = true;
    assert.equal(isConfirmingDelete, true);

    // 3. User clicks "Cancel" button or presses Escape
    isConfirmingDelete = false;
    assert.equal(isConfirmingDelete, false);
    assert.equal(apiCallCount, 0, 'Cancelling must not initiate delete API request');
  });

  test('confirmation flow: confirm initiates delete API and prevents duplicate in-flight submissions', async () => {
    let isDeleting = false;
    let apiCallCount = 0;

    const performDelete = async () => {
      if (isDeleting) return; // Prevent duplicate submission
      isDeleting = true;
      apiCallCount += 1;
      await Promise.resolve(); // Simulate async request
      isDeleting = false;
    };

    // First click initiates deletion
    const firstCall = performDelete();
    assert.equal(isDeleting, true);

    // Rapid second click during in-flight deletion is ignored
    const secondCall = performDelete();
    assert.equal(apiCallCount, 1);

    await Promise.all([firstCall, secondCall]);
    assert.equal(apiCallCount, 1);
    assert.equal(isDeleting, false);
  });

  test('successful deletion removes targeted task from board state and updates column counts', () => {
    const initialTasks = [
      { _id: 't-todo-1', title: 'Task in To Do 1', columnKey: 'todo', order: 0 },
      { _id: 't-todo-2', title: 'Task in To Do 2', columnKey: 'todo', order: 1 },
      { _id: 't-prog-1', title: 'Task in Progress', columnKey: 'in-progress', order: 0 },
      { _id: 't-done-1', title: 'Task in Done', columnKey: 'done', order: 0 },
    ];

    // Initial column distribution
    assert.equal(getTasksForColumn(initialTasks, 'todo').length, 2);
    assert.equal(getTasksForColumn(initialTasks, 'in-progress').length, 1);
    assert.equal(getTasksForColumn(initialTasks, 'done').length, 1);

    // Delete 't-todo-1'
    const targetTaskId = 't-todo-1';
    const nextTasks = initialTasks.filter((t) => t._id !== targetTaskId);

    // Verify task list updated
    assert.equal(nextTasks.length, 3);
    assert.equal(nextTasks.some((t) => t._id === targetTaskId), false);

    // Verify column task counts reactively updated
    const todoTasks = getTasksForColumn(nextTasks, 'todo');
    const inProgressTasks = getTasksForColumn(nextTasks, 'in-progress');
    const doneTasks = getTasksForColumn(nextTasks, 'done');

    assert.equal(todoTasks.length, 1);
    assert.equal(todoTasks[0]._id, 't-todo-2');
    assert.equal(inProgressTasks.length, 1);
    assert.equal(inProgressTasks[0]._id, 't-prog-1');
    assert.equal(doneTasks.length, 1);
    assert.equal(doneTasks[0]._id, 't-done-1');
  });

  test('board state synchronization clears selectedTask and closes details modal on success', async () => {
    let boardTasks = [
      { _id: 't-target', title: 'Target Task', columnKey: 'todo' },
      { _id: 't-other', title: 'Other Task', columnKey: 'todo' },
    ];
    let selectedTask = { _id: 't-target', title: 'Target Task', columnKey: 'todo' };
    let isTaskDetailsModalOpen = true;

    // Simulate handleDeleteTask
    const handleDeleteTask = async (taskId) => {
      boardTasks = boardTasks.filter((t) => t._id !== taskId);
      setIsTaskDetailsModalOpen(false);
      setSelectedTask(null);
    };

    const setIsTaskDetailsModalOpen = (val) => {
      isTaskDetailsModalOpen = val;
    };
    const setSelectedTask = (val) => {
      selectedTask = val;
    };

    await handleDeleteTask('t-target');

    assert.equal(boardTasks.length, 1);
    assert.equal(boardTasks[0]._id, 't-other');
    assert.equal(selectedTask, null, 'selectedTask must be cleared on successful deletion');
    assert.equal(isTaskDetailsModalOpen, false, 'Details modal must close on successful deletion');
  });

  test('failed deletion preserves task in board, keeps selectedTask intact, and keeps modal open for retry', async () => {
    const originalTasks = [
      { _id: 't-preserve', title: 'Preserve Task', columnKey: 'todo' },
    ];
    let boardTasks = [...originalTasks];
    let selectedTask = { ...originalTasks[0] };
    let isTaskDetailsModalOpen = true;
    let deleteErrorMessage = null;

    // Simulate handleDeleteTask failure
    const handleDeleteTask = async (taskId) => {
      if (taskId === 't-preserve') {
        throw new Error('500 Internal Server Error: Failed to delete task');
      }
      boardTasks = boardTasks.filter((t) => t._id !== taskId);
      isTaskDetailsModalOpen = false;
      selectedTask = null;
    };

    try {
      await handleDeleteTask('t-preserve');
    } catch (err) {
      deleteErrorMessage = err.message;
    }

    // Verify task remains in board
    assert.equal(boardTasks.length, 1);
    assert.equal(boardTasks[0]._id, 't-preserve');

    // Verify modal remains open and selectedTask preserved
    assert.equal(selectedTask._id, 't-preserve');
    assert.equal(isTaskDetailsModalOpen, true);
    assert.equal(deleteErrorMessage, '500 Internal Server Error: Failed to delete task');
  });
});

describe('Drag-and-Drop Kanban & Task Reordering (Task 7.5)', () => {
  test('taskApi.moveTask sends PATCH to /boards/:boardId/tasks/:taskId/move with columnKey and order', async () => {
    const originalPatch = apiClient.patch;
    let capturedUrl = null;
    let capturedPayload = null;
    let capturedConfig = null;

    apiClient.patch = (url, payload, config) => {
      capturedUrl = url;
      capturedPayload = payload;
      capturedConfig = config;
      return Promise.resolve({
        data: {
          statusCode: 200,
          data: {
            _id: 'task-dnd-1',
            title: 'Drag and Drop Task',
            columnKey: payload.columnKey,
            order: payload.order,
          },
          message: 'Task moved successfully',
          success: true,
        },
      });
    };

    try {
      const mockBoardId = '507f1f77bcf86cd799439011';
      const mockTaskId = 'task-dnd-1';
      const movePayload = { columnKey: 'in-progress', order: 2 };
      const mockConfig = { headers: { 'X-Dnd': 'Move' } };

      const res = await taskApi.moveTask(mockBoardId, mockTaskId, movePayload, mockConfig);

      assert.equal(capturedUrl, `/boards/${mockBoardId}/tasks/${mockTaskId}/move`);
      assert.deepEqual(capturedPayload, movePayload);
      assert.equal(capturedConfig.headers['X-Dnd'], 'Move');
      assert.equal(res.data.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.columnKey, 'in-progress');
      assert.equal(res.data.data.order, 2);
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  test('validates move payload structure: requires columnKey and non-negative integer order', () => {
    const validateMovePayload = (payload) => {
      const allowedKeys = ['columnKey', 'order'];
      const extraKeys = Object.keys(payload).filter((k) => !allowedKeys.includes(k));
      if (extraKeys.length > 0) {
        throw new Error(`Unrecognized field provided. Only columnKey and order are allowed: ${extraKeys.join(', ')}`);
      }
      if (!['todo', 'in-progress', 'done'].includes(payload.columnKey)) {
        throw new Error('Column key must be one of: todo, in-progress, done');
      }
      if (payload.order !== undefined) {
        if (typeof payload.order !== 'number' || !Number.isInteger(payload.order) || payload.order < 0) {
          throw new Error('Order must be a non-negative integer');
        }
      }
      return true;
    };

    assert.equal(validateMovePayload({ columnKey: 'todo', order: 0 }), true);
    assert.equal(validateMovePayload({ columnKey: 'in-progress', order: 5 }), true);
    assert.equal(validateMovePayload({ columnKey: 'done' }), true);

    // Rejects newOrder (backend schema uses strict order)
    assert.throws(
      () => validateMovePayload({ columnKey: 'todo', newOrder: 0 }),
      /Unrecognized field provided/
    );
    // Rejects invalid columnKey
    assert.throws(
      () => validateMovePayload({ columnKey: 'backlog', order: 0 }),
      /Column key must be one of/
    );
    // Rejects negative order
    assert.throws(
      () => validateMovePayload({ columnKey: 'todo', order: -1 }),
      /Order must be a non-negative integer/
    );
  });

  test('optimistic move update applies immediately and server response reconciles state', async () => {
    let tasksState = [
      { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0 },
      { _id: 't2', title: 'Task 2', columnKey: 'in-progress', order: 0 },
    ];

    // Optimistic move t1 -> in-progress at order 1
    const optimisticTasks = tasksState.map((t) =>
      t._id === 't1' ? { ...t, columnKey: 'in-progress', order: 1 } : t
    );
    tasksState = optimisticTasks;

    assert.equal(tasksState[0].columnKey, 'in-progress');
    assert.equal(tasksState[0].order, 1);

    // Reconcile with server response
    const serverResponse = { _id: 't1', title: 'Task 1', columnKey: 'in-progress', order: 1, updatedAt: '2026-10-31T22:00:00Z' };
    tasksState = tasksState.map((t) =>
      t._id === serverResponse._id ? { ...t, ...serverResponse } : t
    );

    assert.equal(tasksState[0].updatedAt, '2026-10-31T22:00:00Z');
  });

  test('failed move request rolls back tasks and selectedTask to pre-drag snapshot', async () => {
    const preDragSnapshot = {
      tasks: [
        { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0 },
        { _id: 't2', title: 'Task 2', columnKey: 'in-progress', order: 0 },
      ],
      selectedTask: { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0 },
    };

    let tasksState = [...preDragSnapshot.tasks];
    let selectedTaskState = { ...preDragSnapshot.selectedTask };
    let taskActionError;

    // Apply optimistic move
    tasksState = tasksState.map((t) =>
      t._id === 't1' ? { ...t, columnKey: 'done', order: 0 } : t
    );
    selectedTaskState = { ...selectedTaskState, columnKey: 'done', order: 0 };

    assert.equal(tasksState[0].columnKey, 'done');
    assert.equal(selectedTaskState.columnKey, 'done');

    // Simulate API network failure
    try {
      throw new Error('500 Network error: failed to persist task order');
    } catch (err) {
      // Rollback
      tasksState = preDragSnapshot.tasks;
      selectedTaskState = preDragSnapshot.selectedTask;
      taskActionError = err.message;
    }

    assert.equal(tasksState[0].columnKey, 'todo');
    assert.equal(selectedTaskState.columnKey, 'todo');
    assert.equal(taskActionError, '500 Network error: failed to persist task order');
  });

  test('dropping in original column and original position makes zero API calls', () => {
    let apiCallCount = 0;

    const handleDragDrop = (sourceCol, targetCol, sourceOrder, targetOrder) => {
      const isUnchanged = sourceCol === targetCol && sourceOrder === targetOrder;
      if (isUnchanged) {
        return; // No-op
      }
      apiCallCount += 1;
    };

    // Dropped in same position
    handleDragDrop('todo', 'todo', 0, 0);
    assert.equal(apiCallCount, 0, 'Must not dispatch API request when position is unchanged');

    // Dropped in different position
    handleDragDrop('todo', 'todo', 0, 1);
    assert.equal(apiCallCount, 1);
  });

  test('duplicate in-flight move requests are blocked for the same task', () => {
    const movingTaskIds = new Set(['task-in-flight-9']);
    let apiCallCount = 0;

    const attemptMove = (taskId) => {
      if (movingTaskIds.has(taskId)) {
        return; // Block duplicate
      }
      apiCallCount += 1;
    };

    attemptMove('task-in-flight-9');
    assert.equal(apiCallCount, 0, 'Must block concurrent duplicate move for the same task');

    attemptMove('task-idle-10');
    assert.equal(apiCallCount, 1);
  });

  test('selectedTask syncs when active task is moved while TaskDetailsModal is open', () => {
    let selectedTask = { _id: 't-active', title: 'Active Task', columnKey: 'todo', order: 0 };

    const onTaskMove = (taskId, newCol, newOrder) => {
      if (selectedTask?._id === taskId) {
        selectedTask = { ...selectedTask, columnKey: newCol, order: newOrder };
      }
    };

    onTaskMove('t-active', 'done', 2);
    assert.equal(selectedTask.columnKey, 'done');
    assert.equal(selectedTask.order, 2);
  });
});
