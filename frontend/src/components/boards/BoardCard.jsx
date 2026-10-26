import { Link } from 'react-router-dom';
import { Kanban, ArrowUpRight, Clock, Pencil, Trash2 } from 'lucide-react';

const colorThemes = {
  indigo: {
    bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    bar: 'bg-indigo-600',
    hoverBorder: 'hover:border-indigo-300',
  },
  emerald: {
    bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    bar: 'bg-emerald-600',
    hoverBorder: 'hover:border-emerald-300',
  },
  violet: {
    bg: 'bg-violet-50 text-violet-600 border-violet-100',
    bar: 'bg-violet-600',
    hoverBorder: 'hover:border-violet-300',
  },
  amber: {
    bg: 'bg-amber-50 text-amber-600 border-amber-100',
    bar: 'bg-amber-600',
    hoverBorder: 'hover:border-amber-300',
  },
};

/**
 * Reusable presentation component for displaying board summaries in the dashboard grid.
 * Exposes explicit Edit and Delete action controls while preserving card navigation.
 *
 * @param {Object} props
 * @param {Object} props.board - Board metadata { _id, title, description, color, updatedAt, columns }
 * @param {Function} [props.onEdit] - Edit action callback receiving the board object
 * @param {Function} [props.onDelete] - Delete action callback receiving the board object
 */
export function BoardCard({ board, onEdit, onDelete }) {
  const theme = colorThemes[board.color] || colorThemes.indigo;

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
      className={`group relative bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden min-h-[170px] min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${theme.hoverBorder}`}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bar}`} />

      <div className="min-w-0">
        {/* Header: Icon, Actions & External Link hint */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${theme.bg}`}>
            <Kanban className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1 shrink-0">
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="text-slate-400 group-hover:text-indigo-600 transition-colors p-1">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1.5 break-words">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 break-words">
          {board.description || 'No description provided for this board.'}
        </p>
      </div>

      {/* Footer: Metadata */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
          {columnCount} {columnCount === 1 ? 'Column' : 'Columns'}
        </span>

        {formattedDate && (
          <span className="flex items-center gap-1 text-[11px]">
            <Clock className="w-3 h-3" />
            {formattedDate}
          </span>
        )}
      </div>
    </Link>
  );
}

export default BoardCard;
