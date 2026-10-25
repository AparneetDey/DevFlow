import mongoose from "mongoose";
import { Task, TASK_COLUMNS } from "../models/task.model.js";
import { Board } from "../models/board.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Service encapsulating task/card business logic and board-scoped authorization.
 */
class TaskService {
    /**
     * Helper to validate MongoDB ObjectId format.
     *
     * @param {string} id - Candidate ID string
     * @param {string} entityName - Name of the entity for error message
     */
    validateObjectId(id, entityName = "ID") {
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, `Invalid ${entityName} format`);
        }
    }

    /**
     * Verifies that the specified board exists and belongs to the authenticated user.
     * Throws 404 if the board does not exist or is not owned by the user.
     *
     * @param {string} boardId - Board ObjectId
     * @param {string} userId - Authenticated user ID
     * @returns {Promise<Object>} Board document
     */
    async verifyBoardOwnership(boardId, userId) {
        this.validateObjectId(boardId, "board ID");

        if (!userId) {
            throw new ApiError(401, "User is not authenticated");
        }

        const board = await Board.findOne({ _id: boardId, owner: userId });
        if (!board) {
            throw new ApiError(404, "Board not found");
        }

        return board;
    }

    /**
     * Creates a new task under a verified board.
     * Assigns order automatically by appending to the target column.
     *
     * @param {string} boardId - Board ObjectId
     * @param {Object} data - { title, description, columnKey, priority, dueDate }
     * @param {string} userId - Authenticated user ID
     * @returns {Promise<Object>} Created task document
     */
    async createTask(boardId, { title, description, columnKey, priority, dueDate }, userId) {
        await this.verifyBoardOwnership(boardId, userId);

        const targetColumnKey = columnKey || "todo";
        if (!TASK_COLUMNS.includes(targetColumnKey)) {
            throw new ApiError(400, "Column key must be one of: todo, in-progress, done");
        }

        // Determine next order in the destination column
        const lastTask = await Task.findOne({ boardId, columnKey: targetColumnKey })
            .sort({ order: -1 })
            .select("order");
        const nextOrder = lastTask ? lastTask.order + 1 : 0;

        const task = await Task.create({
            title: title.trim(),
            description: description !== undefined ? description.trim() : "",
            boardId,
            columnKey: targetColumnKey,
            order: nextOrder,
            priority: priority || "medium",
            dueDate: dueDate ? new Date(dueDate) : null
        });

        return task;
    }

    /**
     * Retrieves all tasks belonging to a board, optionally filtered by columnKey.
     * Tasks are sorted by columnKey and ascending order.
     *
     * @param {string} boardId - Board ObjectId
     * @param {Object} filters - { columnKey }
     * @param {string} userId - Authenticated user ID
     * @returns {Promise<Array>} List of tasks
     */
    async getBoardTasks(boardId, { columnKey }, userId) {
        await this.verifyBoardOwnership(boardId, userId);

        const filter = { boardId };
        if (columnKey) {
            if (!TASK_COLUMNS.includes(columnKey)) {
                throw new ApiError(400, "Column key must be one of: todo, in-progress, done");
            }
            filter.columnKey = columnKey;
        }

        const tasks = await Task.find(filter).sort({ columnKey: 1, order: 1 });
        return tasks;
    }

    /**
     * Retrieves a single task by ID verifying board ownership and task association.
     *
     * @param {string} boardId - Board ObjectId
     * @param {string} taskId - Task ObjectId
     * @param {string} userId - Authenticated user ID
     * @returns {Promise<Object>} Task document
     */
    async getTaskById(boardId, taskId, userId) {
        await this.verifyBoardOwnership(boardId, userId);
        this.validateObjectId(taskId, "task ID");

        const task = await Task.findOne({ _id: taskId, boardId });
        if (!task) {
            throw new ApiError(404, "Task not found");
        }

        return task;
    }

    /**
     * Updates editable fields of a task (title, description, priority, dueDate).
     * Disallows changing boardId, columnKey, or order.
     *
     * @param {string} boardId - Board ObjectId
     * @param {string} taskId - Task ObjectId
     * @param {Object} updateData - { title, description, priority, dueDate }
     * @param {string} userId - Authenticated user ID
     * @returns {Promise<Object>} Updated task document
     */
    async updateTask(boardId, taskId, { title, description, priority, dueDate }, userId) {
        await this.verifyBoardOwnership(boardId, userId);
        this.validateObjectId(taskId, "task ID");

        const task = await Task.findOne({ _id: taskId, boardId });
        if (!task) {
            throw new ApiError(404, "Task not found");
        }

        const allowedUpdates = {};
        if (title !== undefined) allowedUpdates.title = title.trim();
        if (description !== undefined) allowedUpdates.description = description.trim();
        if (priority !== undefined) allowedUpdates.priority = priority;
        if (dueDate !== undefined) allowedUpdates.dueDate = dueDate ? new Date(dueDate) : null;

        if (Object.keys(allowedUpdates).length === 0) {
            throw new ApiError(400, "At least one valid field (title, description, priority, or dueDate) must be provided for update");
        }

        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, boardId },
            { $set: allowedUpdates },
            { returnDocument: "after", runValidators: true }
        );

        return updatedTask;
    }

    /**
     * Moves a task to a target column and/or updates its numeric order position.
     * If order is omitted, appends the task to the destination column.
     * Normalizes ordering in affected columns.
     *
     * @param {string} boardId - Board ObjectId
     * @param {string} taskId - Task ObjectId
     * @param {Object} moveData - { columnKey, order }
     * @param {string} userId - Authenticated user ID
     * @returns {Promise<Object>} Updated task document
     */
    async moveTask(boardId, taskId, { columnKey: targetColumnKey, order: targetOrder }, userId) {
        await this.verifyBoardOwnership(boardId, userId);
        this.validateObjectId(taskId, "task ID");

        if (!TASK_COLUMNS.includes(targetColumnKey)) {
            throw new ApiError(400, "Column key must be one of: todo, in-progress, done");
        }

        const task = await Task.findOne({ _id: taskId, boardId });
        if (!task) {
            throw new ApiError(404, "Task not found");
        }

        const sourceColumnKey = task.columnKey;
        const isColumnChange = sourceColumnKey !== targetColumnKey;

        if (targetOrder === undefined || targetOrder === null) {
            // Case A: Append to destination column
            const lastTask = await Task.findOne({
                boardId,
                columnKey: targetColumnKey,
                _id: { $ne: task._id }
            })
                .sort({ order: -1 })
                .select("order");
            const newOrder = lastTask ? lastTask.order + 1 : 0;

            task.columnKey = targetColumnKey;
            task.order = newOrder;
            await task.save();

            // Normalize source column if task moved to another column
            if (isColumnChange) {
                await this.normalizeColumnOrders(boardId, sourceColumnKey);
            }

            return task;
        }

        // Case B: Move to a specific target order position in destination column
        const otherTasks = await Task.find({
            boardId,
            columnKey: targetColumnKey,
            _id: { $ne: task._id }
        }).sort({ order: 1 });

        const clampedIndex = Math.min(Math.max(0, targetOrder), otherTasks.length);
        otherTasks.splice(clampedIndex, 0, task);

        // Update orders of all tasks in destination column
        const bulkOps = otherTasks.map((t, idx) => ({
            updateOne: {
                filter: { _id: t._id },
                update: { $set: { columnKey: targetColumnKey, order: idx } }
            }
        }));
        await Task.bulkWrite(bulkOps);

        task.columnKey = targetColumnKey;
        task.order = clampedIndex;

        // Normalize source column if task moved to another column
        if (isColumnChange) {
            await this.normalizeColumnOrders(boardId, sourceColumnKey);
        }

        return task;
    }

    /**
     * Normalizes the numeric order positions of tasks within a specific column of a board.
     * Ensures contiguous ordering (0, 1, 2, ...).
     *
     * @param {string} boardId - Board ObjectId
     * @param {string} columnKey - Column identifier
     */
    async normalizeColumnOrders(boardId, columnKey) {
        const remainingTasks = await Task.find({ boardId, columnKey }).sort({ order: 1 });
        if (remainingTasks.length > 0) {
            const bulkOps = remainingTasks.map((t, idx) => ({
                updateOne: {
                    filter: { _id: t._id },
                    update: { $set: { order: idx } }
                }
            }));
            await Task.bulkWrite(bulkOps);
        }
    }

    /**
     * Deletes a task from a board and normalizes the remaining tasks in that column.
     *
     * @param {string} boardId - Board ObjectId
     * @param {string} taskId - Task ObjectId
     * @param {string} userId - Authenticated user ID
     * @returns {Promise<Object>} Deletion confirmation message
     */
    async deleteTask(boardId, taskId, userId) {
        await this.verifyBoardOwnership(boardId, userId);
        this.validateObjectId(taskId, "task ID");

        const task = await Task.findOneAndDelete({ _id: taskId, boardId });
        if (!task) {
            throw new ApiError(404, "Task not found");
        }

        // Re-normalize remaining tasks in the column
        await this.normalizeColumnOrders(boardId, task.columnKey);

        return { message: "Task deleted successfully" };
    }
}

export const taskService = new TaskService();
