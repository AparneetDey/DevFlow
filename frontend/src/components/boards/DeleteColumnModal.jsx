import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import boardApi from '../../api/board.api.js';
import { extractErrorMessage } from '../../api/error.js';
import { AlertTriangle, AlertCircle, ArrowRightLeft, Trash2 } from 'lucide-react';

/**
 * Confirmation dialog for deleting a Kanban column.
 * Offers task move (Option A) or permanent delete (Option B) strategies when tasks exist.
 * Disables move option when no destination columns exist.
 * Styled via centralized DevFlow CSS custom properties.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {string} props.boardId - Target board ID
 * @param {Object} props.column - Column to delete { key, name, title, order }
 * @param {Array<Object>} [props.columns] - Full list of board columns
 * @param {Array<Object>} [props.otherColumns] - Remaining columns on board (excluding target column)
 * @param {Array<Object>} [props.tasks] - Full list of board tasks
 * @param {number} [props.tasksCount] - Number of tasks currently in the column
 * @param {Function} [props.onDeleted] - Callback receiving (updatedBoard, deletedColumnKey, payload)
 * @param {Function} [props.onColumnDeleted] - Alias for onDeleted
 */
export function DeleteColumnModal({
  isOpen,
  onClose,
  boardId,
  column,
  columns = [],
  otherColumns: explicitOtherColumns,
  tasks = [],
  tasksCount: explicitTasksCount,
  onDeleted,
  onColumnDeleted = onDeleted,
}) {
  const columnTitle = column?.name || column?.title || 'Untitled Column';
  const columnKey = column?.key;

  // Resolve remaining destination columns
  const otherColumns = Array.isArray(explicitOtherColumns)
    ? explicitOtherColumns
    : (Array.isArray(columns) ? columns.filter((c) => c.key !== columnKey) : []);

  // Resolve count of tasks belonging to this column
  const tasksCount = typeof explicitTasksCount === 'number'
    ? explicitTasksCount
    : (Array.isArray(tasks) ? tasks.filter((t) => t.columnKey === columnKey).length : 0);

  const hasTasks = tasksCount > 0;
  const hasDestinationColumns = otherColumns.length > 0;

  // If column has tasks and other columns exist, default to "move"; otherwise "delete"
  const [action, setAction] = useState(
    hasTasks && hasDestinationColumns ? 'move' : 'delete'
  );
  const [targetColumnKey, setTargetColumnKey] = useState(
    otherColumns[0]?.key || ''
  );
  const [apiError, setApiError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    if (isDeleting) return;
    setApiError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!boardId || !columnKey) return;

    if (action === 'move' && !targetColumnKey) {
      setApiError('Please select a destination column to move tasks to');
      return;
    }

    setApiError(null);
    setIsDeleting(true);

    const payload =
      action === 'move'
        ? { action: 'move', targetColumnKey }
        : { action: 'delete' };

    try {
      const response = await boardApi.deleteColumn(boardId, columnKey, payload);
      const updatedBoard = response.data?.data;

      if (typeof onColumnDeleted === 'function') {
        onColumnDeleted(updatedBoard, columnKey, payload);
      }
      onClose();
    } catch (err) {
      setApiError(extractErrorMessage(err));
      setIsDeleting(false);
    }
  };

  if (!column) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Column"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div
            role="alert"
            className="p-3 bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 rounded-lg text-xs text-[var(--color-text)] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{apiError}</div>
          </div>
        )}

        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-danger)]/20 text-[var(--color-danger)] flex items-center justify-center shrink-0 border border-[var(--color-danger)]/40">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--color-text)] leading-snug">
              Delete &quot;{columnTitle}&quot; column?
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {!hasTasks
                ? 'This column is empty. Deleting it will remove the column from this board.'
                : !hasDestinationColumns
                ? `This column contains ${tasksCount} ${
                    tasksCount === 1 ? 'task' : 'tasks'
                  }. Since there are no other columns on this board, all tasks will be permanently deleted.`
                : `This column contains ${tasksCount} ${
                    tasksCount === 1 ? 'task' : 'tasks'
                  }. Choose what should happen to its tasks:`}
            </p>
          </div>
        </div>

        {/* Task Handling Options (Only when column has tasks and destination columns exist) */}
        {hasTasks && hasDestinationColumns && (
          <div className="space-y-2.5 pt-1">
            {/* Option A: Move Tasks */}
            <label
              className={`block p-3 rounded-xl border transition-all cursor-pointer ${
                action === 'move'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)]/15 ring-1 ring-[var(--color-primary)]/30'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="deleteAction"
                  value="move"
                  checked={action === 'move'}
                  onChange={() => setAction('move')}
                  disabled={isDeleting}
                  className="mt-0.5 accent-[var(--color-primary)] cursor-pointer"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span>Move tasks to another column</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                    Move all {tasksCount} tasks to a different column. Task completion states and details will be preserved.
                  </p>

                  {/* Destination Column Selector */}
                  {action === 'move' && (
                    <div className="pt-1.5">
                      <label
                        htmlFor="target-column-select"
                        className="block text-[11px] font-medium text-[var(--color-text-secondary)] mb-1"
                      >
                        Destination Column:
                      </label>
                      <select
                        id="target-column-select"
                        value={targetColumnKey}
                        onChange={(e) => setTargetColumnKey(e.target.value)}
                        disabled={isDeleting}
                        className="w-full text-xs bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-focus)] cursor-pointer transition-colors"
                      >
                        {otherColumns.map((col) => (
                          <option key={col.key} value={col.key}>
                            {col.name || col.title || col.key}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </label>

            {/* Option B: Delete Tasks Permanently */}
            <label
              className={`block p-3 rounded-xl border transition-all cursor-pointer ${
                action === 'delete'
                  ? 'border-[var(--color-danger)] bg-[var(--color-danger)]/10 ring-1 ring-[var(--color-danger)]/30'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="deleteAction"
                  value="delete"
                  checked={action === 'delete'}
                  onChange={() => setAction('delete')}
                  disabled={isDeleting}
                  className="mt-0.5 accent-[var(--color-danger)] cursor-pointer"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-danger)]">
                    <Trash2 className="w-3.5 h-3.5 text-[var(--color-danger)]" />
                    <span>Permanently delete all tasks</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                    Permanently delete all {tasksCount} tasks inside this column. This action cannot be undone.
                  </p>
                </div>
              </div>
            </label>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={action === 'delete' ? 'danger' : 'primary'}
            size="md"
            isLoading={isDeleting}
            disabled={isDeleting || (action === 'move' && !targetColumnKey)}
            className="w-full sm:w-auto cursor-pointer"
          >
            {!hasTasks
              ? 'Delete Column'
              : action === 'move'
              ? 'Move Tasks & Delete'
              : 'Delete Column & Tasks'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default DeleteColumnModal;
