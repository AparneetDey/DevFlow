import { useState, useRef, useEffect } from 'react';
import { Plus, LayoutDashboard, Kanban, Layers, Sparkles, FolderPlus, Info, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BoardCard } from '../components/boards/BoardCard';
import { BoardSkeleton } from '../components/boards/BoardSkeleton';
import { Button } from '../components/common/Button';

// Locally defined mock board dataset mirroring backend Board model fields
const INITIAL_MOCK_BOARDS = [
  {
    _id: 'mock-board-1',
    title: 'Product Roadmap 2026',
    description: 'Quarterly feature milestones, core infrastructure updates, and customer-facing releases.',
    color: 'indigo',
    updatedAt: '2026-10-25T14:30:00.000Z',
    columnCount: 3,
  },
  {
    _id: 'mock-board-2',
    title: 'Sprint Backlog',
    description: 'Current agile sprint user stories, bug fixes, and development workflows.',
    color: 'emerald',
    updatedAt: '2026-10-25T11:15:00.000Z',
    columnCount: 3,
  },
  {
    _id: 'mock-board-3',
    title: 'DevOps & CI/CD Pipelines',
    description: 'Docker containerization, automated testing workflows, and cloud deployments.',
    color: 'violet',
    updatedAt: '2026-10-24T18:45:00.000Z',
    columnCount: 3,
  },
  {
    _id: 'mock-board-4',
    title: 'Design System & UI Library',
    description: 'Component token standards, responsive layouts, accessibility audits, and icons.',
    color: 'amber',
    updatedAt: '2026-10-23T09:20:00.000Z',
    columnCount: 3,
  },
];

export function DashboardPage() {
  const { user } = useAuth();

  // Dashboard presentation states (isolated for Task 5 API integration)
  const [boards] = useState(INITIAL_MOCK_BOARDS);
  const [isLoading] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const noticeTimerRef = useRef(null);

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

        {/* Create Board Entry Point (Header Action) */}
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
              <p className="font-semibold text-indigo-950">UI-Only Entry Point (Task 4)</p>
              <p className="text-indigo-800 mt-0.5">
                Board creation modal and live Backend Board API integration (<code>POST /api/v1/boards</code>) will be connected in Task 5.
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

        {/* Mutually Exclusive Presentation States: Loading vs Empty vs Populated */}
        {isLoading ? (
          /* 1. Loading State: Skeleton cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
            <BoardSkeleton count={6} />
          </div>
        ) : boards.length === 0 ? (
          /* 2. Empty State: No boards available */
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
          /* 3. Populated State: Display board cards */
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
                UI Entry Point (Task 5)
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
