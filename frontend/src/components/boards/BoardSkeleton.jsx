/**
 * Reusable loading skeleton component matching the layout and dimensions of BoardCard.
 * Uses Tailwind CSS's native animate-pulse with DevFlow's dark design tokens.
 * Accurately mirrors BoardCard's padding (p-4 sm:p-5), accent bar, header icon (w-8 h-8),
 * title spacing, description lines, and footer metadata to eliminate layout shifts.
 *
 * @param {Object} props
 * @param {number} [props.count=1] - Number of skeleton cards to render
 */
export function BoardSkeleton({ count = 1 }) {
  if (count <= 0) {
    return null;
  }

  // Realistic width variations across multi-card skeletons
  const variations = [
    { titleWidth: 'w-3/5', descWidth1: 'w-full', descWidth2: 'w-4/5', colWidth: 'w-16', dateWidth: 'w-20' },
    { titleWidth: 'w-4/5', descWidth1: 'w-full', descWidth2: 'w-2/3', colWidth: 'w-20', dateWidth: 'w-16' },
    { titleWidth: 'w-1/2', descWidth1: 'w-11/12', descWidth2: 'w-3/4', colWidth: 'w-16', dateWidth: 'w-20' },
    { titleWidth: 'w-3/4', descWidth1: 'w-full', descWidth2: 'w-1/2', colWidth: 'w-18', dateWidth: 'w-18' },
  ];

  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const v = variations[index % variations.length];
        return (
          <div
            key={index}
            className="relative bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden animate-pulse min-h-[150px] min-w-0"
            aria-hidden="true"
          >
            {/* Top accent bar placeholder matching BoardCard */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-primary)]/40" />

            <div className="min-w-0">
              {/* Header: Icon & action placeholder matching BoardCard gap-3 mb-2.5 */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] shrink-0" />
                <div className="w-3.5 h-3.5 rounded bg-[var(--color-surface-elevated)] mt-0.5" />
              </div>

              {/* Title placeholder matching text-sm sm:text-base font-semibold mb-1 */}
              <div className={`h-5 bg-[var(--color-surface-elevated)] rounded-md ${v.titleWidth} mb-1.5`} />

              {/* Description lines placeholder matching text-xs line-clamp-2 leading-relaxed mb-3 */}
              <div className="space-y-1.5 mb-3">
                <div className={`h-3 bg-[var(--color-surface-elevated)]/80 rounded ${v.descWidth1}`} />
                <div className={`h-3 bg-[var(--color-surface-elevated)]/60 rounded ${v.descWidth2}`} />
              </div>
            </div>

            {/* Footer: Metadata placeholder matching pt-2.5 border-t border-[var(--color-border)] */}
            <div className="pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className={`h-5 ${v.colWidth} bg-[var(--color-surface-elevated)] rounded border border-[var(--color-border)]/50`} />
              <div className={`h-3.5 ${v.dateWidth} bg-[var(--color-surface-elevated)]/70 rounded`} />
            </div>
          </div>
        );
      })}
    </>
  );
}

export default BoardSkeleton;
