import { Link } from 'react-router-dom';
import { Kanban, ArrowUpRight, Clock } from 'lucide-react';

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
 *
 * @param {Object} props
 * @param {Object} props.board - Board metadata { _id, title, description, color, updatedAt, columnCount }
 */
export function BoardCard({ board }) {
  const theme = colorThemes[board.color] || colorThemes.indigo;

  const formattedDate = board.updatedAt
    ? new Date(board.updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      to={`/boards/${board._id}`}
      className={`group relative bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden ${theme.hoverBorder}`}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bar}`} />

      <div>
        {/* Header: Icon & External Link hint */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${theme.bg}`}>
            <Kanban className="w-5 h-5" />
          </div>
          <span className="text-slate-400 group-hover:text-indigo-600 transition-colors p-1">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1.5">
          {board.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
          {board.description || 'No description provided for this board.'}
        </p>
      </div>

      {/* Footer: Metadata */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
          3 Columns
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
