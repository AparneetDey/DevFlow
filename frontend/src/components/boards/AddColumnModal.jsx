import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { boardApi } from '../../api/board.api.js';
import { extractErrorMessage } from '../../api/error.js';
import { AlertCircle } from 'lucide-react';

/**
 * Modal dialog for creating a new dynamic column inside a Kanban board.
 * Validates column name (trimmed, 1-50 chars) and submits to POST /api/v1/boards/:boardId/columns.
 * Max 5 columns per board is enforced both client-side and server-side.
 * Styled via centralized DevFlow CSS custom properties.
 *
 * @param {Object} props
 * @param {string} props.boardId - Board MongoDB ObjectId
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onColumnAdded - Callback receiving updated board document
 */
export function AddColumnModal({
  boardId,
  isOpen,
  onClose,
  onColumnAdded,
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setError(null);
    setApiError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose?.();
  };

  const validate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Column name is required');
      return false;
    }
    if (trimmed.length > 50) {
      setError('Column name cannot exceed 50 characters');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await boardApi.addColumn(boardId, {
        name: name.trim(),
      });
      const updatedBoard = response.data?.data;

      resetForm();
      if (typeof onColumnAdded === 'function' && updatedBoard) {
        onColumnAdded(updatedBoard);
      }
      onClose?.();
    } catch (err) {
      setApiError(extractErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Column"
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

        <div>
          <Input
            label="Column Name"
            id="column-name"
            name="name"
            placeholder="e.g., Code Review, QA, Blocked"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            error={error}
            required
            disabled={isSubmitting}
            maxLength={50}
            autoFocus
          />
          <div className="flex items-center justify-between mt-1 text-[11px] text-[var(--color-text-muted)]">
            <span>Max 5 columns per board</span>
            <span>{name.length}/50</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Add Column
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddColumnModal;
