import { Loader2 } from 'lucide-react';

const variantClasses = {
  primary:
    'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text)] shadow-xs focus-visible:ring-[var(--color-focus)]',
  secondary:
    'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border)] focus-visible:ring-[var(--color-focus)]',
  outline:
    'border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text)] focus-visible:ring-[var(--color-focus)]',
  danger:
    'bg-[var(--color-danger)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text)] shadow-xs focus-visible:ring-[var(--color-danger)]',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-5 py-2.5 text-base font-medium',
};

/**
 * Reusable Button component with multiple variants, sizing, and loading states.
 * Styled via centralized DevFlow CSS custom properties.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';
  const variantClass = variantClasses[variant] || variantClasses.primary;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin text-current" />
      )}
      {children}
    </button>
  );
}

export default Button;
