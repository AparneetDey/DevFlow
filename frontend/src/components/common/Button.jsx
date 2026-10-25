import { Loader2 } from 'lucide-react';

const variantClasses = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm focus-visible:ring-indigo-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus-visible:ring-slate-400',
  outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-400',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-500',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-5 py-2.5 text-base font-medium',
};

/**
 * Reusable Button component with multiple variants, sizing, and loading states.
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
  const baseClasses = 'inline-flex items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';
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
