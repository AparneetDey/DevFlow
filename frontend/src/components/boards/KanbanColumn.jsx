import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTaskCard from '../tasks/SortableTaskCard.jsx';

/**
 * Reusable presentation component for a Kanban workflow column.
 * - Dynamic column title with inline double-click renaming.
 * - Pinned header with task counter badge.
 * - Flex scrollable task container with native browser scrolling.
 * - Pinned bottom "+ Add a task" action.
 * - Styled via centralized DevFlow CSS custom properties.
 *
 * @param {Object} props
 * @param {Object} props.column - Column metadata { title, name, key, order }
 * @param {Array<Object>} [props.tasks] - List of task objects to render within the column
 * @param {React.ReactNode} [props.children] - Custom children to render within the column
 * @param {boolean} [props.isLoading=false] - Whether tasks are currently loading
 * @param {Function} [props.onAddTask] - Callback when user clicks add task for this column
 * @param {Function} [props.onRenameColumn] - Callback when user renames this column (colKey, newName)
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
  isDropTarget = false,
  onAddTask,
  onRenameColumn,
  onTaskClick,
  onTaskDoubleClick,
  onTaskEditClick,
  onToggleComplete,
  togglingTaskIds,
  className = '',
}) {
  const columnTitle = column?.name || column?.title || 'Untitled Column';
  const columnKey = column?.key || columnTitle;

  // Inline column renaming state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(columnTitle);
  const [renameError, setRenameError] = useState(null);
  const inputRef = useRef(null);
  const isEscPressedRef = useRef(false);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleStartEditing = () => {
    if (!onRenameColumn) return;
    setTitleInput(column?.name || column?.title || 'Untitled Column');
    setIsEditingTitle(true);
    setRenameError(null);
  };

  const handleSaveTitle = async () => {
    if (!isEditingTitle) return;
    const currentName = column?.name || column?.title || '';
    const trimmed = titleInput.trim();

    if (!trimmed) {
      // Revert if empty
      setTitleInput(currentName);
      setIsEditingTitle(false);
      return;
    }

    if (trimmed.length > 50) {
      setRenameError('Max 50 characters');
      return;
    }

    if (trimmed === currentName) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setIsEditingTitle(false);
      setRenameError(null);
      await onRenameColumn?.(columnKey, trimmed);
    } catch (err) {
      setTitleInput(currentName);
      setRenameError(err?.message || 'Failed to rename column');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isEscPressedRef.current = true;
      setTitleInput(column?.name || column?.title || 'Untitled Column');
      setRenameError(null);
      setIsEditingTitle(false);
    }
  };

  const handleBlur = () => {
    if (isEscPressedRef.current) {
      isEscPressedRef.current = false;
      return;
    }
    handleSaveTitle();
  };

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnKey}`,
    data: {
      type: 'column',
      columnKey,
    },
  });

  const isTarget = isOver || isDropTarget;

  const hasTasksArray = Array.isArray(tasks) && tasks.length > 0;
  const hasChildren = Boolean(children);

  const taskCount = Array.isArray(tasks)
    ? tasks.length
    : React.Children.count(children);

  const taskIds = useMemo(
    () => (hasTasksArray ? tasks.map((t) => t._id || t.id).filter(Boolean) : []),
    [hasTasksArray, tasks]
  );

  return (
    <section
      aria-labelledby={`column-header-${columnKey}`}
      className={`w-[255px] sm:w-[278px] shrink-0 bg-[var(--color-surface)] border ${
        isTarget
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/40 bg-[var(--color-primary-muted)]/15'
          : 'border-[var(--color-border)]'
      } rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col max-h-[calc(100vh-13.5rem)] transition-colors ${className}`.trim()}
    >
      {/* 1. Column Header (shrink-0) */}
      <div className="shrink-0 flex items-center justify-between px-1 py-0.5 mb-2 pb-2 border-b border-[var(--color-border)] min-w-0">
        <div className="flex-1 min-w-0 mr-1.5">
          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              maxLength={50}
              className="w-full text-sm font-semibold text-[var(--color-text)] bg-[var(--color-input-bg)] border border-[var(--color-primary)] rounded px-1.5 py-0.5 outline-none ring-2 ring-[var(--color-focus)] transition-all"
              aria-label={`Rename ${columnTitle} column`}
            />
          ) : (
            <h3
              id={`column-header-${columnKey}`}
              onDoubleClick={handleStartEditing}
              className="text-sm font-semibold text-[var(--color-text)] tracking-tight truncate cursor-pointer hover:text-[var(--color-primary-hover)] transition-colors select-none"
              title={`${columnTitle} (Double-click to rename)`}
            >
              {columnTitle}
            </h3>
          )}
          {renameError && (
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-danger)] font-medium mt-0.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">{renameError}</span>
            </div>
          )}
        </div>

        {/* Task Count Badge */}
        <div className="flex items-center shrink-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] font-semibold text-[11px]"
            aria-label={`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} in ${columnTitle}`}
          >
            {taskCount}
          </span>
        </div>
      </div>

      {/* 2. Tasks Container: Internally scrollable with themed scrollbar */}
      <div
        ref={setNodeRef}
        className={`overflow-y-auto min-h-[120px] flex-1 flex flex-col gap-2 pr-1 rounded-lg touch-pan-y column-scrollbar ${
          isTarget && hasTasksArray ? 'bg-[var(--color-primary-muted)]/10' : ''
        }`}
      >
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <div className="h-16 bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border)] animate-pulse" />
            <div className="h-16 bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border)] animate-pulse" />
          </div>
        ) : hasChildren ? (
          children
        ) : hasTasksArray ? (
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
        ) : (
          <div
            role="region"
            aria-label={`Empty ${columnTitle} column`}
            className={`rounded-lg border border-dashed flex-1 min-h-[90px] flex flex-col items-center justify-center ${
              isTarget
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)]/20 ring-2 ring-[var(--color-primary)]/40'
                : 'border-[var(--color-border)]/60 bg-[var(--color-bg-secondary)]/40'
            } px-2.5 py-2.5 text-center select-none transition-all`}
          >
            <p className={`text-xs font-medium ${isTarget ? 'text-[var(--color-primary-hover)] font-semibold' : 'text-[var(--color-text-muted)]'}`}>
              {isTarget ? 'Drop task here' : 'No tasks'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Add Task Action (In normal document flow after task list, not a pinned footer) */}
      {onAddTask && (
        <div className="shrink-0 pt-1.5 mt-1">
          <button
            type="button"
            onClick={() => onAddTask(column?.key || 'todo')}
            className="w-full flex items-center justify-start gap-1.5 px-2 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            aria-label={`Add task to ${columnTitle} column`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add a task</span>
          </button>
        </div>
      )}
    </section>
  );
}

export default KanbanColumn;
