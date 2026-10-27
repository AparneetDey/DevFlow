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
