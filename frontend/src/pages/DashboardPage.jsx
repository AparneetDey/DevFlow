import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus,
  Kanban,
  FolderPlus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { BoardCard } from '../components/boards/BoardCard.jsx';
import { BoardSkeleton } from '../components/boards/BoardSkeleton.jsx';
import { CreateBoardModal } from '../components/boards/CreateBoardModal.jsx';
import { EditBoardModal } from '../components/boards/EditBoardModal.jsx';
import { DeleteBoardModal } from '../components/boards/DeleteBoardModal.jsx';
import { Button } from '../components/common/Button.jsx';
import boardApi from '../api/board.api.js';
import { extractErrorMessage } from '../api/error.js';

export function DashboardPage() {
  // Dashboard state: Live boards from backend API
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadIndex, setReloadIndex] = useState(0);

  // Modal dialog states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [deletingBoard, setDeletingBoard] = useState(null);

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

  /**
   * Callback invoked when a board is successfully created via CreateBoardModal.
   * Prepends the new board to state and transitions the view if previously empty.
   */
  const handleBoardCreated = (newBoard) => {
    if (!newBoard || !newBoard._id) return;
    setBoards((prevBoards) => [newBoard, ...prevBoards]);
  };

  /**
   * Callback invoked when a board is successfully updated via EditBoardModal.
   * Updates only the target board in state, preserving all others and metrics.
   */
  const handleBoardUpdated = (updatedBoard) => {
    if (!updatedBoard || !updatedBoard._id) return;
    setBoards((prevBoards) =>
      prevBoards.map((b) => (b._id === updatedBoard._id ? updatedBoard : b))
    );
    setEditingBoard(null);
  };

  /**
   * Callback invoked when a board is successfully deleted via DeleteBoardModal.
   * Removes the board from state, reactively updating metrics or triggering empty state.
   */
  const handleBoardDeleted = (boardId) => {
    if (!boardId) return;
    setBoards((prevBoards) => prevBoards.filter((b) => b._id !== boardId));
    setDeletingBoard(null);
  };

  return (
    <div className="space-y-6">
      {/* Sleek Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Kanban className="w-5 h-5 text-[var(--color-primary-hover)] shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight">
              Your Workspaces
            </h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Select a board workspace to manage tasks, or create a new board to organize a project.
          </p>
        </div>

        {/* Create Board Header Action */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            aria-label="Create board workspace"
          >
            <Plus className="w-4 h-4" />
            <span>Create Board</span>
          </Button>
        </div>
      </div>

      {/* Boards Section */}
      <div>
        {/* Mutually Exclusive Presentation States: Loading vs Error vs Empty vs Populated */}
        {isLoading ? (
          /* 1. Loading State: Skeleton cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy="true">
            <BoardSkeleton count={8} />
          </div>
        ) : error ? (
          /* 2. Error State: Request failure alert */
          <div
            role="alert"
            className="bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 rounded-xl p-6 sm:p-8 text-center max-w-lg mx-auto my-6 space-y-4 shadow-xs"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-danger)]/20 text-[var(--color-danger)] flex items-center justify-center mx-auto border border-[var(--color-danger)]/40 shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--color-text)]">Failed to load boards</h3>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">
                {error}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 cursor-pointer text-xs"
              aria-label="Retry loading boards"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        ) : boards.length === 0 ? (
          /* 3. Clean, Minimal Empty State */
          <div
            role="region"
            aria-label="Empty boards state"
            className="bg-[var(--color-surface)] rounded-xl border border-dashed border-[var(--color-border)] p-8 sm:p-12 text-center max-w-md mx-auto my-8 space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-muted)] text-[var(--color-text)] flex items-center justify-center mx-auto border border-[var(--color-primary)]/40 shadow-xs">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--color-text)]">No boards yet</h3>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto">
                Create your first project workspace to start organizing your Kanban workflow.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs cursor-pointer"
              aria-label="Create your first board workspace"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Board</span>
            </Button>
          </div>
        ) : (
          /* 4. Populated State: Display board cards in clean Trello-style grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Create Board Entry Point (Dashed Card) */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              aria-label="Create new board workspace"
              className="min-h-[150px] rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface)]/50 hover:bg-[var(--color-surface)] p-5 flex flex-col items-center justify-center text-center transition-all duration-200 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)] group-hover:bg-[var(--color-primary-muted)] flex items-center justify-center border border-[var(--color-border)] group-hover:border-[var(--color-primary)]/40 transition-all mb-2 shadow-xs">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[var(--color-text)] transition-colors">
                Create New Board
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                Add workspace
              </span>
            </button>

            {/* Board Cards */}
            {boards.map((board) => (
              <BoardCard
                key={board._id}
                board={board}
                onEdit={(b) => setEditingBoard(b)}
                onDelete={(b) => setDeletingBoard(b)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      <CreateBoardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBoardCreated={handleBoardCreated}
      />

      {/* Edit Board Dialog */}
      {editingBoard && (
        <EditBoardModal
          key={editingBoard._id}
          board={editingBoard}
          isOpen={Boolean(editingBoard)}
          onClose={() => setEditingBoard(null)}
          onBoardUpdated={handleBoardUpdated}
        />
      )}

      {/* Delete Board Confirmation Dialog */}
      {deletingBoard && (
        <DeleteBoardModal
          key={deletingBoard._id}
          board={deletingBoard}
          isOpen={Boolean(deletingBoard)}
          onClose={() => setDeletingBoard(null)}
          onBoardDeleted={handleBoardDeleted}
        />
      )}
    </div>
  );
}

export default DashboardPage;
