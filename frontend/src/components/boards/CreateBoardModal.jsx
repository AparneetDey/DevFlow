import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { boardApi } from '../../api/board.api.js';
import { extractErrorMessage } from '../../api/error.js';
import { AlertCircle } from 'lucide-react';

/**
 * Dialog component for creating a new board workspace.
 * Validates fields according to backend constraints and submits to POST /api/v1/boards.
 * Styled via centralized DevFlow CSS custom properties.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onBoardCreated - Callback receiving the newly created board object
 */
export function CreateBoardModal({ isOpen, onClose, onBoardCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
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
      newErrors.title = 'Board title is required';
    } else if (trimmedTitle.length > 100) {
      newErrors.title = 'Board title cannot exceed 100 characters';
    }

    if (trimmedDesc.length > 500) {
      newErrors.description = 'Board description cannot exceed 500 characters';
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
        description: description.trim(),
      };

      const response = await boardApi.createBoard(payload);
      const createdBoard = response.data?.data;

      resetForm();
      if (typeof onBoardCreated === 'function' && createdBoard) {
        onBoardCreated(createdBoard);
      }
      onClose();
    } catch (err) {
      setApiError(extractErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Board"
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
            label="Board Title"
            id="board-title"
            name="title"
            placeholder="e.g., Marketing Campaign Q1"
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
            maxLength={100}
            autoFocus
          />
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)] text-right">
            {title.length}/100
          </p>
        </div>

        <div>
          <label
            htmlFor="board-description"
            className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
          >
            Description <span className="text-[var(--color-text-muted)] font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="board-description"
            name="description"
            rows={3}
            placeholder="What is the purpose or goal of this workspace?"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            disabled={isSubmitting}
            maxLength={500}
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
              {description.length}/500
            </p>
          </div>
        </div>

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
            Create Board
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateBoardModal;
