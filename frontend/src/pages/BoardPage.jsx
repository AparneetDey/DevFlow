import { useState, useEffect, useRef } from 'react';
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
  CheckSquare,
  Plus,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { Button } from '../components/common/Button.jsx';
import KanbanColumn from '../components/boards/KanbanColumn.jsx';
import TaskCard from '../components/tasks/TaskCard.jsx';
import CreateTaskModal from '../components/tasks/CreateTaskModal.jsx';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal.jsx';
import boardApi from '../api/board.api.js';
import taskApi from '../api/task.api.js';
import { sortBoardColumns } from '../utils/columnSorting.js';
import { getTasksForColumn } from '../utils/taskGrouping.js';
import { extractErrorMessage } from '../api/error.js';
import { normalizeColumnTasks } from '../utils/taskReordering.js';

export function BoardPage() {
  const { boardId } = useParams();

  // Board details state
  const [board, setBoard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);

  // Task fetching state
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState(null);
  const [taskReloadIndex, setTaskReloadIndex] = useState(0);

  // Task action / completion toggle state
  const [togglingTaskIds, setTogglingTaskIds] = useState(new Set());
  const [taskActionError, setTaskActionError] = useState(null);

  // Drag-and-drop state & sensors
  const [activeTask, setActiveTask] = useState(null);
  const [movingTaskIds, setMovingTaskIds] = useState(new Set());
  const dragSnapshotRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Task creation modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [selectedColumnKey, setSelectedColumnKey] = useState('todo');

  // Task details modal state
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);

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

  // Fetch tasks separately on mount, boardId change, or task retry
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadTasks() {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(boardId || '');

      if (!isValidObjectId) {
        await Promise.resolve();
        if (isMounted) {
          setTasks([]);
          setTaskError(null);
          setIsLoadingTasks(false);
        }
        return;
      }

      try {
        const response = await taskApi.getTasksByBoard(boardId, {
          signal: controller.signal,
        });

        if (isMounted) {
          const taskData = response.data?.data;
          setTasks(Array.isArray(taskData) ? taskData : []);
          setTaskError(null);
          setIsLoadingTasks(false);
        }
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }

        if (isMounted) {
          // If board is not found (404), the board effect already handles notFound
          if (err.response?.status !== 404) {
            setTaskError(extractErrorMessage(err));
          }
          setTasks([]);
          setIsLoadingTasks(false);
        }
      }
    }

    loadTasks();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [boardId, taskReloadIndex]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setIsNotFound(false);
    setReloadIndex((prev) => prev + 1);
    setTaskReloadIndex((prev) => prev + 1);
  };

  const handleTaskRetry = () => {
    setIsLoadingTasks(true);
    setTaskError(null);
    setTaskReloadIndex((prev) => prev + 1);
  };

  const handleOpenCreateTask = (columnKey = 'todo') => {
    setSelectedColumnKey(columnKey || 'todo');
    setIsCreateTaskModalOpen(true);
  };

  const handleTaskCreated = (newTask) => {
    if (!newTask || !newTask._id) return;
    setTasks((prevTasks) => [...prevTasks, newTask]);
  };

  const handleOpenTaskDetails = (task) => {
    if (!task) return;
    setSelectedTask(task);
    setIsTaskDetailsModalOpen(true);
  };

  const handleCloseTaskDetails = () => {
    setIsTaskDetailsModalOpen(false);
    setSelectedTask(null);
  };

  const handleUpdateTask = async (taskId, updateData) => {
    const response = await taskApi.updateTask(boardId, taskId, updateData);
    const updatedTask = response.data?.data;
    if (updatedTask && updatedTask._id) {
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
      if (selectedTask?._id === updatedTask._id) {
        setSelectedTask(updatedTask);
      }
    }
    return updatedTask;
  };

  const handleDeleteTask = async (taskId) => {
    if (!taskId || !boardId) {
      throw new Error('Board ID and Task ID are required to delete a task');
    }
    await taskApi.deleteTask(boardId, taskId);
    setTasks((prevTasks) => prevTasks.filter((t) => t._id !== taskId));
    setIsTaskDetailsModalOpen(false);
    setSelectedTask(null);
  };

  const handleToggleComplete = async (task) => {
    if (!task || !task._id || togglingTaskIds.has(task._id)) return;
    const targetColumnKey = task.columnKey === 'done' ? 'todo' : 'done';

    setTogglingTaskIds((prev) => new Set(prev).add(task._id));
    setTaskActionError(null);

    const prevTasks = tasks;
    const prevSelectedTask = selectedTask;
    const optimisticTask = { ...task, columnKey: targetColumnKey };

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? optimisticTask : t))
    );
    if (selectedTask?._id === task._id) {
      setSelectedTask(optimisticTask);
    }

    try {
      const response = await taskApi.moveTask(boardId, task._id, {
        columnKey: targetColumnKey,
      });
      const updatedTask = response.data?.data;
      if (updatedTask && updatedTask._id) {
        setTasks((prev) =>
          prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
        );
        if (selectedTask?._id === updatedTask._id) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (err) {
      // Revert on error
      setTasks(prevTasks);
      if (prevSelectedTask) {
        setSelectedTask(prevSelectedTask);
      }
      setTaskActionError(extractErrorMessage(err));
    } finally {
      setTogglingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task._id);
        return next;
      });
    }
  };

  // --------------------------------------------------------------------------
  // Drag-and-Drop Handlers
  // --------------------------------------------------------------------------
  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    if (!task) return;

    setActiveTask(task);
    dragSnapshotRef.current = {
      tasks: [...tasks],
      selectedTask: selectedTask ? { ...selectedTask } : null,
      sourceColumnKey: task.columnKey,
      sourceOrder: typeof task.order === 'number' && Number.isFinite(task.order) ? task.order : 0,
    };
    setTaskActionError(null);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTaskItem = tasks.find((t) => t._id === activeId);
    if (!activeTaskItem) return;

    // Resolve target columnKey
    let targetColumnKey = null;
    if (typeof overId === 'string' && overId.startsWith('column-')) {
      targetColumnKey = overId.replace('column-', '');
    } else {
      const overTaskItem = tasks.find((t) => t._id === overId);
      if (overTaskItem) {
        targetColumnKey = overTaskItem.columnKey;
      }
    }

    if (!targetColumnKey) return;

    // Continuous state update for cross-column hovering so cards shift smoothly
    if (activeTaskItem.columnKey !== targetColumnKey) {
      setTasks((prevTasks) => {
        const activeIndex = prevTasks.findIndex((t) => t._id === activeId);
        if (activeIndex === -1) return prevTasks;

        const overIndex = prevTasks.findIndex((t) => t._id === overId);
        const tasksInDest = prevTasks.filter(
          (t) => t.columnKey === targetColumnKey && t._id !== activeId
        );

        let newOrderIndex;
        if (overIndex === -1) {
          newOrderIndex = tasksInDest.length;
        } else {
          const isBelowOver =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height;

          newOrderIndex = overIndex >= 0 ? overIndex + (isBelowOver ? 1 : 0) : tasksInDest.length;
        }

        const updated = [...prevTasks];
        const [moved] = updated.splice(activeIndex, 1);
        const updatedMoved = {
          ...moved,
          columnKey: targetColumnKey,
        };

        const insertPos = Math.min(Math.max(0, newOrderIndex), updated.length);
        updated.splice(insertPos, 0, updatedMoved);

        return updated;
      });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const activeId = active?.id;
    const snapshot = dragSnapshotRef.current;
    setActiveTask(null);
    dragSnapshotRef.current = null;

    if (!activeId || !snapshot) return;

    // Dropped outside any droppable target: rollback to pre-drag state
    if (!over) {
      setTasks(snapshot.tasks);
      if (snapshot.selectedTask) setSelectedTask(snapshot.selectedTask);
      return;
    }

    // Resolve destination columnKey
    let targetColumnKey = null;
    if (typeof over.id === 'string' && over.id.startsWith('column-')) {
      targetColumnKey = over.id.replace('column-', '');
    } else {
      const overTaskItem = tasks.find((t) => t._id === over.id);
      if (overTaskItem) {
        targetColumnKey = overTaskItem.columnKey;
      } else {
        targetColumnKey = snapshot.sourceColumnKey;
      }
    }

    const isSameColumn = snapshot.sourceColumnKey === targetColumnKey;

    let finalTasksInDest;
    if (isSameColumn) {
      // Reorder within the same column using the pre-drag snapshot tasks for stable order calculation
      const originalColTasks = snapshot.tasks
        .filter((t) => t.columnKey === targetColumnKey)
        .sort((a, b) => {
          const oA = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : Infinity;
          const oB = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : Infinity;
          return oA - oB;
        });

      const oldIndex = originalColTasks.findIndex((t) => t._id === activeId);
      const overIndex = originalColTasks.findIndex((t) => t._id === over.id);

      if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
        finalTasksInDest = arrayMove(originalColTasks, oldIndex, overIndex);
      } else {
        finalTasksInDest = originalColTasks;
      }
    } else {
      // Cross-column move: ensure active task is present in final destination list
      finalTasksInDest = tasks.filter((t) => t.columnKey === targetColumnKey);
      const alreadyInDest = finalTasksInDest.some((t) => t._id === activeId);
      if (!alreadyInDest) {
        const activeTaskItem =
          tasks.find((t) => t._id === activeId) ||
          snapshot.tasks.find((t) => t._id === activeId);

        if (activeTaskItem) {
          const movedTask = { ...activeTaskItem, columnKey: targetColumnKey };
          const overIndex = finalTasksInDest.findIndex((t) => t._id === over.id);
          if (overIndex !== -1) {
            finalTasksInDest = [
              ...finalTasksInDest.slice(0, overIndex),
              movedTask,
              ...finalTasksInDest.slice(overIndex),
            ];
          } else {
            finalTasksInDest = [...finalTasksInDest, movedTask];
          }
        }
      }
    }

    // Re-index target column tasks with sequential 0-based orders
    const normalizedDest = normalizeColumnTasks(finalTasksInDest, targetColumnKey);
    const targetOrder = Math.max(0, normalizedDest.findIndex((t) => t._id === activeId));

    // Check if position and column are unchanged
    if (isSameColumn && snapshot.sourceOrder === targetOrder) {
      // No-op: restore pre-drag snapshot clean state
      setTasks(snapshot.tasks);
      return;
    }

    // If cross-column, also normalize remaining source column tasks
    let normalizedSource = [];
    if (!isSameColumn) {
      const remainingInSource = tasks.filter(
        (t) => t.columnKey === snapshot.sourceColumnKey && t._id !== activeId
      );
      normalizedSource = normalizeColumnTasks(remainingInSource, snapshot.sourceColumnKey);
    }

    const destMap = new Map(normalizedDest.map((t) => [t._id, t]));
    const srcMap = new Map(normalizedSource.map((t) => [t._id, t]));

    const optimisticTasks = tasks.map((t) => {
      if (destMap.has(t._id)) return destMap.get(t._id);
      if (srcMap.has(t._id)) return srcMap.get(t._id);
      return t;
    });

    // Apply optimistic update immediately
    setTasks(optimisticTasks);

    const updatedActiveTask = destMap.get(activeId);
    if (selectedTask?._id === activeId && updatedActiveTask) {
      setSelectedTask(updatedActiveTask);
    }

    // Prevent duplicate move requests for this task
    if (movingTaskIds.has(activeId)) {
      return;
    }

    setMovingTaskIds((prev) => new Set(prev).add(activeId));

    try {
      const response = await taskApi.moveTask(boardId, activeId, {
        columnKey: targetColumnKey,
        order: targetOrder,
      });

      const serverTask = response.data?.data;
      if (serverTask && serverTask._id) {
        setTasks((prev) =>
          prev.map((t) => (t._id === serverTask._id ? { ...t, ...serverTask } : t))
        );
        if (selectedTask?._id === serverTask._id) {
          setSelectedTask((prev) => ({ ...prev, ...serverTask }));
        }
      }
    } catch (err) {
      // Revert to snapshot on API failure
      setTasks(snapshot.tasks);
      if (snapshot.selectedTask) {
        setSelectedTask(snapshot.selectedTask);
      }
      setTaskActionError(extractErrorMessage(err));
    } finally {
      setMovingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(activeId);
        return next;
      });
    }
  };

  const handleDragCancel = () => {
    const snapshot = dragSnapshotRef.current;
    setActiveTask(null);
    dragSnapshotRef.current = null;
    if (snapshot) {
      setTasks(snapshot.tasks);
      if (snapshot.selectedTask) setSelectedTask(snapshot.selectedTask);
    }
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
          <div className="h-4 w-32 bg-[var(--color-surface-elevated)] rounded animate-pulse" />

          {/* Header Card Skeleton */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 sm:p-7 border border-[var(--color-border)] shadow-xs space-y-4 animate-pulse">
            <div className="h-4 w-28 bg-[var(--color-surface-elevated)] rounded" />
            <div className="h-8 w-72 max-w-full bg-[var(--color-surface-elevated)] rounded-md" />
            <div className="h-4 w-full max-w-md bg-[var(--color-surface-elevated)]/60 rounded" />
            <div className="flex gap-2.5 pt-1.5">
              <div className="h-6 w-24 bg-[var(--color-surface-elevated)] rounded-lg" />
              <div className="h-6 w-32 bg-[var(--color-surface-elevated)] rounded-lg" />
            </div>
          </div>

          {/* Kanban Columns Skeleton */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[var(--color-surface-elevated)] rounded animate-pulse" />
              <div className="h-4 w-28 bg-[var(--color-surface-elevated)] rounded animate-pulse" />
            </div>
            <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto pb-6 pt-1 min-w-0">
              {[1, 2, 3].map((colIndex) => (
                <div
                  key={colIndex}
                  className="w-72 sm:w-80 shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3 sm:p-3.5 min-h-[440px] animate-pulse flex flex-col"
                >
                  <div className="flex items-center gap-2 px-1.5 py-1 mb-2.5 pb-2.5 border-b border-[var(--color-border)]">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-border)] shrink-0" />
                    <div className="h-4 w-24 bg-[var(--color-surface-elevated)] rounded" />
                  </div>
                  <div className="flex-1 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 flex flex-col items-center justify-center" />
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
          className="bg-[var(--color-surface)] rounded-2xl border-2 border-dashed border-[var(--color-border)] p-6 sm:p-12 text-center max-w-lg mx-auto my-6 sm:my-12 space-y-5 text-[var(--color-text)]"
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-warning)]/15 text-[var(--color-warning)] flex items-center justify-center mx-auto border border-[var(--color-warning)]/40 shadow-xs">
            <FolderX className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[var(--color-text)]">Board Not Found</h2>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">
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
          className="bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 rounded-2xl p-6 sm:p-10 text-center max-w-lg mx-auto my-6 sm:my-12 space-y-5 shadow-xs text-[var(--color-text)]"
        >
          <div className="w-12 h-12 rounded-xl bg-[var(--color-danger)]/20 text-[var(--color-danger)] flex items-center justify-center mx-auto border border-[var(--color-danger)]/40 shadow-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-[var(--color-text)]">Failed to load board</h2>
            <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">{error}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto">
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-md px-2.5 py-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Board Header Card */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 sm:p-7 border border-[var(--color-border)] shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-1.5 text-[var(--color-primary-hover)]">
                  <Kanban className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Board Workspace</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight break-words">
                  {board.title}
                </h1>
                {board.description ? (
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed break-words whitespace-pre-line max-w-3xl">
                    {board.description}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)] italic">
                    No description provided for this board.
                  </p>
                )}

                {/* Board Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] rounded-lg font-medium border border-[var(--color-border)]">
                    <Layers className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    <span>{columns.length} {columns.length === 1 ? 'Column' : 'Columns'}</span>
                  </span>

                  {!isLoadingTasks && !taskError && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] rounded-lg font-medium border border-[var(--color-border)]">
                      <CheckSquare className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      <span>{tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}</span>
                    </span>
                  )}

                  {formattedDate && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-2.5 py-1 rounded-lg border border-[var(--color-border)] font-medium">
                      <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      <span>Updated {formattedDate}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Create Task */}
              <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleOpenCreateTask('todo')}
                  className="flex items-center justify-center gap-2 w-full md:w-auto cursor-pointer"
                  aria-label="Create new task"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Task</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Kanban Columns Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Workflow Stages</span>
              </h2>
            </div>

            {/* Task Action Error Banner (completion toggle or update rollback) */}
            {taskActionError && (
              <div
                role="alert"
                className="p-3.5 sm:p-4 bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 rounded-xl flex items-center justify-between text-[var(--color-text)] shadow-xs text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0" />
                  <div>
                    <span className="font-semibold">Task action failed: </span>
                    <span className="text-[var(--color-text-secondary)]">{taskActionError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskActionError(null)}
                  className="text-xs font-semibold text-[var(--color-danger)] hover:underline ml-2 shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Task Fetching Error Banner (preserves loaded board) */}
            {taskError && (
              <div
                role="alert"
                className="p-3.5 sm:p-4 bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/40 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[var(--color-text)] shadow-xs"
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                  <div>
                    <span className="font-semibold">Unable to load tasks: </span>
                    <span className="text-[var(--color-text-secondary)]">{taskError}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTaskRetry}
                  className="inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                  aria-label="Retry loading tasks"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Tasks</span>
                </Button>
              </div>
            )}

            {columns.length === 0 ? (
              <div
                role="region"
                aria-label="No workflow columns"
                className="bg-[var(--color-surface)] rounded-2xl border-2 border-dashed border-[var(--color-border)] p-8 text-center max-w-md mx-auto my-6"
              >
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  No columns configured for this board.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto pb-6 pt-1 focus:outline-none min-w-0">
                  {columns.map((column, index) => (
                    <KanbanColumn
                      key={column.key || column.title || `column-${index}`}
                      column={column}
                      tasks={getTasksForColumn(tasks, column.key)}
                      isLoading={isLoadingTasks}
                      onAddTask={(colKey) => handleOpenCreateTask(colKey)}
                      onTaskDoubleClick={handleOpenTaskDetails}
                      onTaskEditClick={handleOpenTaskDetails}
                      onTaskClick={handleOpenTaskDetails}
                      onUpdateTask={handleUpdateTask}
                      onToggleComplete={handleToggleComplete}
                      togglingTaskIds={togglingTaskIds}
                    />
                  ))}
                </div>

                <DragOverlay dropAnimation={null}>
                  {activeTask ? (
                    <div className="w-72 sm:w-80 pointer-events-none">
                      <TaskCard task={activeTask} isOverlay />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      ) : null}

      {/* Create Task Modal */}
      {isCreateTaskModalOpen && (
        <CreateTaskModal
          key={`${boardId}-${selectedColumnKey}`}
          boardId={boardId}
          columns={columns}
          defaultColumnKey={selectedColumnKey}
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* Task Details Modal */}
      {isTaskDetailsModalOpen && selectedTask && (
        <TaskDetailsModal
          key={selectedTask._id}
          task={selectedTask}
          columns={columns}
          isOpen={isTaskDetailsModalOpen}
          onClose={handleCloseTaskDetails}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
          isTogglingComplete={togglingTaskIds.has(selectedTask._id)}
        />
      )}
    </div>
  );
}

export default BoardPage;
