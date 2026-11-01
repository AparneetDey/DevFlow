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

/**
 * Resolves a droppable container ID or task ID to a target columnKey.
 *
 * @param {string} id - Droppable target ID (e.g. 'column-todo', 'todo', or task ObjectId)
 * @param {Array<Object>} [allTasks=[]] - Current list of task objects
 * @param {Array<Object>} [allColumns=[]] - Current list of board column objects
 * @returns {string|null} Resolved columnKey or null
 */
export function findColumnKey(id, allTasks = [], allColumns = []) {
  if (!id) return null;

  // Case A: Dropped directly over column droppable (e.g., 'column-todo')
  if (typeof id === 'string' && id.startsWith('column-')) {
    const rawKey = id.replace('column-', '');
    if (!Array.isArray(allColumns) || allColumns.length === 0 || allColumns.some((c) => c && c.key === rawKey)) {
      return rawKey;
    }
  }

  // Case B: Directly matched a column key
  if (Array.isArray(allColumns) && allColumns.some((c) => c && c.key === id)) {
    return id;
  }

  // Case C: Over a task item
  if (Array.isArray(allTasks)) {
    const matchedTask = allTasks.find((t) => t && (t._id === id || t.id === id));
    if (matchedTask?.columnKey) {
      return matchedTask.columnKey;
    }
  }

  return null;
}

/**
 * Calculates the 0-based insertion index for a dropped task within destination column tasks.
 *
 * @param {Array<Object>} destTasks - Tasks currently in the destination column, sorted by order
 * @param {string} overId - ID of droppable dropped over (task ID or column container ID)
 * @param {Object} [overRect] - Optional bounding rect of the over target
 * @param {Object} [activeRect] - Optional translated bounding rect of the dragged card
 * @returns {number} 0-based insertion index clamped between 0 and destTasks.length
 */
export function calculateTaskDropPosition(destTasks, overId, overRect = null, activeRect = null) {
  if (!Array.isArray(destTasks) || destTasks.length === 0) {
    return 0;
  }

  const overIndex = destTasks.findIndex((t) => (t._id || t.id) === overId);

  // If dropped on column container or unmatched target, place at the bottom of the list
  if (overIndex === -1) {
    return destTasks.length;
  }

  // If bounding rects are available, determine if dropped in top half or bottom half of the target card
  if (
    overRect &&
    activeRect &&
    typeof overRect.top === 'number' &&
    typeof activeRect.top === 'number'
  ) {
    const isBelowOver = activeRect.top > overRect.top + (overRect.height || 0) / 2;
    return Math.min(Math.max(0, overIndex + (isBelowOver ? 1 : 0)), destTasks.length);
  }

  return Math.min(Math.max(0, overIndex), destTasks.length);
}

