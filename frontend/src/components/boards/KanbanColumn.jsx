import React from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskCard from '../tasks/SortableTaskCard.jsx';

/**
 * Reusable presentation component for a Kanban workflow column.
 * Displays column header with task counter, quick task creation action, and task container with empty fallback.
 * Styled via centralized DevFlow CSS custom properties.
 *
 * @param {Object} props
 * @param {Object} props.column - Column metadata { title, key, order }
 * @param {Array<Object>} [props.tasks] - List of task objects to render within the column
 * @param {React.ReactNode} [props.children] - Custom children to render within the column
 * @param {boolean} [props.isLoading=false] - Whether tasks are currently loading
 * @param {Function} [props.onAddTask] - Callback when user clicks add task for this column
 * @param {Function} [props.onTaskClick] - Callback when user selects a task
 * @param {Function} [props.onTaskDoubleClick] - Callback when user double-clicks a task to view details
 * @param {Function} [props.onTaskEditClick] - Callback when user clicks the pencil icon on a task
 * @param {Function} [props.onToggleComplete] - Callback when completion toggle is clicked
 * @param {Set<string>} [props.togglingTaskIds] - Set of task IDs currently toggling completion
 * @param {string} [props.className] - Optional custom CSS classes
 */
export function KanbanColumn({
  column,
  tasks,
  children,
  isLoading = false,
  onAddTask,
  onTaskClick,
  onTaskDoubleClick,
  onTaskEditClick,
  onToggleComplete,
  togglingTaskIds,
  className = '',
}) {
  const columnTitle = column?.title || 'Untitled Column';
  const columnKey = column?.key || columnTitle;

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnKey}`,
    data: {
      type: 'column',
      columnKey,
    },
  });

  const hasTasksArray = Array.isArray(tasks) && tasks.length > 0;
  const hasChildren = Boolean(children);

  const taskCount = Array.isArray(tasks)
    ? tasks.length
    : React.Children.count(children);

  const taskIds = hasTasksArray
    ? tasks.map((t) => t._id || t.id).filter(Boolean)
    : [];

  return (
    <section
      aria-labelledby={`column-header-${columnKey}`}
      className={`w-72 select-none sm:w-80 shrink-0 bg-[var(--color-surface)] border ${
        isOver
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/40 bg-[var(--color-primary-muted)]/15'
          : 'border-[var(--color-border)]'
      } rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col min-h-[440px] transition-colors ${className}`.trim()}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-2.5 pb-2.5 border-b border-[var(--color-border)] min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            id={`column-header-${columnKey}`}
            className="text-sm font-semibold text-[var(--color-text)] tracking-tight truncate"
            title={columnTitle}
          >
            {columnTitle}
          </h3>
        </div>

        {/* Task Count Badge & Add Task Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] font-semibold text-[11px]"
            aria-label={`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} in ${columnTitle}`}
          >
            {taskCount}
          </span>
          {onAddTask && (
            <button
              type="button"
              onClick={() => onAddTask(column?.key || 'todo')}
              aria-label={`Add task to ${columnTitle} column`}
              title={`Add task to ${columnTitle}`}
              className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Column Body / Task Content Area */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2.5 min-h-[350px] rounded-xl transition-colors touch-pan-y ${
          isOver && hasTasksArray ? 'bg-[var(--color-primary-muted)]/10 p-1 -m-1' : ''
        }`}
      >
        {isLoading ? (
          <div className="space-y-2.5" aria-busy="true">
            <div className="h-20 bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)] animate-pulse" />
            <div className="h-20 bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)] animate-pulse" />
          </div>
        ) : hasChildren ? (
          children
        ) : hasTasksArray ? (
          <>
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {tasks.map((task, index) => (
                <SortableTaskCard
                  key={task._id || task.id || `task-${columnKey}-${index}`}
                  task={task}
                  columnKey={columnKey}
                  onDoubleClick={onTaskDoubleClick || onTaskClick}
                  onEditClick={onTaskEditClick || onTaskDoubleClick || onTaskClick}
                  onClick={onTaskClick}
                  onToggleComplete={onToggleComplete}
                  isToggling={togglingTaskIds?.has?.(task._id)}
                />
              ))}
            </SortableContext>
            {onAddTask && (
              <button
                type="button"
                onClick={() => onAddTask(column?.key || 'todo')}
                className="mt-1 w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] rounded-xl transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                aria-label={`Add task to ${columnTitle} column`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add a task</span>
              </button>
            )}
          </>
        ) : (
          <div
            role="region"
            aria-label={`Empty ${columnTitle} column`}
            className={`flex-1 rounded-xl border border-dashed ${
              isOver
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)]/20 ring-2 ring-[var(--color-primary)]/40'
                : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
            } p-6 flex flex-col items-center justify-center text-center select-none space-y-2 transition-all`}
          >
            <p className={`text-xs font-medium ${isOver ? 'text-[var(--color-primary-hover)] font-semibold' : 'text-[var(--color-text-muted)]'}`}>
              {isOver ? 'Drop task here' : 'No tasks yet'}
            </p>
            {onAddTask && (
              <button
                type="button"
                onClick={() => onAddTask(column?.key || 'todo')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-primary)] hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded px-2 py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add a task</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default KanbanColumn;
