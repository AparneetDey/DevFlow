import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { boardApi } from '../../api/board.api.js';
import { extractErrorMessage } from '../../api/error.js';
import { AlertCircle } from 'lucide-react';

/**
 * Dialog component for updating an existing board workspace.
 * Validates fields according to backend constraints and submits to PATCH /api/v1/boards/:boardId.
 * Initialized with board data; keyed by board._id to reset state on board switch.
 *
 * @param {Object} props
 * @param {Object} props.board - Target board to edit
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onBoardUpdated - Callback receiving the updated board object
 */
export function EditBoardModal({ board, isOpen, onClose, onBoardUpdated }) {
  const [title, setTitle] = useState(board?.title || '');
  const [description, setDescription] = useState(board?.description || '');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setErrors({});
    setApiError(null);
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
    if (!board?._id) return;

    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Backend updateBoardSchema is strict: accepts only title and description
      const payload = {
        title: title.trim(),
        description: description.trim(),
      };

      const response = await boardApi.updateBoard(board._id, payload);
      const updatedBoard = response.data?.data;

      if (typeof onBoardUpdated === 'function' && updatedBoard) {
        onBoardUpdated(updatedBoard);
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
      title="Edit Board Workspace"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {apiError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{apiError}</div>
          </div>
        )}

        <div>
          <Input
            label="Board Title"
            id="edit-board-title"
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
          <p className="mt-1 text-[11px] text-slate-400 text-right">
            {title.length}/100
          </p>
        </div>

        <div>
          <label
            htmlFor="edit-board-description"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="edit-board-description"
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
            className={`w-full px-3.5 py-2 text-sm bg-white text-slate-900 border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed resize-none custom-scrollbar ${
              errors.description
                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-100'
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-red-600 font-medium">{errors.description}</p>
            ) : (
              <span />
            )}
            <p className="text-[11px] text-slate-400">
              {description.length}/500
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
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
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default EditBoardModal;
