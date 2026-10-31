/**
 * Reusable Form Input component with label, error display, and consistent SaaS styling.
 * Styled via centralized DevFlow CSS custom properties.
 */
export function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
  ...rest
}) {
  const inputId = id || name;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5"
        >
          {label} {required && <span className="text-[var(--color-accent)]">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full px-3.5 py-2 text-sm bg-[var(--color-input-bg)] text-[var(--color-text)] border rounded-lg transition-colors placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-[var(--color-bg)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed ${
          error
            ? 'border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]/30'
            : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-muted)]'
        } ${className}`.trim()}
        {...rest}
      />
      {error && (
        <p className="mt-1 text-xs text-[var(--color-accent)] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
