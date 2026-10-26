import React from 'react';
import TaskCard from '../tasks/TaskCard.jsx';

/**
 * Reusable presentation component for a Kanban workflow column.
 * Displays column header with task counter and a task container with an empty message fallback.
 *
 * @param {Object} props
 * @param {Object} props.column - Column metadata { title, key, order }
 * @param {Array<Object>} [props.tasks] - List of task objects to render within the column
 * @param {React.ReactNode} [props.children] - Custom children to render within the column
 * @param {boolean} [props.isLoading=false] - Whether tasks are currently loading
 * @param {string} [props.className] - Optional custom CSS classes
 */
export function KanbanColumn({
  column,
  tasks,
  children,
  isLoading = false,
  className = '',
}) {
  const columnTitle = column?.title || 'Untitled Column';
  const columnKey = column?.key || columnTitle;

  const hasTasksArray = Array.isArray(tasks) && tasks.length > 0;
  const hasChildren = Boolean(children);

  const taskCount = Array.isArray(tasks)
    ? tasks.length
    : React.Children.count(children);

  return (
    <section
      aria-labelledby={`column-header-${columnKey}`}
      className={`w-72 sm:w-80 shrink-0 bg-slate-100/75 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-col min-h-[440px] transition-colors ${className}`.trim()}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-2.5 pb-2.5 border-b border-slate-200/70 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full bg-slate-400/80 shrink-0"
            aria-hidden="true"
          />
          <h3
            id={`column-header-${columnKey}`}
            className="text-sm font-semibold text-slate-800 tracking-tight truncate"
            title={columnTitle}
          >
            {columnTitle}
          </h3>
        </div>

        {/* Task Count Badge */}
        <span
          className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 font-semibold text-[11px] shrink-0"
          aria-label={`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} in ${columnTitle}`}
        >
          {taskCount}
        </span>
      </div>

      {/* Column Body / Task Content Area */}
      <div className="flex-1 flex flex-col gap-2.5 min-h-[350px]">
        {isLoading ? (
          <div className="space-y-2.5" aria-busy="true">
            <div className="h-20 bg-white/70 rounded-xl border border-slate-200/60 animate-pulse" />
            <div className="h-20 bg-white/70 rounded-xl border border-slate-200/60 animate-pulse" />
          </div>
        ) : hasChildren ? (
          children
        ) : hasTasksArray ? (
          tasks.map((task, index) => (
            <TaskCard
              key={task._id || task.id || `task-${columnKey}-${index}`}
              task={task}
            />
          ))
        ) : (
          <div
            role="region"
            aria-label={`Empty ${columnTitle} column`}
            className="flex-1 rounded-xl border border-dashed border-slate-300/80 bg-white/50 p-6 flex flex-col items-center justify-center text-center select-none"
          >
            <p className="text-xs font-medium text-slate-400">
              No tasks yet
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default KanbanColumn;
