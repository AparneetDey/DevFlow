/**
 * Reusable loading skeleton component matching the layout and dimensions of TaskCard.
 * Uses Tailwind CSS's native animate-pulse with DevFlow's dark design tokens.
 * Accurately mirrors TaskCard's padding (p-2.5), border radius (rounded-xl),
 * background, checkbox slot, title, description, and metadata tags to prevent layout shifts.
 *
 * @param {Object} props
 * @param {number} [props.count=2] - Number of skeleton cards to render
 */
export function TaskSkeleton({ count = 2 }) {
  if (count <= 0) {
    return null;
  }

  // Realistic width variations for multi-card skeletons
  const variations = [
    { titleWidth: 'w-4/5', hasDesc: true, descWidth: 'w-11/12', tagWidth: 'w-12', hasDate: true },
    { titleWidth: 'w-3/5', hasDesc: false, descWidth: '', tagWidth: 'w-14', hasDate: false },
    { titleWidth: 'w-2/3', hasDesc: true, descWidth: 'w-3/4', tagWidth: 'w-10', hasDate: true },
    { titleWidth: 'w-5/6', hasDesc: false, descWidth: '', tagWidth: 'w-12', hasDate: true },
  ];

  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => {
        const v = variations[index % variations.length];
        return (
          <div
            key={index}
            className="p-2.5 bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)] flex flex-col gap-2 min-w-0 animate-pulse shadow-xs"
            aria-hidden="true"
          >
            {/* Top row: Title placeholder flush left & Pencil icon on right */}
            <div className="flex items-center justify-between min-w-0">
              <div className={`h-4 ${v.titleWidth} bg-[var(--color-border)]/80 rounded`} />
              <div className="w-3.5 h-3.5 rounded bg-[var(--color-border)]/40 shrink-0 ml-2" />
            </div>

            {/* Description row (when present in variation) */}
            {v.hasDesc && (
              <div className={`h-3 ${v.descWidth} bg-[var(--color-border)]/50 rounded`} />
            )}

            {/* Metadata row: Priority badge & Date placeholder */}
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]/60">
              <div className={`h-4.5 ${v.tagWidth} rounded-md bg-[var(--color-border)]/60`} />
              {v.hasDate && (
                <div className="h-3.5 w-14 rounded bg-[var(--color-border)]/40" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TaskSkeleton;
