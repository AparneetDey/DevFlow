/**
 * Extracts and deterministically sorts tasks belonging to a specific Kanban column.
 *
 * Rules:
 * - Safely handles non-array or malformed task inputs.
 * - Only retains tasks whose columnKey strictly matches the target columnKey.
 * - Ensures retained tasks are objects with a valid string title.
 * - Sorts tasks by ascending finite numerical order.
 * - Tasks with missing or non-finite orders are placed last.
 * - Does not mutate the original tasks array or task objects.
 *
 * @param {Array<Object>|unknown} tasks - List of task objects
 * @param {string} columnKey - The columnKey to filter by (e.g. 'todo', 'in-progress', 'done')
 * @returns {Array<Object>} Sorted list of tasks for the column
 */
export function getTasksForColumn(tasks, columnKey) {
  if (!Array.isArray(tasks) || typeof columnKey !== 'string' || !columnKey) {
    return [];
  }

  return tasks
    .filter(
      (task) =>
        task &&
        typeof task === 'object' &&
        !Array.isArray(task) &&
        task.columnKey === columnKey &&
        typeof task.title === 'string'
    )
    .sort((a, b) => {
      const orderA = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Infinity;
      const orderB = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Infinity;
      return orderA - orderB;
    });
}

/**
 * Identifies tasks that do not match any configured column on the board.
 * Useful for diagnosing orphaned or malformed task data without crashing or fabricating columns.
 *
 * @param {Array<Object>|unknown} tasks - List of task objects
 * @param {Array<Object>|unknown} columns - List of column objects from board
 * @returns {Array<Object>} Tasks whose columnKey does not match any column
 */
export function getUnmatchedTasks(tasks, columns) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  const validColumnKeys = new Set(
    Array.isArray(columns)
      ? columns
          .filter((col) => col && typeof col.key === 'string')
          .map((col) => col.key)
      : []
  );

  return tasks.filter(
    (task) =>
      task &&
      typeof task === 'object' &&
      !Array.isArray(task) &&
      (!task.columnKey || !validColumnKeys.has(task.columnKey))
  );
}

export default getTasksForColumn;
