/**
 * Reusable loading skeleton component matching the layout and dimensions of BoardCard.
 * Uses Tailwind CSS's native animate-pulse for a subtle, lightweight loading effect.
 *
 * @param {Object} props
 * @param {number} [props.count=1] - Number of skeleton cards to render
 */
export function BoardSkeleton({ count = 1 }) {
  if (count <= 0) {
    return null;
  }

  if (count === 1) {
    return (
      <div
        className="relative bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between overflow-hidden animate-pulse min-h-[170px] min-w-0"
        aria-hidden="true"
      >
        {/* Top accent bar placeholder */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200" />

        <div>
          {/* Header: Icon & action placeholder */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-slate-200" />
            <div className="w-4 h-4 rounded bg-slate-100" />
          </div>

          {/* Title placeholder */}
          <div className="h-4.5 bg-slate-200 rounded-md w-3/4 mb-2.5 mt-2" />

          {/* Description lines placeholder */}
          <div className="space-y-1.5 mb-4">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-4/5" />
          </div>
        </div>

        {/* Footer: Metadata placeholder */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="h-4 w-16 bg-slate-100 rounded" />
          <div className="h-3.5 w-20 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <BoardSkeleton key={index} count={1} />
      ))}
    </>
  );
}

export default BoardSkeleton;
