import { Calendar } from 'lucide-react';

const PRIORITY_THEMES = {
  high: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    label: 'High',
  },
  medium: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    label: 'Medium',
  },
  low: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    label: 'Low',
  },
};

/**
 * Reusable presentation component for displaying a task card in a Kanban column.
 *
 * @param {Object} props
 * @param {Object} props.task - Task data object
 * @param {string} [props.className] - Optional custom CSS classes
 */
export function TaskCard({ task, className = '' }) {
  if (!task || typeof task !== 'object') {
    return null;
  }

  const taskKey = task._id || task.id || 'task';
  const priorityTheme = task.priority ? PRIORITY_THEMES[task.priority.toLowerCase()] : null;

  const formattedDueDate = (() => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    if (isNaN(date.getTime())) return null;

    const isCurrentYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(isCurrentYear ? {} : { year: 'numeric' }),
    });
  })();

  return (
    <article
      aria-labelledby={`task-title-${taskKey}`}
      className={`bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-2 min-w-0 select-none ${className}`.trim()}
    >
      {/* Task Title */}
      <h4
        id={`task-title-${taskKey}`}
        className="text-sm font-semibold text-slate-800 tracking-tight break-words"
      >
        {task.title || 'Untitled Task'}
      </h4>

      {/* Task Description (when present) */}
      {task.description ? (
        <p className="text-xs text-slate-500 leading-relaxed break-words line-clamp-3">
          {task.description}
        </p>
      ) : null}

      {/* Task Metadata (Priority & Due Date) */}
      {(priorityTheme || formattedDueDate) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100/80 mt-0.5">
          {priorityTheme && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityTheme.badge}`}
            >
              {priorityTheme.label}
            </span>
          )}

          {formattedDueDate && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
              <span>{formattedDueDate}</span>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export default TaskCard;
