import { User, Mail, Key, Calendar } from 'lucide-react';
import { ProfileField } from './ProfileField.jsx';

/**
 * Grouping component displaying the user's primary account credentials
 * and platform identification metadata.
 *
 * @param {object} props
 * @param {object} props.profile - Normalized profile view model
 */
export function ProfileInformation({ profile }) {
  const { username, email, userId, memberSince } = profile || {};

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)]">
          Personal Information
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
          Your DevFlow account credentials and identification details
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-1">
        <ProfileField
          label="Username"
          value={username}
          icon={User}
        />

        <ProfileField
          label="Email Address"
          value={email}
          icon={Mail}
        />

        <ProfileField
          label="User ID"
          value={userId || 'N/A'}
          icon={Key}
          mono
          copyable={Boolean(userId)}
          copyValue={userId}
        />

        <ProfileField
          label="Member Since"
          value={memberSince}
          icon={Calendar}
        />
      </div>
    </div>
  );
}

export default ProfileInformation;
