import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Kanban,
  Clock,
  Layers,
  AlertCircle,
  RefreshCw,
  FolderX,
} from 'lucide-react';
import { Button } from '../components/common/Button.jsx';
import KanbanColumn from '../components/boards/KanbanColumn.jsx';
import boardApi from '../api/board.api.js';
import { sortBoardColumns } from '../utils/columnSorting.js';
import { extractErrorMessage } from '../api/error.js';

export function BoardPage() {
  const { boardId } = useParams();

  const [board, setBoard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);

  // Fetch board details on mount or when boardId route param / reloadIndex changes
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadBoard() {
      // Validate that boardId matches 24-character hexadecimal MongoDB ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(boardId || '');

      if (!isValidObjectId) {
        await Promise.resolve();
        if (isMounted) {
          setBoard(null);
          setError(null);
          setIsNotFound(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await boardApi.getBoardById(boardId, {
          signal: controller.signal,
        });

        if (isMounted) {
          setBoard(response.data?.data || null);
          setError(null);
          setIsNotFound(false);
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore client-side cancellation on route change or unmount
        if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }

        if (isMounted) {
          if (err.response?.status === 404) {
            setBoard(null);
            setIsNotFound(true);
            setError(null);
          } else {
            setBoard(null);
            setIsNotFound(false);
            setError(extractErrorMessage(err));
          }
          setIsLoading(false);
        }
      }
    }

    loadBoard();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [boardId, reloadIndex]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setIsNotFound(false);
    setReloadIndex((prev) => prev + 1);
  };

  const formattedDate = (() => {
    if (!board?.updatedAt) return null;
    const date = new Date(board.updatedAt);
    return isNaN(date.getTime())
      ? null
      : date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  })();

  const columns = sortBoardColumns(board?.columns);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Loading State: Header & Column Skeletons */}
      {isLoading ? (
        <div className="space-y-6 sm:space-y-8" aria-busy="true">
          {/* Back link skeleton */}
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />

          {/* Header Card Skeleton */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4 animate-pulse">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-8 w-72 max-w-full bg-slate-200 rounded-md" />
            <div className="h-4 w-full max-w-md bg-slate-100 rounded" />
            <div className="flex gap-2.5 pt-1.5">
              <div className="h-6 w-24 bg-slate-100 rounded-lg" />
              <div className="h-6 w-32 bg-slate-100 rounded-lg" />
            </div>
          </div>

          {/* Kanban Columns Skeleton */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto pb-6 pt-1">
              {[1, 2, 3].map((colIndex) => (
                <div
                  key={colIndex}
                  className="w-72 sm:w-80 shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 min-h-[440px] animate-pulse flex flex-col"
                >
                  <div className="flex items-center gap-2 px-1.5 py-1 mb-2.5 pb-2.5 border-b border-slate-200/60">
                    <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                  </div>
                  <div className="flex-1 rounded-xl border border-dashed border-slate-200/80 bg-white/40 p-6 flex flex-col items-center justify-center" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : isNotFound ? (
        /* 2. Not Found / Invalid ID State */
        <div
          role="region"
          aria-label="Board not found"
          className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 sm:p-12 text-center max-w-lg mx-auto my-12 space-y-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100 shadow-2xs">
            <FolderX className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">Board Not Found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              The requested board workspace does not exist, or you do not have permission to view it.
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="primary" size="md" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>
      ) : error ? (
        /* 3. Error State */
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-2xl p-8 sm:p-10 text-center max-w-lg mx-auto my-12 space-y-5 shadow-2xs"
        >
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200 shadow-2xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-red-900">Failed to load board</h2>
            <p className="text-xs text-red-700 max-w-sm mx-auto leading-relaxed">{error}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-100/60 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
            <Link to="/dashboard">
              <Button variant="secondary" size="sm" className="inline-flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : board ? (
        /* 4. Populated Board Detail */
        <div className="space-y-6 sm:space-y-8">
          {/* Back Navigation Link */}
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Board Header Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-1.5 text-indigo-600">
                <Kanban className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Board Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
                {board.title}
              </h1>
              {board.description ? (
                <p className="text-sm text-slate-600 leading-relaxed break-words whitespace-pre-line max-w-3xl">
                  {board.description}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No description provided for this board.
                </p>
              )}

              {/* Board Metadata Pills */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium border border-slate-200/80">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{columns.length} {columns.length === 1 ? 'Column' : 'Columns'}</span>
                </span>

                {formattedDate && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Updated {formattedDate}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Kanban Columns Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Workflow Stages</span>
              </h2>
            </div>

            {columns.length === 0 ? (
              <div
                role="region"
                aria-label="No workflow columns"
                className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center max-w-md mx-auto my-6"
              >
                <p className="text-sm font-medium text-slate-500">
                  No columns configured for this board.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto pb-6 pt-1 focus:outline-none min-w-0">
                {columns.map((column, index) => (
                  <KanbanColumn
                    key={column.key || column.title || `column-${index}`}
                    column={column}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BoardPage;
