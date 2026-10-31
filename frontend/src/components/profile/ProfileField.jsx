import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Reusable ProfileField component designed with a future-ready architecture
 * for inline or modal editing, while remaining strictly read-only today.
 *
 * @param {object} props
 * @param {string} props.label - Field label
 * @param {string} props.value - Display value
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {boolean} [props.copyable=false] - Enables one-click copy to clipboard
 * @param {string} [props.copyValue] - Custom value to copy (defaults to value)
 * @param {boolean} [props.mono=false] - Use monospace font for technical values (e.g. IDs)
 * @param {boolean} [props.editable=false] - Extension point for future edit support
 * @param {Function} [props.onSave] - Future extension callback for persisting edits
 * @param {string} [props.className=''] - Additional custom classes
 */
export function ProfileField({
  label,
  value,
  icon: Icon,
  copyable = false,
  copyValue,
  mono = false,
  editable = false,
  onSave,
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const textToCopy = copyValue || value;
    if (!textToCopy) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Graceful error recovery: do not crash if clipboard permissions are restricted
      setCopied(false);
    }
  }, [copyValue, value]);

  return (
    <div
      className={`p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1.5 transition-colors ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
          {Icon && <Icon className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />}
          {label}
        </span>

        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer select-none"
            title={`Copy ${label}`}
            aria-label={`Copy ${label}`}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[var(--color-success)]" />
                <span className="text-[var(--color-success)] font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[var(--color-text-muted)]" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {editable ? (
        /* Future editing slot: activated when backend support is introduced */
        <div className="pt-1">
          <input
            type="text"
            defaultValue={value}
            onBlur={(e) => onSave && onSave(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-focus)]"
          />
        </div>
      ) : (
        <p
          className={`text-sm text-[var(--color-text)] truncate ${mono ? 'font-mono text-xs sm:text-sm' : 'font-medium'}`.trim()}
          title={value}
        >
          {value || 'Not provided'}
        </p>
      )}
    </div>
  );
}

export default ProfileField;
