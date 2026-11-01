import { Link } from 'react-router-dom';
import { Kanban, ArrowUpRight, Clock, Pencil, Trash2 } from 'lucide-react';

/**
 * Reusable presentation component for displaying board summaries in the dashboard grid.
 * Exposes explicit Edit and Delete action controls while preserving card navigation.
 * Styled via centralized DevFlow CSS custom properties.
 *
 * @param {Object} props
 * @param {Object} props.board - Board metadata { _id, title, description, color, updatedAt, columns }
 * @param {Function} [props.onEdit] - Edit action callback receiving the board object
 * @param {Function} [props.onDelete] - Delete action callback receiving the board object
 */
export function BoardCard({ board, onEdit, onDelete }) {
  const columnCount = Array.isArray(board.columns) && board.columns.length > 0
    ? board.columns.length
    : (board.columnCount || 3);

  const formattedDate = (() => {
    if (!board.updatedAt) return null;
    const date = new Date(board.updatedAt);
    return isNaN(date.getTime())
      ? null
      : date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
  })();

  const title = board.title || 'Untitled Board';

  return (
    <Link
      to={`/boards/${board._id}`}
      aria-label={`Open ${title} board`}
      className="group relative bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 sm:p-5 shadow-xs hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)] transition-all duration-200 flex flex-col justify-between overflow-hidden min-h-[150px] min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-primary)]" />

      <div className="min-w-0">
        {/* Header: Icon, Actions & External Link hint */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 bg-[var(--color-primary-muted)] text-[var(--color-text)] border-[var(--color-primary)]/40">
            <Kanban className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(board);
                }}
                aria-label={`Edit ${title} board`}
                title="Edit board"
                className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(board);
                }}
                aria-label={`Delete ${title} board`}
                title="Delete board"
                className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors p-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text)] group-hover:text-[var(--color-text)] transition-colors line-clamp-1 mb-1 break-words">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-3 break-words">
          {board.description || 'No description provided for this board.'}
        </p>
      </div>

      {/* Footer: Metadata */}
      <div className="pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span className="font-medium bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-2 py-0.5 rounded text-[11px]">
          {columnCount} {columnCount === 1 ? 'Column' : 'Columns'}
        </span>

        {formattedDate && (
          <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            <Clock className="w-3 h-3" />
            {formattedDate}
          </span>
        )}
      </div>
    </Link>
  );
}

export default BoardCard;
