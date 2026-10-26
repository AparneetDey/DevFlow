import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { boardApi } from '../../api/board.api.js';
import { extractErrorMessage } from '../../api/error.js';
import { AlertTriangle, AlertCircle } from 'lucide-react';

/**
 * Confirmation dialog for permanently deleting a board workspace.
 * Submits to DELETE /api/v1/boards/:boardId upon user confirmation.
 *
 * @param {Object} props
 * @param {Object} props.board - Target board to delete
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onBoardDeleted - Callback receiving the deleted boardId
 */
export function DeleteBoardModal({ board, isOpen, onClose, onBoardDeleted }) {
  const [apiError, setApiError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    if (isDeleting) return;
    setApiError(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!board?._id) return;

    setApiError(null);
    setIsDeleting(true);

    try {
      await boardApi.deleteBoard(board._id);

      if (typeof onBoardDeleted === 'function') {
        onBoardDeleted(board._id);
      }
      onClose();
    } catch (err) {
      setApiError(extractErrorMessage(err));
      setIsDeleting(false);
    }
  };

  if (!board) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Board"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {apiError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{apiError}</div>
          </div>
        )}

        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 break-words">
              Are you sure you want to delete <span className="text-red-600 font-bold">"{board.title}"</span>?
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              This action cannot be undone. All tasks, columns, and activity associated with this board workspace will be permanently removed.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
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
            type="button"
            variant="danger"
            size="md"
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Delete Board
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteBoardModal;
