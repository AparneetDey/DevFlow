/**
 * Reusable presentation component for a Kanban workflow column.
 * Displays column header and a task container with an empty message fallback.
 *
 * @param {Object} props
 * @param {Object} props.column - Column metadata { title, key, order }
 * @param {React.ReactNode} [props.children] - Task cards to render within the column
 * @param {string} [props.className] - Optional custom CSS classes
 */
export function KanbanColumn({ column, children, className = '' }) {
  const hasTasks = Boolean(children);
  const columnTitle = column?.title || 'Untitled Column';
  const columnKey = column?.key || columnTitle;

  return (
    <section
      aria-labelledby={`column-header-${columnKey}`}
      className={`w-72 sm:w-80 shrink-0 bg-slate-100/80 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col min-h-[420px] transition-colors ${className}`.trim()}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1.5 py-2 mb-2 border-b border-slate-200/60">
        <h3
          id={`column-header-${columnKey}`}
          className="text-sm font-bold text-slate-800 tracking-tight"
        >
          {columnTitle}
        </h3>
      </div>

      {/* Column Body / Content Area */}
      <div className="flex-1 flex flex-col gap-3 min-h-[320px]">
        {hasTasks ? (
          children
        ) : (
          <div
            role="region"
            aria-label={`Empty ${columnTitle} column`}
            className="flex-1 rounded-xl border-2 border-dashed border-slate-200/80 bg-white/40 p-6 flex flex-col items-center justify-center text-center select-none"
          >
            <p className="text-xs font-medium text-slate-400">
              No tasks yet
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default KanbanColumn;
