/**
 * Pure utility functions for deterministic task reordering and cross-column moves in DevFlow.
 * Aligns with backend 0-based contiguous order indexing (0, 1, 2, ...).
 */

/**
 * Re-indexes an array of tasks belonging to a column with contiguous 0-based integer orders.
 *
 * @param {Array<Object>} tasks - Array of task objects for a column
 * @param {string} columnKey - The columnKey to assign
 * @returns {Array<Object>} New array of tasks with normalized orders (0, 1, 2, ...)
 */
export function normalizeColumnTasks(tasks, columnKey) {
  if (!Array.isArray(tasks)) return [];

  return tasks.map((task, index) => ({
    ...task,
    columnKey,
    order: index,
  }));
}

/**
 * Reorders a task within the same column and re-indexes all tasks in that column.
 *
 * @param {Array<Object>} columnTasks - Current tasks in the column, sorted by order
 * @param {string} activeTaskId - ID of the task being moved
 * @param {string} overTaskId - ID of the task being dropped over
 * @returns {Array<Object>} New array with the task moved and orders normalized
 */
export function reorderSameColumn(columnTasks, activeTaskId, overTaskId) {
  if (!Array.isArray(columnTasks) || !activeTaskId) {
    return Array.isArray(columnTasks) ? [...columnTasks] : [];
  }

  const oldIndex = columnTasks.findIndex((t) => t._id === activeTaskId);
  if (oldIndex === -1) return [...columnTasks];

  const targetIndex = overTaskId
    ? columnTasks.findIndex((t) => t._id === overTaskId)
    : -1;

  if (targetIndex === -1 || oldIndex === targetIndex) {
    // No change in position, return normalized clone
    const columnKey = columnTasks[0]?.columnKey || 'todo';
    return normalizeColumnTasks(columnTasks, columnKey);
  }

  const updated = [...columnTasks];
  const [moved] = updated.splice(oldIndex, 1);
  updated.splice(targetIndex, 0, moved);

  const columnKey = columnTasks[0]?.columnKey || moved.columnKey || 'todo';
  return normalizeColumnTasks(updated, columnKey);
}

/**
 * Moves a task from a source column to a target column at a specified position.
 * Returns the entire updated tasks list with both source and destination columns normalized.
 *
 * @param {Array<Object>} allTasks - All tasks on the board
 * @param {string} activeTaskId - ID of the task being moved
 * @param {string} targetColumnKey - Destination columnKey ('todo' | 'in-progress' | 'done')
 * @param {number} [targetIndex] - 0-based insertion index in destination column
 * @returns {{
 *   tasks: Array<Object>,
 *   targetOrder: number,
 *   isChanged: boolean
 * }}
 */
export function moveTaskCrossColumn(allTasks, activeTaskId, targetColumnKey, targetIndex = 0) {
  if (!Array.isArray(allTasks) || !activeTaskId || !targetColumnKey) {
    return {
      tasks: Array.isArray(allTasks) ? [...allTasks] : [],
      targetOrder: 0,
      isChanged: false,
    };
  }

  const activeTask = allTasks.find((t) => t._id === activeTaskId);
  if (!activeTask) {
    return { tasks: [...allTasks], targetOrder: 0, isChanged: false };
  }

  const sourceColumnKey = activeTask.columnKey;

  // Extract other tasks in destination column sorted by order
  const destTasks = allTasks
    .filter((t) => t.columnKey === targetColumnKey && t._id !== activeTaskId)
    .sort((a, b) => {
      const orderA = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Infinity;
      const orderB = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Infinity;
      return orderA - orderB;
    });

  // Clamp targetIndex between 0 and destTasks.length
  const clampedIndex = Math.min(Math.max(0, targetIndex), destTasks.length);

  // Insert active task into destination
  const movedTask = {
    ...activeTask,
    columnKey: targetColumnKey,
  };
  destTasks.splice(clampedIndex, 0, movedTask);

  // Normalize destination column orders
  const normalizedDest = normalizeColumnTasks(destTasks, targetColumnKey);

  // Extract and normalize remaining tasks in source column (if cross-column move)
  let normalizedSource = [];
  if (sourceColumnKey !== targetColumnKey) {
    const sourceTasks = allTasks
      .filter((t) => t.columnKey === sourceColumnKey && t._id !== activeTaskId)
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Infinity;
        const orderB = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Infinity;
        return orderA - orderB;
      });
    normalizedSource = normalizeColumnTasks(sourceTasks, sourceColumnKey);
  }

  // Construct updated full tasks array
  const destMap = new Map(normalizedDest.map((t) => [t._id, t]));
  const sourceMap = new Map(normalizedSource.map((t) => [t._id, t]));

  const updatedAllTasks = allTasks.map((task) => {
    if (destMap.has(task._id)) return destMap.get(task._id);
    if (sourceMap.has(task._id)) return sourceMap.get(task._id);
    return task;
  });

  return {
    tasks: updatedAllTasks,
    targetOrder: clampedIndex,
    isChanged: true,
  };
}
