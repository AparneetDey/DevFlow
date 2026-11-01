import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable accessible modal dialog with backdrop, escape key support, and clean animations.
 * Styled via centralized DevFlow CSS custom properties.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) {
  const mountTimeRef = useRef(0);
  const backdropMouseDownRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      mountTimeRef.current = Date.now();
      backdropMouseDownRef.current = false;
    }
  }, [isOpen]);

  // Close modal on Escape key press
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e) => {
    backdropMouseDownRef.current = e.target === e.currentTarget;
  };

  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (!backdropMouseDownRef.current) return;
    // Guard against rapid accidental dismissals (e.g. double-clicking a card where the 2nd click lands on the newly mounted backdrop)
    if (Date.now() - mountTimeRef.current < 400) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--color-bg)]/80 backdrop-blur-xs overflow-y-auto"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${maxWidth} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col bg-[var(--color-surface)] text-[var(--color-text)] rounded-xl shadow-2xl border border-[var(--color-border)] overflow-hidden transform transition-all my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--color-border)] shrink-0 relative z-30">
          <div id="modal-title" className={`text-base font-semibold text-[var(--color-text)] pr-2 ${typeof title === 'string' ? 'truncate' : 'min-w-0'}`}>
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 min-h-0 text-[var(--color-text)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
