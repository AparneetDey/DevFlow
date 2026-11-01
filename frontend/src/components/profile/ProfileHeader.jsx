import { Mail, CheckCircle2 } from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar.jsx';

/**
 * Profile header presenting the user's primary avatar, display name,
 * registered email address, and account status indicator.
 *
 * @param {object} props
 * @param {object} props.profile - Normalized profile view model
 */
export function ProfileHeader({ profile }) {
  const { initials, displayName, email, role = 'DevFlow Member' } = profile || {};

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left min-w-0">
        <ProfileAvatar initials={initials} size="md" />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight truncate">
              {displayName || 'User Profile'}
            </h1>
            <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-muted)] text-[var(--color-text)] border border-[var(--color-primary)]/40 self-center sm:self-auto">
              <CheckCircle2 className="w-3 h-3 text-[var(--color-primary-hover)]" />
              {role}
            </span>
          </div>

          <p
            className="text-xs sm:text-sm text-[var(--color-text-secondary)] flex items-center justify-center sm:justify-start gap-1.5 truncate"
            title={email}
          >
            <Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            <span className="truncate">{email || 'No email registered'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
