import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { taskApi } from '../../api/task.api.js';
import { extractErrorMessage } from '../../api/error.js';
import { AlertCircle } from 'lucide-react';

const SUPPORTED_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

/**
 * Modal dialog for creating a new task inside a Kanban board.
 * Validates fields according to backend Zod constraints and submits to POST /api/v1/boards/:boardId/tasks.
 * Styled via centralized DevFlow CSS custom properties.
 *
 * @param {Object} props
 * @param {string} props.boardId - Parent board MongoDB ObjectId
 * @param {Array<Object>} [props.columns=[]] - List of board columns { title, key, order }
 * @param {string} [props.defaultColumnKey='todo'] - Initially selected column key
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onTaskCreated - Callback receiving newly created task document
 */
export function CreateTaskModal({
  boardId,
  columns = [],
  defaultColumnKey = 'todo',
  isOpen,
  onClose,
  onTaskCreated,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnKey, setColumnKey] = useState(defaultColumnKey || 'todo');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setColumnKey(defaultColumnKey || 'todo');
    setPriority('medium');
    setDueDate('');
    setErrors({});
    setApiError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const validate = () => {
    const newErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      newErrors.title = 'Task title is required';
    } else if (trimmedTitle.length > 150) {
      newErrors.title = 'Task title cannot exceed 150 characters';
    }

    if (trimmedDesc.length > 2000) {
      newErrors.description = 'Task description cannot exceed 2000 characters';
    }

    if (dueDate) {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) {
        newErrors.dueDate = 'Please provide a valid date format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        columnKey,
        priority,
      };

      if (description.trim()) {
        payload.description = description.trim();
      }

      if (dueDate) {
        payload.dueDate = new Date(dueDate).toISOString();
      }

      const response = await taskApi.createTask(boardId, payload);
      const createdTask = response.data?.data;

      resetForm();
      if (typeof onTaskCreated === 'function' && createdTask) {
        onTaskCreated(createdTask);
      }
      onClose();
    } catch (err) {
      setApiError(extractErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const availableColumns =
    columns.length > 0
      ? columns
      : [
          { key: 'todo', title: 'To Do' },
          { key: 'in-progress', title: 'In Progress' },
          { key: 'done', title: 'Done' },
        ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Task"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {apiError && (
          <div
            role="alert"
            className="p-3 bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 rounded-lg text-xs text-[var(--color-text)] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{apiError}</div>
          </div>
        )}

        {/* Task Title Input */}
        <div>
          <Input
            label="Task Title"
            id="task-title"
            name="title"
            placeholder="e.g., Implement OAuth2 integration"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) {
                setErrors((prev) => ({ ...prev, title: undefined }));
              }
            }}
            error={errors.title}
            required
            disabled={isSubmitting}
            maxLength={150}
            autoFocus
          />
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)] text-right">
            {title.length}/150
          </p>
        </div>

        {/* Task Description Textarea */}
        <div>
          <label
            htmlFor="task-description"
            className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
          >
            Description <span className="text-[var(--color-text-muted)] font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="task-description"
            name="description"
            rows={3}
            placeholder="Add any technical context, requirements, or acceptance criteria..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            disabled={isSubmitting}
            maxLength={2000}
            className={`w-full px-3.5 py-2 text-sm bg-[var(--color-input-bg)] text-[var(--color-text)] border rounded-lg transition-colors placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
              errors.description
                ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-[var(--color-focus)]'
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-[var(--color-danger)] font-medium">{errors.description}</p>
            ) : (
              <span />
            )}
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {description.length}/2000
            </p>
          </div>
        </div>

        {/* Column and Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Destination Column Selector */}
          <div>
            <label
              htmlFor="task-column"
              className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
            >
              Stage Column
            </label>
            <select
              id="task-column"
              name="columnKey"
              value={columnKey}
              onChange={(e) => setColumnKey(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-sm bg-[var(--color-input-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg transition-colors hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableColumns.map((col) => (
                <option key={col.key || col.title} value={col.key}>
                  {col.title}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Selector */}
          <div>
            <label
              htmlFor="task-priority"
              className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
            >
              Priority
            </label>
            <select
              id="task-priority"
              name="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-sm bg-[var(--color-input-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg transition-colors hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {SUPPORTED_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date Input */}
        <div>
          <label
            htmlFor="task-due-date"
            className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
          >
            Due Date <span className="text-[var(--color-text-muted)] font-normal lowercase">(optional)</span>
          </label>
          <input
            type="date"
            id="task-due-date"
            name="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 text-sm bg-[var(--color-input-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg transition-colors hover:border-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateTaskModal;
