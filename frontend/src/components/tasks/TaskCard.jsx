import { Calendar, Pencil, Circle, CheckCircle2 } from 'lucide-react';

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
 * - Circular completion button toggles completion between done and todo.
 * - Clicking the pencil icon opens the task details modal.
 * - Double clicking (or clicking) the card opens the task details modal.
 * - Supports keyboard interaction (Enter/Space opens task details modal).
 *
 * @param {Object} props
 * @param {Object} props.task - Task data object
 * @param {Function} [props.onDoubleClick] - Callback when card is double-clicked
 * @param {Function} [props.onEditClick] - Callback when pencil icon is clicked
 * @param {Function} [props.onClick] - Callback when card is clicked
 * @param {Function} [props.onToggleComplete] - Callback when completion circle button is clicked
 * @param {boolean} [props.isToggling=false] - Whether completion toggle is currently in flight
 * @param {string} [props.className] - Optional custom CSS classes
 */
export function TaskCard({
  task,
  onDoubleClick,
  onEditClick,
  onClick,
  onToggleComplete,
  isToggling = false,
  className = '',
}) {
  if (!task || typeof task !== 'object') {
    return null;
  }

  const taskKey = task._id || task.id || 'task';
  const isCompleted = task.columnKey === 'done';
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

  const handleOpenDetails = onDoubleClick || onClick;

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (typeof onEditClick === 'function') {
      onEditClick(task);
    } else if (typeof handleOpenDetails === 'function') {
      handleOpenDetails(task);
    }
  };

  const handleToggleClick = (e) => {
    e.stopPropagation();
    if (typeof onToggleComplete === 'function' && !isToggling) {
      onToggleComplete(task);
    }
  };

  return (
    <article
      aria-labelledby={`task-title-${taskKey}`}
      tabIndex={0}
      onClick={() => {
        if (handleOpenDetails) {
          handleOpenDetails(task);
        }
      }}
      onDoubleClick={(e) => {
        if (handleOpenDetails) {
          e.stopPropagation();
          handleOpenDetails(task);
        }
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          if (handleOpenDetails) {
            handleOpenDetails(task);
          }
        }
      }}
      className={`group relative bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all flex flex-col gap-2 min-w-0 cursor-pointer ${className}`.trim()}
      title="Click or double-click to view task details"
    >
      {/* Title, Completion Toggle & Edit Icon Row */}
      <div className="flex items-start gap-2 min-w-0">
        {/* Accessible Completion Button */}
        <button
          type="button"
          onClick={handleToggleClick}
          disabled={isToggling}
          aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
          title={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
          className="mt-0.5 p-0.5 rounded-full text-slate-400 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer shrink-0 transition-colors disabled:opacity-50"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100/70" />
          ) : (
            <Circle className="w-4 h-4 hover:stroke-indigo-600" />
          )}
        </button>

        {/* Task Title */}
        <h4
          id={`task-title-${taskKey}`}
          className={`text-sm font-semibold tracking-tight break-words flex-1 transition-colors ${
            isCompleted
              ? 'line-through text-slate-400'
              : 'text-slate-800 group-hover:text-indigo-600'
          }`}
        >
          {task.title || 'Untitled Task'}
        </h4>

        {/* Edit Button */}
        <button
          type="button"
          onClick={handleEditClick}
          aria-label={`Edit task: ${task.title || 'Untitled Task'}`}
          title="Edit task in details modal"
          className="p-1 -mr-1 -mt-0.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task Description (when present) */}
      {task.description ? (
        <p className={`text-xs leading-relaxed break-words line-clamp-3 ${
          isCompleted ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {task.description}
        </p>
      ) : null}

      {/* Task Metadata (Priority & Due Date) */}
      {(priorityTheme || formattedDueDate) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100/80 mt-0.5">
          {priorityTheme && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                isCompleted ? 'bg-slate-50 text-slate-400 border-slate-200/60' : priorityTheme.badge
              }`}
            >
              {priorityTheme.label}
            </span>
          )}

          {formattedDueDate && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              isCompleted ? 'text-slate-400' : 'text-slate-500'
            }`}>
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
