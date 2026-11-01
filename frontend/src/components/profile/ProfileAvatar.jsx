const sizeClasses = {
  sm: 'w-10 h-10 text-sm font-semibold',
  md: 'w-14 h-14 sm:w-16 sm:h-16 text-lg sm:text-xl font-bold',
  lg: 'w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl font-bold',
};

/**
 * Reusable Avatar component displaying user initials styled with DevFlow's
 * dark green aesthetic.
 *
 * @param {object} props
 * @param {string} props.initials - 1-2 character initials to display
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Sizing variant
 * @param {string} [props.className=''] - Additional CSS classes
 */
export function ProfileAvatar({ initials = 'DF', size = 'md', className = '' }) {
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      role="img"
      aria-label={`User avatar ${initials}`}
      className={`inline-flex items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-[var(--color-text)] border-2 border-[var(--color-primary)]/40 shadow-xs select-none shrink-0 ${sizeClass} ${className}`.trim()}
    >
      <span>{initials}</span>
    </div>
  );
}

export default ProfileAvatar;
