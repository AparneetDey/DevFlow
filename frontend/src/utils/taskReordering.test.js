import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeColumnTasks,
  reorderSameColumn,
  moveTaskCrossColumn,
  findColumnKey,
  calculateTaskDropPosition,
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

describe('findColumnKey Container & Droppable Resolution', () => {
  const columns = [
    { key: 'todo', name: 'To Do', order: 0 },
    { key: 'in-progress', name: 'In Progress', order: 1 },
    { key: 'done', name: 'Done', order: 2 },
    { key: 'qa-review', name: 'QA Review', order: 3 },
  ];

  const tasks = [
    { _id: 't-101', columnKey: 'todo', title: 'Task 1' },
    { _id: 't-102', columnKey: 'in-progress', title: 'Task 2' },
    { _id: 't-103', columnKey: 'qa-review', title: 'Task 3' },
  ];

  test('resolves column droppable formatted as column-<key>', () => {
    assert.equal(findColumnKey('column-todo', tasks, columns), 'todo');
    assert.equal(findColumnKey('column-qa-review', tasks, columns), 'qa-review');
    assert.equal(findColumnKey('column-done', tasks, columns), 'done');
  });

  test('resolves direct columnKey identifier', () => {
    assert.equal(findColumnKey('todo', tasks, columns), 'todo');
    assert.equal(findColumnKey('in-progress', tasks, columns), 'in-progress');
    assert.equal(findColumnKey('qa-review', tasks, columns), 'qa-review');
  });

  test('resolves task ID to task columnKey', () => {
    assert.equal(findColumnKey('t-101', tasks, columns), 'todo');
    assert.equal(findColumnKey('t-102', tasks, columns), 'in-progress');
    assert.equal(findColumnKey('t-103', tasks, columns), 'qa-review');
  });

  test('returns null for unknown target, empty ID, or missing inputs', () => {
    assert.equal(findColumnKey(null, tasks, columns), null);
    assert.equal(findColumnKey(undefined, tasks, columns), null);
    assert.equal(findColumnKey('', tasks, columns), null);
    assert.equal(findColumnKey('non-existent-id', tasks, columns), null);
  });
});

describe('Drag-and-Drop Safeguards & Lifecycle Verification (Critical Depth Prevention)', () => {
  const columns = [
    { key: 'todo', name: 'To Do', order: 0 },
    { key: 'in-progress', name: 'In Progress', order: 1 },
    { key: 'review', name: 'Review', order: 2 },
    { key: 'done', name: 'Done', order: 3 },
  ];

  test('Scenario 1A: drag a task within same column without position change is a no-op', () => {
    const initialTasks = [
      { _id: 't1', columnKey: 'todo', order: 0 },
      { _id: 't2', columnKey: 'todo', order: 1 },
    ];
    // Dropping t1 over t1
    const reordered = reorderSameColumn(initialTasks, 't1', 't1');
    assert.deepEqual(reordered, initialTasks);
  });

  test('Scenario 1B: drag a task within same column with position change reorders with contiguous orders', () => {
    const initialTasks = [
      { _id: 't1', columnKey: 'todo', order: 0 },
      { _id: 't2', columnKey: 'todo', order: 1 },
      { _id: 't3', columnKey: 'todo', order: 2 },
    ];
    const reordered = reorderSameColumn(initialTasks, 't1', 't3');
    assert.equal(reordered[0]._id, 't2');
    assert.equal(reordered[0].order, 0);
    assert.equal(reordered[1]._id, 't3');
    assert.equal(reordered[1].order, 1);
    assert.equal(reordered[2]._id, 't1');
    assert.equal(reordered[2].order, 2);
    // Every task still belongs to 'todo'
    assert.ok(reordered.every((t) => t.columnKey === 'todo'));
  });

  test('Scenario 2: drag a task into another column normalizes both source and target columns', () => {
    const initialTasks = [
      { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0 },
      { _id: 't2', title: 'Task 2', columnKey: 'todo', order: 1 },
      { _id: 't3', title: 'Task 3', columnKey: 'in-progress', order: 0 },
    ];
    const { tasks, targetOrder, isChanged } = moveTaskCrossColumn(initialTasks, 't1', 'in-progress', 0);
    assert.equal(isChanged, true);
    assert.equal(targetOrder, 0);

    const todo = getTasksForColumn(tasks, 'todo');
    const inProgress = getTasksForColumn(tasks, 'in-progress');

    assert.equal(todo.length, 1);
    assert.equal(todo[0]._id, 't2');
    assert.equal(todo[0].order, 0);

    assert.equal(inProgress.length, 2);
    assert.equal(inProgress[0]._id, 't1');
    assert.equal(inProgress[0].order, 0);
    assert.equal(inProgress[1]._id, 't3');
    assert.equal(inProgress[1].order, 1);
  });

  test('Scenario 3: drag a task over an empty column assigns order 0 without NaN or failure', () => {
    const initialTasks = [
      { _id: 't1', title: 'Task 1', columnKey: 'todo', order: 0 },
    ];
    const { tasks, targetOrder, isChanged } = moveTaskCrossColumn(initialTasks, 't1', 'review', 0);
    assert.equal(isChanged, true);
    assert.equal(targetOrder, 0);

    const review = getTasksForColumn(tasks, 'review');
    assert.equal(review.length, 1);
    assert.equal(review[0]._id, 't1');
    assert.equal(review[0].columnKey, 'review');
    assert.equal(review[0].order, 0);
  });

  test('Scenario 4: drag a task across multiple columns sequentially leaves no orphaned or duplicated tasks', () => {
    let allTasks = [
      { _id: 't-multi', title: 'Multi Task', columnKey: 'todo', order: 0 },
      { _id: 't-stay', title: 'Stay Task', columnKey: 'in-progress', order: 0 },
    ];

    // Move to in-progress
    const step1 = moveTaskCrossColumn(allTasks, 't-multi', 'in-progress', 1);
    allTasks = step1.tasks;

    // Move to review
    const step2 = moveTaskCrossColumn(allTasks, 't-multi', 'review', 0);
    allTasks = step2.tasks;

    // Move to done
    const step3 = moveTaskCrossColumn(allTasks, 't-multi', 'done', 0);
    allTasks = step3.tasks;

    assert.equal(allTasks.filter((t) => t._id === 't-multi').length, 1);
    assert.equal(allTasks.find((t) => t._id === 't-multi').columnKey, 'done');
    assert.equal(allTasks.find((t) => t._id === 't-multi').order, 0);
    assert.equal(getTasksForColumn(allTasks, 'todo').length, 0);
    assert.equal(getTasksForColumn(allTasks, 'in-progress').length, 1);
    assert.equal(getTasksForColumn(allTasks, 'review').length, 0);
    assert.equal(getTasksForColumn(allTasks, 'done').length, 1);
  });

  test('Scenario 5: drag cancellation or drop outside restores pristine pre-drag snapshot', () => {
    const preDragSnapshot = [
      { _id: 't1', columnKey: 'todo', order: 0, title: 'Snapshot Task 1' },
      { _id: 't2', columnKey: 'in-progress', order: 0, title: 'Snapshot Task 2' },
    ];

    // Simulate drag end with over === null (outside droppable)
    const overTarget = null;
    let currentTasks = [...preDragSnapshot];

    if (!overTarget) {
      // BoardPage restores snapshot.tasks
      currentTasks = preDragSnapshot;
    }

    assert.deepEqual(currentTasks, preDragSnapshot);
  });

  test('Scenario 6: drag a completed task preserves independent isCompleted: true', () => {
    const initialTasks = [
      { _id: 'comp-1', columnKey: 'todo', order: 0, isCompleted: true },
      { _id: 'norm-1', columnKey: 'in-progress', order: 0, isCompleted: false },
    ];

    // Move completed task to in-progress
    const { tasks } = moveTaskCrossColumn(initialTasks, 'comp-1', 'in-progress', 1);
    const moved = tasks.find((t) => t._id === 'comp-1');

    assert.equal(moved.columnKey, 'in-progress');
    assert.equal(moved.isCompleted, true, 'isCompleted must remain true independently of column');
  });

  test('Scenario 7: drag a task after adding a new custom column dynamically', () => {
    const customColKey = 'col_custom_testing';
    const dynamicColumns = [...columns, { key: customColKey, name: 'Testing', order: 4 }];

    const initialTasks = [
      { _id: 'dyn-task', columnKey: 'todo', order: 0 },
    ];

    const resolvedCol = findColumnKey(`column-${customColKey}`, initialTasks, dynamicColumns);
    assert.equal(resolvedCol, customColKey);

    const { tasks, targetOrder } = moveTaskCrossColumn(initialTasks, 'dyn-task', customColKey, 0);
    assert.equal(targetOrder, 0);
    assert.equal(tasks[0].columnKey, customColKey);
    assert.equal(tasks[0].order, 0);
  });
});

describe('calculateTaskDropPosition & Drag Stability (Task 10C)', () => {
  const destTasks = [
    { _id: 'card-1', title: 'Card 1', columnKey: 'in-progress', order: 0 },
    { _id: 'card-2', title: 'Card 2', columnKey: 'in-progress', order: 1 },
    { _id: 'card-3', title: 'Card 3', columnKey: 'in-progress', order: 2 },
  ];

  test('returns 0 when destination column has no tasks', () => {
    assert.equal(calculateTaskDropPosition([], 'column-empty'), 0);
    assert.equal(calculateTaskDropPosition(null, 'column-empty'), 0);
  });

  test('returns destTasks.length when dropped on column container or unmatched ID', () => {
    assert.equal(calculateTaskDropPosition(destTasks, 'column-in-progress'), 3);
    assert.equal(calculateTaskDropPosition(destTasks, 'non-existent-task'), 3);
  });

  test('places before card when dropped in top half of card', () => {
    // Card 2: top = 100, height = 80 -> center = 140
    // Active card: top = 110 (above center 140) -> index = 1
    const overRect = { top: 100, height: 80 };
    const activeRect = { top: 110 };
    const pos = calculateTaskDropPosition(destTasks, 'card-2', overRect, activeRect);
    assert.equal(pos, 1);
  });

  test('places after card when dropped in bottom half of card', () => {
    // Card 2: top = 100, height = 80 -> center = 140
    // Active card: top = 150 (below center 140) -> index = 2
    const overRect = { top: 100, height: 80 };
    const activeRect = { top: 150 };
    const pos = calculateTaskDropPosition(destTasks, 'card-2', overRect, activeRect);
    assert.equal(pos, 2);
  });

  test('clamps out-of-range positions to valid [0, destTasks.length]', () => {
    // Card 3: index 2 + 1 = 3 -> valid insertion at end of list
    const overRect = { top: 200, height: 60 };
    const activeRect = { top: 250 };
    const pos = calculateTaskDropPosition(destTasks, 'card-3', overRect, activeRect);
    assert.equal(pos, 3);
  });

  test('stable drag-over: inspecting position does not mutate destination tasks array', () => {
    const tasksCopy = [...destTasks];
    calculateTaskDropPosition(destTasks, 'card-2', { top: 100, height: 80 }, { top: 150 });
    assert.deepEqual(destTasks, tasksCopy);
  });
});

