import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import {
  Calendar,
  Layers,
  Flag,
  AlignLeft,
  Pencil,
  Circle,
  CheckCircle2,
  AlertCircle,
  ActivitySquare,
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
 * Trello-inspired card detail modal with inline title and description editing.
 * Supports adaptive layout and completion toggle.
 *
 * @param {Object} props
 * @param {Object} props.task - Selected task object
 * @param {Array<Object>} [props.columns=[]] - Available board workflow columns
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} [props.onUpdateTask] - Callback (taskId, updates) => Promise<updatedTask>
 * @param {Function} [props.onToggleComplete] - Callback (task) => void
 * @param {boolean} [props.isTogglingComplete=false] - Whether completion toggle is in flight
 */
export function TaskDetailsModal({
  task,
  columns = [],
  isOpen,
  onClose,
  onUpdateTask,
  onToggleComplete,
  isTogglingComplete = false,
}) {
  const { user } = useAuth();

  // Inline Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(task?.title || '');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState(null);

  // Inline Description Editing State
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(task?.description || '');
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [descError, setDescError] = useState(null);

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

  // Handle Save Title
  const handleSaveTitle = async () => {
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
      setIsEditingTitle(false);
      return;
    }

    if (typeof onUpdateTask !== 'function') {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    setTitleError(null);

    try {
      await onUpdateTask(task._id, { title: trimmed });
      setIsEditingTitle(false);
    } catch (err) {
      setTitleError(extractErrorMessage(err));
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Handle Save Description
  const handleSaveDesc = async () => {
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
    } finally {
      setIsSavingDesc(false);
    }
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
      onClose={onClose}
      title={modalHeaderPill}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content Area (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          {/* Title Area with Interactive Completion Toggle */}
          <div className="flex items-start gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onToggleComplete?.(task)}
              disabled={isTogglingComplete}
              aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
              title={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
              className="mt-1 p-0.5 rounded-full text-slate-400 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer shrink-0 transition-colors disabled:opacity-50"
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100/70" />
              ) : (
                <Circle className="w-5 h-5 hover:stroke-indigo-600" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => {
                      setTitleInput(e.target.value);
                      if (titleError) setTitleError(null);
                    }}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveTitle();
                      } else if (e.key === 'Escape') {
                        setIsEditingTitle(false);
                        setTitleInput(task.title || '');
                        setTitleError(null);
                      }
                    }}
                    maxLength={150}
                    disabled={isSavingTitle}
                    autoFocus
                    placeholder="Task title..."
                    className="w-full text-xl sm:text-2xl font-bold text-slate-900 border-2 border-indigo-500 rounded-lg px-2.5 py-1 focus:outline-none bg-white shadow-2xs"
                  />
                  {titleError && (
                    <div className="flex items-center gap-1 text-xs text-red-600 font-medium pl-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{titleError}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 pl-1">
                    Press Enter to save, Esc to cancel
                  </p>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setTitleInput(task.title || '');
                    setIsEditingTitle(true);
                    setTitleError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setTitleInput(task.title || '');
                      setIsEditingTitle(true);
                      setTitleError(null);
                    }
                  }}
                  className="group flex items-center justify-between text-xl sm:text-2xl font-bold text-slate-900 tracking-tight break-words hover:bg-slate-100/80 rounded-lg px-2 py-1 -mx-2 transition-colors cursor-pointer"
                  title="Click to edit title"
                >
                  <span className={`flex-1 break-words ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {task.title || 'Untitled Task'}
                  </span>
                  <Pencil className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
                </div>
              )}
            </div>
          </div>

          {/* Quick Metadata Pills */}
          <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-7.5">
            {/* Priority Pill */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${priorityInfo.badge}`}
              title={`Priority: ${priorityInfo.label}`}
            >
              <Flag className={`w-3.5 h-3.5 ${priorityInfo.iconColor}`} aria-hidden="true" />
              <span>{priorityInfo.label} Priority</span>
            </span>

            {/* Dates Pill */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>{formattedDueDate ? `Due ${formattedDueDate}` : 'No due date'}</span>
            </span>
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
                        setIsEditingDesc(false);
                        setDescInput(task.description || '');
                        setDescError(null);
                      }
                    }}
                    maxLength={2000}
                    rows={5}
                    disabled={isSavingDesc}
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
                        disabled={isSavingDesc}
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
                        disabled={isSavingDesc}
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

        {/* Right Sidebar: Activity & History */}
        <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-4 lg:pt-0 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <ActivitySquare className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>activity</span>
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
      </div>
    </Modal>
  );
}

export default TaskDetailsModal;
