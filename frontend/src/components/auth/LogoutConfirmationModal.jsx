import { LogOut, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';

/**
 * Accessible confirmation dialog for user logout.
 * Prompts the user before terminating active authentication credentials,
 * prevents duplicate submissions, and surfaces error states.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Dismiss/Cancel handler
 * @param {Function} props.onConfirm - Confirmed sign-out action handler
 * @param {boolean} [props.isLoading=false] - Whether sign-out API request is pending
 * @param {string|null} [props.error=null] - Error message if sign-out failed
 */
export function LogoutConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  error = null,
}) {
  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sign Out Confirmation"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Are you sure you want to sign out? You will need to sign back in with your credentials to access your DevFlow boards and account settings.
        </p>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-xs text-[var(--color-text)] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default LogoutConfirmationModal;
