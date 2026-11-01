import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
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
  pointerWithin,
  rectIntersection,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from '@dnd-kit/sortable';
import { Button } from '../components/common/Button.jsx';
import KanbanColumn from '../components/boards/KanbanColumn.jsx';
import AddColumnModal from '../components/boards/AddColumnModal.jsx';
import DeleteColumnModal from '../components/boards/DeleteColumnModal.jsx';
import TaskCard from '../components/tasks/TaskCard.jsx';
import CreateTaskModal from '../components/tasks/CreateTaskModal.jsx';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal.jsx';
import boardApi from '../api/board.api.js';
import taskApi from '../api/task.api.js';
import { sortBoardColumns } from '../utils/columnSorting.js';
import { getTasksForColumn } from '../utils/taskGrouping.js';
import { extractErrorMessage } from '../api/error.js';
import {
  normalizeColumnTasks,
  findColumnKey,
  calculateTaskDropPosition,
  moveTaskCrossColumn,
} from '../utils/taskReordering.js';

/**
 * Stable collision detection strategy optimized for DevFlow Kanban board.
 * Prioritizes direct pointer collision (pointerWithin) for stable, jitter-free targeting.
 * - When pointer is over a task card, returns that task card.
 * - When pointer is over column space, returns that column.
 * - When pointer is in a gutter between columns, falls back to rectIntersection / closestCorners.
 */
function kanbanCollisionDetection(args) {
  // 1. Direct pointer collision is primary
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // 2. Bounding box intersection when pointer is in gaps
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) {
    return rectCollisions;
  }

  // 3. Distance-based fallback
  return closestCorners(args);
}

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
  const [overColumnKey, setOverColumnKey] = useState(null);
  const [movingTaskIds, setMovingTaskIds] = useState(new Set());
  const dragSnapshotRef = useRef(null);
  const overColumnKeyRef = useRef(null);

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

  // Column creation modal state (Task 10)
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);

  // Column deletion modal state (Task 12)
  const [columnToDelete, setColumnToDelete] = useState(null);

  // Column reordering drag state (Task 12)
  const [activeColumnKey, setActiveColumnKey] = useState(null);

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

  const handleColumnAdded = (updatedBoard) => {
    if (!updatedBoard) return;
    if (Array.isArray(updatedBoard.columns)) {
      setBoard(updatedBoard);
    } else if (board) {
      setBoard((prev) => ({
        ...prev,
        columns: [...(prev?.columns || []), updatedBoard],
      }));
    }
  };

  const handleRenameColumn = async (columnKey, newName) => {
    if (!columnKey || !newName || !boardId) return;

    const prevBoard = board;
    // Optimistic UI update: rename column in board columns array
    setBoard((prev) => {
      if (!prev || !Array.isArray(prev.columns)) return prev;
      return {
        ...prev,
        columns: prev.columns.map((c) =>
          c.key === columnKey ? { ...c, name: newName, title: newName } : c
        ),
      };
    });

    try {
      const response = await boardApi.renameColumn(boardId, columnKey, {
        name: newName,
      });
      const updatedBoard = response.data?.data;
      if (updatedBoard && Array.isArray(updatedBoard.columns)) {
        setBoard(updatedBoard);
      }
    } catch (err) {
      // Revert on error
      setBoard(prevBoard);
      setTaskActionError(extractErrorMessage(err));
      throw err;
    }
  };

  const handleOpenDeleteColumn = (column) => {
    setColumnToDelete(column);
  };

  const handleCloseDeleteColumn = () => {
    setColumnToDelete(null);
  };

  const handleColumnDeleted = (updatedBoard, deletedColumnKey, payload) => {
    if (updatedBoard && Array.isArray(updatedBoard.columns)) {
      setBoard(updatedBoard);
    } else {
      setBoard((prev) => ({
        ...prev,
        columns: (prev?.columns || []).filter((c) => c.key !== deletedColumnKey),
      }));
    }

    if (payload?.action === 'move' && payload?.targetColumnKey) {
      setTasks((prev) =>
        prev.map((t) =>
          t.columnKey === deletedColumnKey
            ? { ...t, columnKey: payload.targetColumnKey }
            : t
        )
      );
      if (selectedTask?.columnKey === deletedColumnKey) {
        setSelectedTask((prev) =>
          prev ? { ...prev, columnKey: payload.targetColumnKey } : null
        );
      }
      // Re-fetch tasks in background to ensure strict server-synchronized order indices
      taskApi.getTasksByBoard(boardId).then((res) => {
        if (Array.isArray(res.data?.data)) {
          setTasks(res.data.data);
        }
      }).catch(() => {});
    } else {
      // payload.action === 'delete'
      setTasks((prev) => prev.filter((t) => t.columnKey !== deletedColumnKey));
      if (selectedTask?.columnKey === deletedColumnKey) {
        setSelectedTask(null);
        setIsTaskDetailsModalOpen(false);
      }
    }
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

  const handleMoveTaskColumn = async (taskId, targetColumnKey) => {
    if (!taskId || !boardId || !targetColumnKey) return;

    const targetColTasks = getTasksForColumn(tasks, targetColumnKey);
    const targetOrder = targetColTasks.length;

    const prevTasks = tasks;
    const prevSelectedTask = selectedTask;
    const optimisticTask = selectedTask?._id === taskId
      ? { ...selectedTask, columnKey: targetColumnKey, order: targetOrder }
      : { columnKey: targetColumnKey, order: targetOrder };

    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, columnKey: targetColumnKey, order: targetOrder } : t))
    );
    if (selectedTask?._id === taskId) {
      setSelectedTask(optimisticTask);
    }

    try {
      const response = await taskApi.moveTask(boardId, taskId, {
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
      return serverTask;
    } catch (err) {
      setTasks(prevTasks);
      if (prevSelectedTask) {
        setSelectedTask(prevSelectedTask);
      }
      setTaskActionError(extractErrorMessage(err));
      throw err;
    }
  };

  const handleUpdateTask = async (taskId, updateData) => {
    // If updateData contains columnKey, route column move to taskApi.moveTask
    if (updateData?.columnKey) {
      const { columnKey, ...restUpdates } = updateData;
      let updatedTask = null;
      if (Object.keys(restUpdates).length > 0) {
        const res = await taskApi.updateTask(boardId, taskId, restUpdates);
        updatedTask = res.data?.data;
      }
      const moveRes = await handleMoveTaskColumn(taskId, columnKey);
      return moveRes || updatedTask;
    }

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
    const nextCompleted = !task.isCompleted;

    setTogglingTaskIds((prev) => new Set(prev).add(task._id));
    setTaskActionError(null);

    const prevTasks = tasks;
    const prevSelectedTask = selectedTask;
    const optimisticTask = { ...task, isCompleted: nextCompleted };

    // Optimistic UI update: completed tasks stay in their current column and order
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? optimisticTask : t))
    );
    if (selectedTask?._id === task._id) {
      setSelectedTask(optimisticTask);
    }

    try {
      const response = await taskApi.updateTask(boardId, task._id, {
        isCompleted: nextCompleted,
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
    const activeData = active.data.current;

    // Handle column reordering drag initiation
    if (activeData?.type === 'column') {
      setActiveColumnKey(activeData.columnKey);
      setActiveTask(null);
      return;
    }

    const task = tasks.find((t) => t._id === active.id);
    if (!task) return;

    setActiveTask(task);
    setOverColumnKey(task.columnKey);
    overColumnKeyRef.current = task.columnKey;
    dragSnapshotRef.current = {
      tasks: [...tasks],
      selectedTask: selectedTask ? { ...selectedTask } : null,
      sourceColumnKey: task.columnKey,
      sourceOrder: typeof task.order === 'number' && Number.isFinite(task.order) ? task.order : 0,
    };
    setTaskActionError(null);
  };

  const handleDragOver = (event) => {
    // If dragging a column, no task drag-over resolution needed
    if (activeColumnKey) {
      return;
    }

    const { over } = event;
    if (!over) {
      if (overColumnKeyRef.current !== null) {
        overColumnKeyRef.current = null;
        setOverColumnKey(null);
      }
      return;
    }

    const overId = over.id;
    // Resolve target columnKey from overId using available columns and snapshot/current tasks
    const targetColumnKey = findColumnKey(
      overId,
      dragSnapshotRef.current?.tasks || tasks,
      columns
    );

    if (targetColumnKey && targetColumnKey !== overColumnKeyRef.current) {
      overColumnKeyRef.current = targetColumnKey;
      setOverColumnKey(targetColumnKey);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    // Handle Column Drop & Reordering
    if (activeColumnKey) {
      const activeColKey = activeColumnKey;
      setActiveColumnKey(null);

      if (!over) return;

      let overColKey = null;
      const overData = over.data.current;
      if (overData?.type === 'column') {
        overColKey = overData.columnKey;
      } else if (typeof over.id === 'string' && over.id.startsWith('sortable-col-')) {
        overColKey = over.id.replace('sortable-col-', '');
      } else if (typeof over.id === 'string' && over.id.startsWith('column-')) {
        overColKey = over.id.replace('column-', '');
      } else {
        const overTask = tasks.find((t) => t._id === over.id);
        if (overTask?.columnKey) {
          overColKey = overTask.columnKey;
        }
      }

      if (!overColKey || overColKey === activeColKey) {
        // Dropped in original position: no-op, 0 API calls!
        return;
      }

      const oldIndex = columns.findIndex((c) => c.key === activeColKey);
      const newIndex = columns.findIndex((c) => c.key === overColKey);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return;
      }

      const reordered = arrayMove(columns, oldIndex, newIndex);
      const newColumnKeys = reordered.map((c) => c.key);
      const previousBoard = board;

      // Optimistic UI update
      setBoard((prev) => ({
        ...prev,
        columns: reordered.map((col, idx) => ({ ...col, order: idx })),
      }));

      try {
        const response = await boardApi.reorderColumns(boardId, {
          columnKeys: newColumnKeys,
        });
        const updatedBoard = response.data?.data;
        if (updatedBoard && Array.isArray(updatedBoard.columns)) {
          setBoard(updatedBoard);
        }
      } catch (err) {
        // Revert on error
        setBoard(previousBoard);
        setTaskActionError(extractErrorMessage(err));
      }
      return;
    }

    const activeId = active?.id;
    const snapshot = dragSnapshotRef.current;

    setActiveTask(null);
    setOverColumnKey(null);
    overColumnKeyRef.current = null;
    dragSnapshotRef.current = null;

    if (!activeId || !snapshot) return;

    // 1. Dropped outside any droppable target: restore pristine snapshot
    if (!over) {
      setTasks(snapshot.tasks);
      if (snapshot.selectedTask) setSelectedTask(snapshot.selectedTask);
      return;
    }

    const overId = over.id;

    // 2. Resolve destination columnKey
    const targetColumnKey = findColumnKey(overId, snapshot.tasks, columns);
    if (!targetColumnKey) {
      setTasks(snapshot.tasks);
      if (snapshot.selectedTask) setSelectedTask(snapshot.selectedTask);
      return;
    }

    const isSameColumn = snapshot.sourceColumnKey === targetColumnKey;

    let targetOrder;
    let finalOptimisticTasks;

    if (isSameColumn) {
      // Reordering within the same column
      const colTasks = snapshot.tasks
        .filter((t) => t.columnKey === targetColumnKey)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const oldIndex = colTasks.findIndex((t) => t._id === activeId);
      let overIndex = colTasks.findIndex((t) => t._id === overId);

      if (overIndex === -1 && typeof overId === 'string' && overId.startsWith('column-')) {
        overIndex = colTasks.length - 1;
      }

      // Check if position actually changed
      if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) {
        // No-op: restore pre-drag snapshot cleanly with 0 API calls
        setTasks(snapshot.tasks);
        if (snapshot.selectedTask) setSelectedTask(snapshot.selectedTask);
        return;
      }

      const reordered = arrayMove(colTasks, oldIndex, overIndex);
      const normalizedCol = normalizeColumnTasks(reordered, targetColumnKey);
      targetOrder = normalizedCol.findIndex((t) => t._id === activeId);

      const colMap = new Map(normalizedCol.map((t) => [t._id, t]));
      finalOptimisticTasks = snapshot.tasks.map((t) => (colMap.has(t._id) ? colMap.get(t._id) : t));
    } else {
      // Cross-column movement
      const destTasks = snapshot.tasks
        .filter((t) => t.columnKey === targetColumnKey)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const insertPos = calculateTaskDropPosition(
        destTasks,
        overId,
        over.rect,
        active.rect?.current?.translated
      );

      const result = moveTaskCrossColumn(
        snapshot.tasks,
        activeId,
        targetColumnKey,
        insertPos
      );

      finalOptimisticTasks = result.tasks;
      targetOrder = result.targetOrder;
    }

    // Apply optimistic update immediately
    setTasks(finalOptimisticTasks);

    const updatedActiveTask = finalOptimisticTasks.find((t) => t._id === activeId);
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
    if (activeColumnKey) {
      setActiveColumnKey(null);
      return;
    }
    const snapshot = dragSnapshotRef.current;
    setActiveTask(null);
    setOverColumnKey(null);
    overColumnKeyRef.current = null;
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
            <div className="flex items-start gap-3 sm:gap-3.5 overflow-x-auto pb-4 pt-1 min-w-0 board-canvas-scrollbar">
              {[1, 2, 3, 4, 5].map((colIndex) => (
                <div
                  key={colIndex}
                  className="w-[235px] sm:w-[240px] shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2.5 sm:p-3 h-48 animate-pulse flex flex-col"
                >
                  <div className="flex items-center gap-2 px-1 py-0.5 mb-2 pb-2 border-b border-[var(--color-border)]">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-border)] shrink-0" />
                    <div className="h-4 w-20 bg-[var(--color-surface-elevated)] rounded" />
                  </div>
                  <div className="flex-1 rounded-lg border border-dashed border-[var(--color-border)]/60 bg-[var(--color-bg-secondary)]/40 p-3 flex flex-col items-center justify-center" />
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
        <div className="space-y-3 sm:space-y-4">
          {/* Sleek Board Toolbar */}
          <div className="bg-[var(--color-surface)] rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
            {/* Left: Back Link & Title & Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-md px-2 py-1 shrink-0 -ml-1 self-start sm:self-auto"
                title="Back to Dashboard"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Boards</span>
              </Link>

              <div className="h-4 w-px bg-[var(--color-border)] hidden sm:block shrink-0" />

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight truncate max-w-md sm:max-w-xl" title={board.title}>
                    {board.title}
                  </h1>

                  {/* Metadata Pills */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] rounded-md font-medium border border-[var(--color-border)]">
                      <Layers className="w-3 h-3 text-[var(--color-text-muted)]" />
                      <span>{columns.length}</span>
                    </span>

                    {!isLoadingTasks && !taskError && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] rounded-md font-medium border border-[var(--color-border)]">
                        <CheckSquare className="w-3 h-3 text-[var(--color-text-muted)]" />
                        <span>{tasks.length}</span>
                      </span>
                    )}

                    {formattedDate && (
                      <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-2 py-0.5 rounded-md border border-[var(--color-border)] font-medium">
                        <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                        <span>{formattedDate}</span>
                      </span>
                    )}
                  </div>
                </div>

                {board.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] truncate max-w-lg mt-0.5">
                    {board.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Quick Action Buttons: Add Column (Max 5) */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              {columns.length >= 5 && (
                <span
                  className="text-[11px] text-[var(--color-text-muted)] font-medium hidden sm:inline"
                  title="Maximum limit of 5 columns reached for this board"
                >
                  (5/5 columns max)
                </span>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddColumnModalOpen(true)}
                disabled={columns.length >= 5}
                className="flex items-center justify-center gap-1.5 cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={columns.length >= 5 ? 'Maximum of 5 columns reached' : 'Add new column'}
                title={columns.length >= 5 ? 'Maximum of 5 columns reached' : 'Add new column'}
              >
                <Plus className="w-4 h-4" />
                <span>Add Column</span>
              </Button>
            </div>
          </div>

          {/* Kanban Columns Section */}
          <div className="space-y-3">

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
                className="bg-[var(--color-surface)] rounded-2xl border-2 border-dashed border-[var(--color-border)] p-8 sm:p-10 text-center max-w-md mx-auto my-6 space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] flex items-center justify-center mx-auto border border-[var(--color-border)]">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-[var(--color-text)]">No columns on this board</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto">
                    Get started by adding your first workflow column to organize your tasks.
                  </p>
                </div>
                <div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddColumnModalOpen(true)}
                    className="inline-flex items-center gap-1.5 cursor-pointer text-xs"
                    aria-label="Add first column"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Column</span>
                  </Button>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={kanbanCollisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={columns.map((c) => `sortable-col-${c.key}`)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex items-start gap-3 sm:gap-3.5 overflow-x-auto pb-4 pt-1 focus:outline-none min-w-0 touch-pan-x touch-pan-y board-canvas-scrollbar">
                    {columns.map((column, index) => (
                      <KanbanColumn
                        key={column.key || column.name || column.title || `column-${index}`}
                        column={column}
                        tasks={getTasksForColumn(tasks, column.key)}
                        isLoading={isLoadingTasks}
                        isDropTarget={
                          Boolean(activeTask && overColumnKey === column.key && activeTask.columnKey !== column.key)
                        }
                        onAddTask={(colKey) => handleOpenCreateTask(colKey)}
                        onRenameColumn={handleRenameColumn}
                        onDeleteColumn={handleOpenDeleteColumn}
                        onTaskDoubleClick={handleOpenTaskDetails}
                        onTaskEditClick={handleOpenTaskDetails}
                        onTaskClick={handleOpenTaskDetails}
                        onUpdateTask={handleUpdateTask}
                        onToggleComplete={handleToggleComplete}
                        togglingTaskIds={togglingTaskIds}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {activeColumnKey ? (
                    (() => {
                      const col = columns.find((c) => c.key === activeColumnKey);
                      if (!col) return null;
                      return (
                        <div className="w-[255px] sm:w-[278px] pointer-events-none opacity-90 shadow-2xl rotate-1">
                          <KanbanColumn
                            column={col}
                            tasks={getTasksForColumn(tasks, col.key)}
                            isLoading={false}
                            isDropTarget={false}
                            onAddTask={() => {}}
                            onRenameColumn={() => {}}
                            onDeleteColumn={() => {}}
                            onTaskDoubleClick={() => {}}
                            onTaskEditClick={() => {}}
                            onTaskClick={() => {}}
                            onUpdateTask={() => {}}
                            onToggleComplete={() => {}}
                            togglingTaskIds={new Set()}
                          />
                        </div>
                      );
                    })()
                  ) : activeTask ? (
                    <div className="w-[235px] sm:w-[240px] pointer-events-none">
                      <TaskCard task={activeTask} isOverlay />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      ) : null}

      {/* Add Column Modal (Task 10) */}
      {isAddColumnModalOpen && (
        <AddColumnModal
          boardId={boardId}
          isOpen={isAddColumnModalOpen}
          onClose={() => setIsAddColumnModalOpen(false)}
          onColumnAdded={handleColumnAdded}
        />
      )}

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
          onMoveTask={handleMoveTaskColumn}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={handleToggleComplete}
          isTogglingComplete={togglingTaskIds.has(selectedTask._id)}
        />
      )}

      {/* Delete Column Modal (Task 12) */}
      {columnToDelete && (
        <DeleteColumnModal
          key={columnToDelete.key}
          boardId={boardId}
          column={columnToDelete}
          columns={columns}
          tasks={tasks}
          isOpen={Boolean(columnToDelete)}
          onClose={handleCloseDeleteColumn}
          onDeleted={handleColumnDeleted}
        />
      )}
    </div>
  );
}

export default BoardPage;
