import { ShieldCheck, LogOut, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button.jsx';

/**
 * Dedicated profile actions and security management component.
 * Houses the sign-out trigger with destructive red styling and session security indicators.
 *
 * @param {object} props
 * @param {Function} props.onLogout - Callback to initiate user sign-out
 * @param {boolean} [props.isLoggingOut=false] - Whether sign-out is in progress
 * @param {string|null} [props.error=null] - Error message if sign-out fails
 */
export function ProfileActions({ onLogout, isLoggingOut = false, error = null }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">

      {/* Sign Out Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Sign Out</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            End your authenticated session on this browser
          </p>
        </div>

        <Button
          type="button"
          variant="danger"
          size="sm"
          isLoading={isLoggingOut}
          onClick={onLogout}
          className="w-full sm:w-auto"
          >
          <LogOut className="w-4 h-4 mr-1.5" />
          Sign Out
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-xs text-[var(--color-text)] flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default ProfileActions;
