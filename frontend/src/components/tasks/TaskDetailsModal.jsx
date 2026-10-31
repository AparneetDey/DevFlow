import { useState, useRef, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import {
  Calendar,
  Layers,
  Flag,
  AlignLeft,
  Circle,
  CheckCircle2,
  AlertCircle,
  ActivitySquare,
  ChevronDown,
  Check,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { extractErrorMessage } from '../../api/error.js';

const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/90',
    iconColor: 'text-rose-500',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/90',
    iconColor: 'text-amber-500',
  },
  low: {
    label: 'Low',
    badge: 'bg-blue-50 text-blue-700 border-blue-200/90',
    iconColor: 'text-blue-500',
  },
};

const VALID_PRIORITIES = ['high', 'medium', 'low'];

/**
 * Formats an ISO date string into a localized readable date (e.g., "Nov 15, 2026").
 *
 * @param {string|Date} dateVal - Date input
 * @returns {string|null} Formatted date or null if invalid
 */
function formatReadableDate(dateVal) {
  if (!dateVal) return null;
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Converts a date value into YYYY-MM-DD format for HTML <input type="date">.
 * Uses UTC to avoid timezone shift inconsistencies.
 *
 * @param {string|Date} dateVal - Date input
 * @returns {string} Date string in YYYY-MM-DD format or empty string
 */
function getIsoDateInputString(dateVal) {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO timestamp into a localized readable date and time (e.g., "Jan 11, 2026, 6:57 PM").
 *
 * @param {string|Date} dateVal - Timestamp input
 * @returns {string|null} Formatted date string or null if invalid
 */
function formatReadableTimestamp(dateVal) {
  if (!dateVal) return null;
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return null;

  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Resolves a human-readable stage name for a given columnKey based on the board's column configuration.
 *
 * @param {string} columnKey - Column identifier (e.g. "todo", "in-progress")
 * @param {Array<Object>} [columns=[]] - List of board column objects
 * @returns {string} Column display title
 */
function resolveColumnTitle(columnKey, columns = []) {
  if (Array.isArray(columns) && columnKey) {
    const matched = columns.find((c) => c.key === columnKey);
    if (matched?.title) {
      return matched.title;
    }
  }

  if (!columnKey) return 'Unassigned';

  switch (columnKey) {
    case 'todo':
      return 'To Do';
    case 'in-progress':
      return 'In Progress';
    case 'done':
      return 'Done';
    default:
      return columnKey
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
}

/**
 * Trello-inspired card detail modal with inline direct editing for:
 * - Title (borderless heading input with save on Enter/blur and revert on Esc)
 * - Description (inline textarea with character count, Save/Cancel, and revert on Esc)
 * - Priority (dropdown pill with backend-validated options: high, medium, low)
 * - Due Date (interactive date picker popover with set/change and clear capabilities)
 *
 * @param {Object} props
 * @param {Object} props.task - Selected task object
 * @param {Array<Object>} [props.columns=[]] - Available board workflow columns
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} [props.onUpdateTask] - Callback (taskId, updates) => Promise<updatedTask>
 * @param {Function} [props.onDeleteTask] - Callback (taskId) => Promise<void>
 * @param {Function} [props.onToggleComplete] - Callback (task) => void
 * @param {boolean} [props.isTogglingComplete=false] - Whether completion toggle is in flight
 */
export function TaskDetailsModal({
  task,
  columns = [],
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  isTogglingComplete = false,
}) {
  const { user } = useAuth();
  const isEscapePressedRef = useRef(false);
  const priorityMenuRef = useRef(null);
  const dueDateMenuRef = useRef(null);

  // 1. Title Editing State
  const [titleInput, setTitleInput] = useState(task?.title || '');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState(null);

  // Sync external task title updates when title is not being edited
  const [prevTaskTitle, setPrevTaskTitle] = useState(task?.title);
  if (task?.title !== prevTaskTitle) {
    setPrevTaskTitle(task?.title);
    if (!isTitleFocused) {
      setTitleInput(task?.title || '');
    }
  }

  // 2. Description Editing State
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(task?.description || '');
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [descError, setDescError] = useState(null);

  // Sync external task description updates when description is not being edited
  const [prevTaskDesc, setPrevTaskDesc] = useState(task?.description);
  if (task?.description !== prevTaskDesc) {
    setPrevTaskDesc(task?.description);
    if (!isEditingDesc) {
      setDescInput(task?.description || '');
    }
  }

  // 3. Priority Editing State
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isSavingPriority, setIsSavingPriority] = useState(false);
  const [priorityError, setPriorityError] = useState(null);

  // 4. Due Date Editing State
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState(getIsoDateInputString(task?.dueDate));
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);
  const [dueDateError, setDueDateError] = useState(null);

  // Sync external task dueDate updates when date picker popover is closed
  const [prevTaskDueDate, setPrevTaskDueDate] = useState(task?.dueDate);
  if (task?.dueDate !== prevTaskDueDate) {
    setPrevTaskDueDate(task?.dueDate);
    if (!isDueDateOpen) {
      setDueDateInput(getIsoDateInputString(task?.dueDate));
    }
  }

  // 5. Deletion State
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Reset deletion states if selected task changes
  const [prevTaskId, setPrevTaskId] = useState(task?._id);
  if (task?._id !== prevTaskId) {
    setPrevTaskId(task?._id);
    setIsConfirmingDelete(false);
    setIsDeleting(false);
    setDeleteError(null);
  }

  // Close popovers on outside click or Escape key press
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isPriorityOpen &&
        priorityMenuRef.current &&
        !priorityMenuRef.current.contains(event.target)
      ) {
        setIsPriorityOpen(false);
      }
      if (
        isDueDateOpen &&
        dueDateMenuRef.current &&
        !dueDateMenuRef.current.contains(event.target)
      ) {
        setIsDueDateOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (isPriorityOpen) {
          event.stopPropagation();
          event.nativeEvent.stopImmediatePropagation();
          setIsPriorityOpen(false);
        } else if (isDueDateOpen) {
          event.stopPropagation();
          event.stopImmediatePropagation();
          setIsDueDateOpen(false);
        } else if (isConfirmingDelete) {
          event.stopPropagation();
          event.nativeEvent.stopImmediatePropagation();
          if (!isDeleting) {
            setIsConfirmingDelete(false);
            setDeleteError(null);
          }
        }
      }
    }

    if (isPriorityOpen || isDueDateOpen || isConfirmingDelete) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isPriorityOpen, isDueDateOpen, isConfirmingDelete, isDeleting]);

  if (!task || !isOpen) {
    return null;
  }

  const isCompleted = task.columnKey === 'done';
  const priorityKey = (task.priority || 'medium').toLowerCase();
  const priorityInfo = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.medium;
  const stageName = resolveColumnTitle(task.columnKey, columns);
  const formattedDueDate = formatReadableDate(task.dueDate);
  const formattedCreated = formatReadableTimestamp(task.createdAt);
  const formattedUpdated = formatReadableTimestamp(task.updatedAt);

  // User details for activity log
  const displayName = user?.username || user?.email?.split('@')[0] || 'Member';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AD';

  // --------------------------------------------------------------------------
  // Title Handlers
  // --------------------------------------------------------------------------
  const handleSaveTitle = async () => {
    if (isSavingTitle) return;

    const trimmed = titleInput.trim();
    if (!trimmed) {
      setTitleError('Task title cannot be empty');
      return;
    }

    if (trimmed.length > 150) {
      setTitleError('Task title cannot exceed 150 characters');
      return;
    }

    if (trimmed === task.title) {
      setTitleError(null);
      return;
    }

    if (typeof onUpdateTask !== 'function') {
      return;
    }

    setIsSavingTitle(true);
    setTitleError(null);

    try {
      await onUpdateTask(task._id, { title: trimmed });
    } catch (err) {
      setTitleError(extractErrorMessage(err));
    } finally {
      setIsSavingTitle(false);
    }
  };

  // --------------------------------------------------------------------------
  // Description Handlers
  // --------------------------------------------------------------------------
  const handleSaveDesc = async () => {
    if (isSavingDesc) return;

    const trimmed = descInput.trim();
    if (trimmed.length > 2000) {
      setDescError('Description cannot exceed 2000 characters');
      return;
    }

    if (trimmed === (task.description || '').trim()) {
      setIsEditingDesc(false);
      return;
    }

    if (typeof onUpdateTask !== 'function') {
      setIsEditingDesc(false);
      return;
    }

    setIsSavingDesc(true);
    setDescError(null);

    try {
      await onUpdateTask(task._id, { description: trimmed });
      setIsEditingDesc(false);
    } catch (err) {
      setDescError(extractErrorMessage(err));
      // Keep isEditingDesc true so user does not lose unsaved input
    } finally {
      setIsSavingDesc(false);
    }
  };

  // --------------------------------------------------------------------------
  // Priority Handlers
  // --------------------------------------------------------------------------
  const handleSelectPriority = async (newPriority) => {
    setIsPriorityOpen(false);

    if (!newPriority || !VALID_PRIORITIES.includes(newPriority)) {
      return;
    }

    if (newPriority === (task.priority || 'medium').toLowerCase()) {
      return;
    }

    if (typeof onUpdateTask !== 'function' || isSavingPriority) {
      return;
    }

    setIsSavingPriority(true);
    setPriorityError(null);

    try {
      await onUpdateTask(task._id, { priority: newPriority });
    } catch (err) {
      setPriorityError(extractErrorMessage(err));
    } finally {
      setIsSavingPriority(false);
    }
  };

  // --------------------------------------------------------------------------
  // Due Date Handlers
  // --------------------------------------------------------------------------
  const handleSaveDueDate = async () => {
    if (isSavingDueDate) return;

    if (!dueDateInput) {
      // If date input was cleared and user clicks Save, clear the date
      return handleClearDueDate();
    }

    const parsedDate = new Date(`${dueDateInput}T00:00:00.000Z`);
    if (isNaN(parsedDate.getTime())) {
      setDueDateError('Invalid date format');
      return;
    }

    const isoString = parsedDate.toISOString();

    // Check if unchanged
    if (task.dueDate) {
      const currentInputStr = getIsoDateInputString(task.dueDate);
      if (currentInputStr === dueDateInput) {
        setIsDueDateOpen(false);
        return;
      }
    }

    if (typeof onUpdateTask !== 'function') {
      setIsDueDateOpen(false);
      return;
    }

    setIsSavingDueDate(true);
    setDueDateError(null);

    try {
      await onUpdateTask(task._id, { dueDate: isoString });
      setIsDueDateOpen(false);
    } catch (err) {
      setDueDateError(extractErrorMessage(err));
    } finally {
      setIsSavingDueDate(false);
    }
  };

  const handleClearDueDate = async () => {
    if (isSavingDueDate) return;

    if (!task.dueDate) {
      setIsDueDateOpen(false);
      return;
    }

    if (typeof onUpdateTask !== 'function') {
      setIsDueDateOpen(false);
      return;
    }

    setIsSavingDueDate(true);
    setDueDateError(null);

    try {
      await onUpdateTask(task._id, { dueDate: null });
      setIsDueDateOpen(false);
    } catch (err) {
      setDueDateError(extractErrorMessage(err));
    } finally {
      setIsSavingDueDate(false);
    }
  };

  // --------------------------------------------------------------------------
  // Deletion Handlers
  // --------------------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!task?._id || isDeleting) return;

    if (typeof onDeleteTask !== 'function') {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await onDeleteTask(task._id);
      // BoardPage handles clearing selectedTask and closing the modal upon success
    } catch (err) {
      setDeleteError(extractErrorMessage(err));
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    if (isDeleting) return;
    setIsConfirmingDelete(false);
    setDeleteError(null);
    onClose?.();
  };

  // Header Title component passed to Modal (stage pill in top left)
  const modalHeaderPill = (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Layers className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        <span>{stageName}</span>
      </span>
      {isCompleted && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          Completed
        </span>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={modalHeaderPill}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content Area (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          {/* Title Area with Interactive Completion Toggle and Direct Title Input */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Circle Completion Toggle */}
              <button
                type="button"
                onClick={() => onToggleComplete?.(task)}
                disabled={isTogglingComplete || isDeleting}
                aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
                title={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
                className="p-1 rounded-full text-slate-400 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer shrink-0 transition-colors disabled:opacity-50"
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100/70" />
                ) : (
                  <Circle className="w-5 h-5 hover:stroke-indigo-600" />
                )}
              </button>

              {/* Title Input: looks like a heading in resting state, border appears on click/focus */}
              <input
                type="text"
                value={titleInput}
                onChange={(e) => {
                  setTitleInput(e.target.value);
                  if (titleError) setTitleError(null);
                }}
                onFocus={() => {
                  setIsTitleFocused(true);
                  if (titleError) setTitleError(null);
                }}
                onBlur={() => {
                  setIsTitleFocused(false);
                  if (isEscapePressedRef.current) {
                    isEscapePressedRef.current = false;
                    return;
                  }
                  handleSaveTitle();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    isEscapePressedRef.current = true;
                    setTitleInput(task.title || '');
                    setTitleError(null);
                    e.currentTarget.blur();
                  }
                }}
                maxLength={150}
                disabled={isSavingTitle || isDeleting}
                placeholder="Task title..."
                className={`w-full text-xl sm:text-2xl font-bold tracking-tight rounded-lg px-2.5 py-1.5 transition-all border-2 ${
                  isCompleted && !isTitleFocused
                    ? 'line-through text-slate-400'
                    : 'text-slate-900'
                } ${
                  isTitleFocused
                    ? 'border-indigo-500 bg-white shadow-2xs outline-none ring-2 ring-indigo-100 cursor-text'
                    : 'border-transparent bg-transparent hover:bg-slate-100/70 hover:border-slate-200/60 cursor-pointer'
                }`}
                title="Click to edit title"
              />
            </div>

            {/* Title Error or Saving Hint */}
            {titleError ? (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium pl-0 sm:pl-9.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{titleError}</span>
              </div>
            ) : isTitleFocused ? (
              <p className="text-[11px] text-slate-400 pl-0 sm:pl-9.5">
                Press Enter to save, Esc to cancel
              </p>
            ) : null}
          </div>

          {/* Quick Metadata Editors: Priority and Due Date */}
          <div className="space-y-1.5 pl-0 sm:pl-9.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Priority Dropdown Trigger */}
              <div className="relative" ref={priorityMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsPriorityOpen((prev) => !prev);
                    setIsDueDateOpen(false);
                    setPriorityError(null);
                  }}
                  disabled={isSavingPriority || isDeleting}
                  aria-haspopup="listbox"
                  aria-expanded={isPriorityOpen}
                  aria-label={`Priority: ${priorityInfo.label}. Click to change`}
                  title="Click to change priority"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer hover:shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 ${priorityInfo.badge}`}
                >
                  {isSavingPriority ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Flag className={`w-3.5 h-3.5 ${priorityInfo.iconColor}`} aria-hidden="true" />
                  )}
                  <span>{priorityInfo.label} Priority</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" aria-hidden="true" />
                </button>

                {/* Priority Selection Menu */}
                {isPriorityOpen && (
                  <div
                    role="listbox"
                    aria-label="Select task priority"
                    className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 focus:outline-none"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Set Priority
                    </div>
                    {VALID_PRIORITIES.map((pKey) => {
                      const pConfig = PRIORITY_CONFIG[pKey];
                      const isSelected = (task.priority || 'medium').toLowerCase() === pKey;
                      return (
                        <button
                          key={pKey}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectPriority(pKey)}
                          disabled={isSavingPriority}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 cursor-pointer ${
                            isSelected ? 'bg-indigo-50/70 text-indigo-900 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Flag className={`w-3.5 h-3.5 ${pConfig.iconColor}`} aria-hidden="true" />
                            <span>{pConfig.label}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Due Date Popover Trigger */}
              <div className="relative" ref={dueDateMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDueDateOpen((prev) => !prev);
                    setIsPriorityOpen(false);
                    setDueDateInput(getIsoDateInputString(task.dueDate));
                    setDueDateError(null);
                  }}
                  disabled={isSavingDueDate || isDeleting}
                  aria-haspopup="dialog"
                  aria-expanded={isDueDateOpen}
                  aria-label={`Due date: ${formattedDueDate ? formattedDueDate : 'none'}. Click to change`}
                  title="Click to change due date"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition-all cursor-pointer hover:shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
                >
                  {isSavingDueDate ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" aria-hidden="true" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  )}
                  <span>{formattedDueDate ? `Due ${formattedDueDate}` : 'No due date'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" aria-hidden="true" />
                </button>

                {/* Due Date Picker Popover */}
                {isDueDateOpen && (
                  <div
                    role="dialog"
                    aria-label="Set task due date"
                    className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 z-30 focus:outline-none space-y-3"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800">Due Date</span>
                      <button
                        type="button"
                        onClick={() => setIsDueDateOpen(false)}
                        aria-label="Close date picker"
                        className="text-slate-400 hover:text-slate-600 rounded p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="task-due-date-input" className="block text-[11px] font-medium text-slate-500">
                        Select date
                      </label>
                      <input
                        id="task-due-date-input"
                        type="date"
                        value={dueDateInput}
                        onChange={(e) => {
                          setDueDateInput(e.target.value);
                          if (dueDateError) setDueDateError(null);
                        }}
                        disabled={isSavingDueDate}
                        className="w-full text-xs font-medium text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {dueDateError && (
                      <div className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{dueDateError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleSaveDueDate}
                          isLoading={isSavingDueDate}
                          disabled={isSavingDueDate}
                          className="text-xs py-1 px-2.5 cursor-pointer"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsDueDateOpen(false)}
                          disabled={isSavingDueDate}
                          className="text-xs py-1 px-2.5 cursor-pointer"
                        >
                          Cancel
                        </Button>
                      </div>

                      {task.dueDate && (
                        <button
                          type="button"
                          onClick={handleClearDueDate}
                          disabled={isSavingDueDate}
                          className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
                        >
                          Clear Date
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error notifications for Priority & Due Date */}
            {priorityError && (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{priorityError}</span>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <AlignLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Description</span>
            </div>

            <div className="pl-0 sm:pl-6 min-w-0">
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={descInput}
                    onChange={(e) => {
                      setDescInput(e.target.value);
                      if (descError) setDescError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        setIsEditingDesc(false);
                        setDescInput(task.description || '');
                        setDescError(null);
                      }
                    }}
                    maxLength={2000}
                    rows={5}
                    disabled={isSavingDesc || isDeleting}
                    autoFocus
                    placeholder="Add a more detailed description..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-900 border-2 border-indigo-500 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-y min-h-[120px] shadow-2xs"
                  />
                  {descError && (
                    <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{descError}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleSaveDesc}
                        isLoading={isSavingDesc}
                        disabled={isSavingDesc || isDeleting}
                        className="cursor-pointer"
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsEditingDesc(false);
                          setDescInput(task.description || '');
                          setDescError(null);
                        }}
                        disabled={isSavingDesc || isDeleting}
                        className="cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {descInput.length}/2000
                    </span>
                  </div>
                </div>
              ) : task.description && task.description.trim() ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setDescInput(task.description || '');
                    setIsEditingDesc(true);
                    setDescError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDescInput(task.description || '');
                      setIsEditingDesc(true);
                      setDescError(null);
                    }
                  }}
                  className="group bg-slate-50/80 hover:bg-slate-100/80 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 transition-colors cursor-pointer text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed"
                  title="Click to edit description"
                >
                  <p>{task.description}</p>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setDescInput('');
                    setIsEditingDesc(true);
                    setDescError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setDescInput('');
                      setIsEditingDesc(true);
                      setDescError(null);
                    }
                  }}
                  className="bg-slate-100/70 hover:bg-slate-100 rounded-xl p-3 sm:p-4 cursor-pointer text-sm text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 transition-colors select-none"
                  title="Click to add description"
                >
                  Add a more detailed description...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Activity & Actions */}
        <div className="space-y-6 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-4 lg:pt-0 min-w-0 flex flex-col justify-between">
          {/* Top section: Activity & History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <ActivitySquare className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Activity</span>
            </div>

            {/* Activity Timeline Item */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {initials}
                </div>
                <div className="text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-900">{displayName}</span>{' '}
                  added this card to{' '}
                  <span className="font-semibold text-slate-900">{stageName}</span>
                  {formattedCreated && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {formattedCreated}
                    </div>
                  )}
                </div>
              </div>

              {/* If card was updated */}
              {formattedUpdated && formattedUpdated !== formattedCreated && (
                <div className="flex items-start gap-2.5 pt-1">
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="text-xs leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-900">{displayName}</span>{' '}
                    updated this card
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {formattedUpdated}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom section: Actions & Task Deletion */}
          <div className="pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <span>Actions</span>
            </div>

            {!isConfirmingDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsConfirmingDelete(true);
                  setDeleteError(null);
                }}
                disabled={isDeleting || isSavingTitle || isSavingDesc || isSavingPriority || isSavingDueDate}
                className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 border-slate-200 transition-colors cursor-pointer"
                title="Delete this task"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete Task</span>
              </Button>
            ) : (
              <div
                role="alert"
                aria-label="Confirm task deletion"
                className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200 mt-0.5">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-bold text-red-900 leading-snug">
                      Delete task permanently?
                    </p>
                    <p className="text-[11px] text-red-700 leading-relaxed break-words">
                      <span className="font-semibold text-red-900">"{task.title}"</span> will be permanently removed from this board. This action cannot be undone.
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div
                    role="alert"
                    className="flex items-start gap-1.5 p-2 bg-white/90 border border-red-200 rounded-lg text-[11px] text-red-700 font-medium"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span className="break-words leading-tight">{deleteError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleConfirmDelete}
                    isLoading={isDeleting}
                    disabled={isDeleting}
                    className="w-full text-xs font-semibold cursor-pointer shadow-none"
                  >
                    Delete Task
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (isDeleting) return;
                      setIsConfirmingDelete(false);
                      setDeleteError(null);
                    }}
                    disabled={isDeleting}
                    className="w-full text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TaskDetailsModal;
