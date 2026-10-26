import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  LayoutDashboard,
  Kanban,
  Layers,
  Sparkles,
  FolderPlus,
  Info,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BoardCard } from '../components/boards/BoardCard';
import { BoardSkeleton } from '../components/boards/BoardSkeleton';
import { Button } from '../components/common/Button';
import boardApi from '../api/board.api.js';
import { extractErrorMessage } from '../api/error.js';

export function DashboardPage() {
  const { user } = useAuth();

  // Dashboard state: Live boards from backend API
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);
  const [showNotice, setShowNotice] = useState(false);

  const noticeTimerRef = useRef(null);

  // Fetch boards on mount or when reloadIndex triggers a refresh
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchBoards() {
      try {
        const response = await boardApi.getBoards({ signal: controller.signal });
        const boardData = response.data?.data;

        if (isMounted) {
          if (Array.isArray(boardData)) {
            setBoards(boardData);
          } else {
            setBoards([]);
          }
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore client-side cancellation on component unmount
        if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }

        if (isMounted) {
          setError(extractErrorMessage(err));
          setIsLoading(false);
        }
      }
    }

    fetchBoards();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [reloadIndex]);

  /**
   * User-triggered retry action when a request fails.
   */
  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setReloadIndex((prev) => prev + 1);
  };

  // UI-only placeholder handlers for Create Board actions (Task 5.2)
  const handleCreatePlaceholder = () => {
    setShowNotice(true);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setShowNotice(false);
      noticeTimerRef.current = null;
    }, 4000);
  };

  const handleDismissNotice = () => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setShowNotice(false);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const displayName = user?.username ? `, ${user.username}` : '';

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Workspaces Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back{displayName}!
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Manage your project workspaces, track Kanban cards across default status columns (Todo, In Progress, Done), and monitor development progress.
          </p>
        </div>

        {/* Create Board Entry Point (Header Action - UI-Only Placeholder) */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleCreatePlaceholder}
            className="flex items-center gap-2"
            aria-label="Create board workspace"
          >
            <Plus className="w-4 h-4" />
            <span>Create Board</span>
          </Button>
        </div>
      </div>

      {/* Temporary Notice when clicking Create Board placeholder */}
      {showNotice && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start justify-between gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs transition-all duration-200"
        >
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-indigo-950">UI-Only Entry Point (Task 5.1)</p>
              <p className="text-indigo-800 mt-0.5">
                Board creation modal and live Backend Board creation API integration (<code>POST /api/v1/boards</code>) will be connected in Task 5.2.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissNotice}
            className="text-indigo-400 hover:text-indigo-600 p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 shrink-0 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Boards</p>
            {isLoading ? (
              <div className="h-5 w-8 bg-slate-200 rounded animate-pulse mt-1" />
            ) : error ? (
              <p className="text-lg font-bold text-slate-400">—</p>
            ) : (
              <p className="text-lg font-bold text-slate-900">{boards.length}</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Workflow Columns</p>
            <p className="text-lg font-bold text-slate-900">3 Fixed Stages</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Agile Workflow</p>
            <p className="text-lg font-bold text-slate-900">Kanban Board</p>
          </div>
        </div>
      </div>

      {/* Boards Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your Boards</h2>
          <p className="text-xs text-slate-500 mt-0.5">Select any workspace to view and organize Kanban tasks.</p>
        </div>

        {/* Mutually Exclusive Presentation States: Loading vs Error vs Empty vs Populated */}
        {isLoading ? (
          /* 1. Loading State: Skeleton cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
            <BoardSkeleton count={6} />
          </div>
        ) : error ? (
          /* 2. Error State: Request failure alert */
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-2xl p-8 sm:p-10 text-center max-w-lg mx-auto my-8 space-y-4 shadow-2xs"
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200 shadow-2xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-red-900">Failed to load boards</h3>
              <p className="text-xs text-red-700 max-w-sm mx-auto leading-relaxed">
                {error}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-100/60 cursor-pointer"
              aria-label="Retry loading boards"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        ) : boards.length === 0 ? (
          /* 3. Empty State: No boards available */
          <div
            role="region"
            aria-label="Empty boards state"
            className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center max-w-lg mx-auto my-8 space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-2xs">
              <FolderPlus className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">No boards available</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You do not have any active project workspaces yet. Create a new board to get started organizing your tasks.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreatePlaceholder}
              className="inline-flex items-center gap-1.5"
              aria-label="Create your first board workspace"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Board</span>
            </Button>
          </div>
        ) : (
          /* 4. Populated State: Display board cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Create Board Entry Point (Dashed Card) */}
            <button
              type="button"
              onClick={handleCreatePlaceholder}
              aria-label="Create new board workspace"
              className="min-h-[170px] rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 p-6 flex flex-col items-center justify-center text-center transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <div className="w-10 h-10 rounded-full bg-white text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 flex items-center justify-center border border-slate-200 group-hover:border-indigo-200 transition-all mb-2.5 shadow-2xs">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                Create New Board
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                UI Entry Point (Task 5.2)
              </span>
            </button>

            {/* Board Cards */}
            {boards.map((board) => (
              <BoardCard key={board._id} board={board} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
