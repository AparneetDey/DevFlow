/**
 * Reusable Form Input component with label, error display, and consistent SaaS styling.
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
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
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
        className={`w-full px-3.5 py-2 text-sm bg-white text-slate-900 border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-100'
        } ${className}`.trim()}
        {...rest}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
