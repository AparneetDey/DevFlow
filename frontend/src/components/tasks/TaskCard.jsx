import { Calendar, Pencil, Circle, CheckCircle2 } from 'lucide-react';

const PRIORITY_THEMES = {
  high: {
    badge: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/40',
    label: 'High',
  },
  medium: {
    badge: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/40',
    label: 'Medium',
  },
  low: {
    badge: 'bg-[var(--color-primary-muted)] text-[var(--color-text)] border-[var(--color-primary)]/40',
    label: 'Low',
  },
};

/**
 * Reusable presentation component for displaying a task card in a Kanban column.
 * - Circular completion button toggles completion between done and todo.
 * - For incomplete tasks, the check mark is hidden and slides into view on card hover.
 * - Card border highlights on hover.
 * - Entire card is draggable to reorder or move across columns.
 * - Clicking the pencil icon opens the task details modal.
 * - Double clicking (or clicking) the card opens the task details modal.
 * - Supports keyboard interaction (Enter/Space opens task details modal).
 * - Styled via centralized DevFlow CSS custom properties.
 *
 * @param {Object} props
 * @param {Object} props.task - Task data object
 * @param {Function} [props.onDoubleClick] - Callback when card is double-clicked
 * @param {Function} [props.onEditClick] - Callback when pencil icon is clicked
 * @param {Function} [props.onClick] - Callback when card is clicked
 * @param {Function} [props.onToggleComplete] - Callback when completion circle button is clicked
 * @param {boolean} [props.isToggling=false] - Whether completion toggle is currently in flight
 * @param {Object} [props.dragProps] - DnD activator ref, attributes, and listeners for dragging the card
 * @param {boolean} [props.isDragging=false] - Whether this card is currently being dragged
 * @param {boolean} [props.isOverlay=false] - Whether this card is rendered inside the DragOverlay
 * @param {string} [props.className] - Optional custom CSS classes
 */
export function TaskCard({
  task,
  onDoubleClick,
  onEditClick,
  onClick,
  onToggleComplete,
  isToggling = false,
  dragProps,
  isDragging = false,
  isOverlay = false,
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
      tabIndex={isOverlay ? -1 : 0}
      {...dragProps}
      onClick={() => {
        if (isDragging || isOverlay) return;
        if (handleOpenDetails) {
          handleOpenDetails(task);
        }
      }}
      onDoubleClick={(e) => {
        if (isDragging || isOverlay) return;
        if (handleOpenDetails) {
          e.stopPropagation();
          handleOpenDetails(task);
        }
      }}
      onKeyDown={(e) => {
        if (isDragging || isOverlay) return;
        dragProps?.onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          if (handleOpenDetails) {
            handleOpenDetails(task);
          }
        }
      }}
      className={`group relative p-2.5 select-none bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:border-[var(--color-primary)] transition-all flex flex-col gap-2 min-w-0 cursor-grab active:cursor-grabbing text-[var(--color-text)] ${
        isDragging
          ? 'opacity-30 border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-muted)]/20 shadow-none'
          : ''
      } ${
        isOverlay
          ? 'shadow-xl ring-2 ring-[var(--color-primary)]/60 rotate-1 cursor-grabbing pointer-events-none'
          : ''
      } ${className}`.trim()}
      title="Click or double-click to view task details"
    >
      {/* Title, Completion Toggle & Edit Icon Row */}
      <div className="flex items-start gap-2 min-w-0">
        {/* Accessible Completion Button Wrapper with Hover Slide Animation */}
        <div
          className={`shrink-0 flex items-center transition-all duration-200 ease-out ${
            isCompleted
              ? 'w-5 opacity-100 mr-0.5'
              : 'w-0 opacity-0 -translate-x-2 overflow-hidden pointer-events-none group-hover:w-5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:mr-0.5 group-hover:pointer-events-auto group-focus-within:w-5 group-focus-within:opacity-100 group-focus-within:translate-x-0 group-focus-within:pointer-events-auto'
          }`}
        >
          <button
            type="button"
            onClick={handleToggleClick}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            disabled={isToggling}
            aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
            title={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
            className="mt-0.5 p-0.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] cursor-pointer shrink-0 transition-colors disabled:opacity-50"
          >
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-hover)]" />
            ) : (
              <Circle className="w-4 h-4 hover:stroke-[var(--color-primary-hover)]" />
            )}
          </button>
        </div>

        {/* Task Title */}
        <h4
          id={`task-title-${taskKey}`}
          className={`text-sm font-semibold tracking-tight break-words flex-1 transition-all duration-200 ease-out ${
            isCompleted
              ? 'line-through text-[var(--color-text-muted)]'
              : 'text-[var(--color-text)]'
          }`}
        >
          {task.title || 'Untitled Task'}
        </h4>

        {/* Edit Button */}
        <button
          type="button"
          onClick={handleEditClick}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          aria-label={`Edit task: ${task.title || 'Untitled Task'}`}
          title="Edit task in details modal"
          className="p-1 -mr-1 -mt-0.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] cursor-pointer shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task Description (when present) */}
      {task.description ? (
        <p className={`text-xs leading-relaxed break-words line-clamp-3 ${
          isCompleted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-secondary)]'
        }`}>
          {task.description}
        </p>
      ) : null}

      {/* Task Metadata (Priority & Due Date) */}
      {(priorityTheme || formattedDueDate) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--color-border)] mt-0.5">
          {priorityTheme && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                isCompleted ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]' : priorityTheme.badge
              }`}
            >
              {priorityTheme.label}
            </span>
          )}

          {formattedDueDate && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              isCompleted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-secondary)]'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
              <span>{formattedDueDate}</span>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export default TaskCard;
