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
      className={`w-72 sm:w-80 shrink-0 bg-slate-100/75 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex flex-col min-h-[440px] transition-colors ${className}`.trim()}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-2.5 pb-2.5 border-b border-slate-200/70 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full bg-slate-400/80 shrink-0"
            aria-hidden="true"
          />
          <h3
            id={`column-header-${columnKey}`}
            className="text-sm font-semibold text-slate-800 tracking-tight truncate"
            title={columnTitle}
          >
            {columnTitle}
          </h3>
        </div>
      </div>

      {/* Column Body / Content Area */}
      <div className="flex-1 flex flex-col gap-2.5 min-h-[350px]">
        {hasTasks ? (
          children
        ) : (
          <div
            role="region"
            aria-label={`Empty ${columnTitle} column`}
            className="flex-1 rounded-xl border border-dashed border-slate-300/80 bg-white/50 p-6 flex flex-col items-center justify-center text-center select-none"
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
