import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeColumnTasks,
  reorderSameColumn,
  moveTaskCrossColumn,
} from './taskReordering.js';
import { getTasksForColumn } from './taskGrouping.js';

describe('Task Ordering & Reordering Utilities (Task 7.5)', () => {
  test('normalizeColumnTasks assigns sequential 0-based contiguous orders', () => {
    const rawTasks = [
      { _id: 't1', title: 'Task 1', order: 15 },
      { _id: 't2', title: 'Task 2', order: 3 },
      { _id: 't3', title: 'Task 3', order: 99 },
    ];

    const normalized = normalizeColumnTasks(rawTasks, 'in-progress');

    assert.equal(normalized.length, 3);
    assert.deepEqual(
      normalized.map((t) => ({ id: t._id, col: t.columnKey, order: t.order })),
      [
        { id: 't1', col: 'in-progress', order: 0 },
        { id: 't2', col: 'in-progress', order: 1 },
        { id: 't3', col: 'in-progress', order: 2 },
      ]
    );
  });

  test('reorderSameColumn moves a task upward within the same column and updates orders', () => {
    // Tasks: [A(0), B(1), C(2)] -> Move C above A -> [C(0), A(1), B(2)]
    const initialTasks = [
      { _id: 'task-a', title: 'Task A', columnKey: 'todo', order: 0 },
      { _id: 'task-b', title: 'Task B', columnKey: 'todo', order: 1 },
      { _id: 'task-c', title: 'Task C', columnKey: 'todo', order: 2 },
    ];

    const reordered = reorderSameColumn(initialTasks, 'task-c', 'task-a');

    assert.equal(reordered.length, 3);
    assert.equal(reordered[0]._id, 'task-c');
    assert.equal(reordered[0].order, 0);
    assert.equal(reordered[1]._id, 'task-a');
    assert.equal(reordered[1].order, 1);
    assert.equal(reordered[2]._id, 'task-b');
    assert.equal(reordered[2].order, 2);
  });

  test('reorderSameColumn moves a task downward within the same column and updates orders', () => {
    // Tasks: [A(0), B(1), C(2)] -> Move A below C -> [B(0), C(1), A(2)]
    const initialTasks = [
      { _id: 'task-a', title: 'Task A', columnKey: 'todo', order: 0 },
      { _id: 'task-b', title: 'Task B', columnKey: 'todo', order: 1 },
      { _id: 'task-c', title: 'Task C', columnKey: 'todo', order: 2 },
    ];

    const reordered = reorderSameColumn(initialTasks, 'task-a', 'task-c');

    assert.equal(reordered.length, 3);
    assert.equal(reordered[0]._id, 'task-b');
    assert.equal(reordered[0].order, 0);
    assert.equal(reordered[1]._id, 'task-c');
    assert.equal(reordered[1].order, 1);
    assert.equal(reordered[2]._id, 'task-a');
    assert.equal(reordered[2].order, 2);
  });

  test('reorderSameColumn with duplicate or invalid orders preserves stable deterministic order', () => {
    const malformedTasks = [
      { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 5 },
      { _id: 't2', title: 'Task 2', columnKey: 'todo', order: 5 },
      { _id: 't3', title: 'Task 3', columnKey: 'todo', order: null },
      { _id: 't4', title: 'Task 4', columnKey: 'todo', order: undefined },
    ];

    // Move t3 to the top
    const reordered = reorderSameColumn(malformedTasks, 't3', 't1');

    assert.equal(reordered[0]._id, 't3');
    assert.equal(reordered[0].order, 0);
    assert.equal(reordered[1]._id, 't1');
    assert.equal(reordered[1].order, 1);
    assert.equal(reordered[2]._id, 't2');
    assert.equal(reordered[2].order, 2);
    assert.equal(reordered[3]._id, 't4');
    assert.equal(reordered[3].order, 3);
  });

  test('moveTaskCrossColumn moves task from To Do to In Progress', () => {
    const allTasks = [
      { _id: 'todo-1', title: 'To Do 1', columnKey: 'todo', order: 0 },
      { _id: 'todo-2', title: 'To Do 2', columnKey: 'todo', order: 1 },
      { _id: 'prog-1', title: 'Prog 1', columnKey: 'in-progress', order: 0 },
    ];

    const { tasks, targetOrder } = moveTaskCrossColumn(allTasks, 'todo-1', 'in-progress', 0);

    const todoAfter = getTasksForColumn(tasks, 'todo');
    const progAfter = getTasksForColumn(tasks, 'in-progress');

    assert.equal(targetOrder, 0);
    assert.equal(todoAfter.length, 1);
    assert.equal(todoAfter[0]._id, 'todo-2');
    assert.equal(todoAfter[0].order, 0);

    assert.equal(progAfter.length, 2);
    assert.equal(progAfter[0]._id, 'todo-1');
    assert.equal(progAfter[0].columnKey, 'in-progress');
    assert.equal(progAfter[0].order, 0);
    assert.equal(progAfter[1]._id, 'prog-1');
    assert.equal(progAfter[1].order, 1);
  });

  test('moveTaskCrossColumn moves task from In Progress to Done and marks completed', () => {
    const allTasks = [
      { _id: 'prog-1', title: 'Prog 1', columnKey: 'in-progress', order: 0 },
      { _id: 'done-1', title: 'Done 1', columnKey: 'done', order: 0 },
    ];

    const { tasks, targetOrder } = moveTaskCrossColumn(allTasks, 'prog-1', 'done', 1);

    const progAfter = getTasksForColumn(tasks, 'in-progress');
    const doneAfter = getTasksForColumn(tasks, 'done');

    assert.equal(targetOrder, 1);
    assert.equal(progAfter.length, 0);
    assert.equal(doneAfter.length, 2);
    assert.equal(doneAfter[0]._id, 'done-1');
    assert.equal(doneAfter[0].order, 0);
    assert.equal(doneAfter[1]._id, 'prog-1');
    assert.equal(doneAfter[1].columnKey, 'done');
    assert.equal(doneAfter[1].order, 1);
  });

  test('moveTaskCrossColumn moves task from Done back to To Do and unmarks completion', () => {
    const allTasks = [
      { _id: 'done-1', title: 'Done 1', columnKey: 'done', order: 0 },
      { _id: 'todo-1', title: 'To Do 1', columnKey: 'todo', order: 0 },
    ];

    const { tasks, targetOrder } = moveTaskCrossColumn(allTasks, 'done-1', 'todo', 0);

    const doneAfter = getTasksForColumn(tasks, 'done');
    const todoAfter = getTasksForColumn(tasks, 'todo');

    assert.equal(targetOrder, 0);
    assert.equal(doneAfter.length, 0);
    assert.equal(todoAfter.length, 2);
    assert.equal(todoAfter[0]._id, 'done-1');
    assert.equal(todoAfter[0].columnKey, 'todo');
    assert.equal(todoAfter[0].order, 0);
    assert.equal(todoAfter[1]._id, 'todo-1');
    assert.equal(todoAfter[1].order, 1);
  });

  test('moveTaskCrossColumn into an empty column sets targetOrder to 0', () => {
    const allTasks = [
      { _id: 'todo-1', title: 'To Do 1', columnKey: 'todo', order: 0 },
    ];

    const { tasks, targetOrder } = moveTaskCrossColumn(allTasks, 'todo-1', 'done', 0);

    const doneTasks = getTasksForColumn(tasks, 'done');
    assert.equal(targetOrder, 0);
    assert.equal(doneTasks.length, 1);
    assert.equal(doneTasks[0]._id, 'todo-1');
    assert.equal(doneTasks[0].columnKey, 'done');
    assert.equal(doneTasks[0].order, 0);
  });

  test('every task appears in exactly one column after cross-column movement', () => {
    const allTasks = [
      { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0 },
      { _id: 't2', title: 'Task 2', columnKey: 'in-progress', order: 0 },
      { _id: 't3', title: 'Task 3', columnKey: 'done', order: 0 },
    ];

    const { tasks } = moveTaskCrossColumn(allTasks, 't1', 'in-progress', 1);

    const todo = getTasksForColumn(tasks, 'todo');
    const inProgress = getTasksForColumn(tasks, 'in-progress');
    const done = getTasksForColumn(tasks, 'done');

    const totalRendered = todo.length + inProgress.length + done.length;
    assert.equal(totalRendered, 3);
    assert.equal(todo.length, 0);
    assert.equal(inProgress.length, 2);
    assert.equal(done.length, 1);

    // Verify t1 is ONLY in inProgress
    assert.equal(todo.some((t) => t._id === 't1'), false);
    assert.equal(inProgress.some((t) => t._id === 't1'), true);
    assert.equal(done.some((t) => t._id === 't1'), false);
  });
});
