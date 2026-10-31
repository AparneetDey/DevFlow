import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getTasksForColumn, getUnmatchedTasks } from './taskGrouping.js';

describe('getTasksForColumn', () => {
  test('1. filters and sorts tasks by columnKey and ascending order', () => {
    const tasks = [
      { id: '1', title: 'Task 1', columnKey: 'todo', order: 2 },
      { id: '2', title: 'Task 2', columnKey: 'in-progress', order: 0 },
      { id: '3', title: 'Task 3', columnKey: 'todo', order: 0 },
      { id: '4', title: 'Task 4', columnKey: 'todo', order: 1 },
    ];

    const todoTasks = getTasksForColumn(tasks, 'todo');
    assert.deepEqual(
      todoTasks.map((t) => t.id),
      ['3', '4', '1']
    );

    const inProgressTasks = getTasksForColumn(tasks, 'in-progress');
    assert.deepEqual(
      inProgressTasks.map((t) => t.id),
      ['2']
    );

    const doneTasks = getTasksForColumn(tasks, 'done');
    assert.deepEqual(doneTasks, []);
  });

  test('2. places tasks with missing or non-finite orders last', () => {
    const tasks = [
      { id: '1', title: 'T1', columnKey: 'todo', order: null },
      { id: '2', title: 'T2', columnKey: 'todo', order: 0 },
      { id: '3', title: 'T3', columnKey: 'todo', order: 'invalid' },
      { id: '4', title: 'T4', columnKey: 'todo', order: 1 },
      { id: '5', title: 'T5', columnKey: 'todo' },
    ];

    const result = getTasksForColumn(tasks, 'todo');
    assert.equal(result[0].id, '2');
    assert.equal(result[1].id, '4');
    // remaining missing/invalid orders placed after
    assert.deepEqual(
      result.slice(2).map((t) => t.id),
      ['1', '3', '5']
    );
  });

  test('3. filters out malformed task entries', () => {
    const tasks = [
      null,
      undefined,
      'string primitive',
      123,
      { columnKey: 'todo' }, // missing title
      { title: 123, columnKey: 'todo' }, // non-string title
      { id: 'v1', title: 'Valid Task', columnKey: 'todo', order: 0 },
    ];

    const result = getTasksForColumn(tasks, 'todo');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'v1');
  });

  test('4. safely handles non-array and invalid columnKey inputs', () => {
    assert.deepEqual(getTasksForColumn(null, 'todo'), []);
    assert.deepEqual(getTasksForColumn(undefined, 'todo'), []);
    assert.deepEqual(getTasksForColumn({}, 'todo'), []);
    assert.deepEqual(getTasksForColumn([], 'todo'), []);
    assert.deepEqual(getTasksForColumn([{ title: 'A', columnKey: 'todo' }], null), []);
    assert.deepEqual(getTasksForColumn([{ title: 'A', columnKey: 'todo' }], ''), []);
  });

  test('5. does not mutate original array or task objects', () => {
    const originalTasks = Object.freeze([
      Object.freeze({ id: '2', title: 'T2', columnKey: 'todo', order: 2 }),
      Object.freeze({ id: '1', title: 'T1', columnKey: 'todo', order: 1 }),
    ]);

    const result = getTasksForColumn(originalTasks, 'todo');
    assert.deepEqual(
      result.map((t) => t.id),
      ['1', '2']
    );
    assert.notEqual(result, originalTasks);
    assert.equal(originalTasks[0].id, '2');
  });
});

describe('getUnmatchedTasks', () => {
  test('identifies tasks belonging to non-existent columns without crashing', () => {
    const columns = [
      { title: 'Todo', key: 'todo' },
      { title: 'Done', key: 'done' },
    ];

    const tasks = [
      { id: '1', title: 'Task 1', columnKey: 'todo' },
      { id: '2', title: 'Orphaned 1', columnKey: 'in-progress' },
      { id: '3', title: 'Orphaned 2', columnKey: 'archived' },
      { id: '4', title: 'Orphaned 3' }, // missing columnKey
      { id: '5', title: 'Task 5', columnKey: 'done' },
    ];

    const unmatched = getUnmatchedTasks(tasks, columns);
    assert.deepEqual(
      unmatched.map((t) => t.id),
      ['2', '3', '4']
    );
  });
});
