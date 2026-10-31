import { Loader2 } from 'lucide-react';

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

/**
 * Reusable Loading Spinner component for inline or full-screen loading states.
 * Styled via centralized DevFlow CSS custom properties.
 */
export function Loading({
  size = 'md',
  text,
  fullScreen = false,
  className = '',
}) {
  const spinnerSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-[var(--color-text-muted)] ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={`${spinnerSize} animate-spin text-[var(--color-primary)]`} />
      {text && <span className="text-sm font-medium text-[var(--color-text-secondary)]">{text}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
}

export default Loading;
