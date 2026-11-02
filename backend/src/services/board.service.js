import mongoose from "mongoose";
import { Board, DEFAULT_COLUMNS } from "../models/board.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Service encapsulating board business logic.
 */
class BoardService {
    /**
     * Validates that an ID is a valid MongoDB ObjectId format.
     * Throws 400 ApiError if invalid.
     *
     * @param {string} id - Candidate ObjectId string
     */
    validateObjectId(id) {
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "Invalid board ID format");
        }
    }

    /**
     * Creates a new board owned by the authenticated user with default columns.
     * Never accepts owner ID or columns from client input.
     *
     * @param {Object} data - { title, description }
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Object>} Created board document
     */
    async createBoard({ title, description }, userId) {
        if (!userId) {
            throw new ApiError(401, "User is not authenticated");
        }

        const board = await Board.create({
            title: title.trim(),
            description: description !== undefined ? description.trim() : "",
            owner: userId,
            columns: DEFAULT_COLUMNS.map((col) => ({ ...col }))
        });

        return board;
    }

    /**
     * Ensures that a board has its columns persisted to MongoDB.
     * If a legacy board in MongoDB lacks columns, has an empty array, or has unmigrated column fields,
     * it is idempotently saved with normalized default columns.
     *
     * @param {Object} board - Mongoose Board document
     * @returns {Promise<Object>} Persisted Board document
     */
    async ensureBoardColumnsPersisted(board) {
        if (!board) return board;

        if (board.isModified("columns")) {
            await board.save();
        }

        return board;
    }

    /**
     * Retrieves all boards owned by the authenticated user, sorted by most recently updated.
     * Idempotently persists columns for any legacy boards encountered.
     *
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Array>} List of boards
     */
    async getUserBoards(userId) {
        if (!userId) {
            throw new ApiError(401, "User is not authenticated");
        }

        const boards = await Board.find({ owner: userId }).sort({ updatedAt: -1 });
        for (const board of boards) {
            await this.ensureBoardColumnsPersisted(board);
        }
        return boards;
    }

    /**
     * Retrieves a single board by ID owned by the authenticated user.
     * Returns 404 if the board does not exist or is not owned by the user.
     * Idempotently persists columns for legacy boards.
     *
     * @param {string} boardId - Board ObjectId string
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Object>} Board document
     */
    async getBoardById(boardId, userId) {
        this.validateObjectId(boardId);

        const board = await Board.findOne({ _id: boardId, owner: userId });
        if (!board) {
            throw new ApiError(404, "Board not found");
        }

        await this.ensureBoardColumnsPersisted(board);
        return board;
    }

    /**
     * Updates title and/or description of a board owned by the authenticated user.
     * Ensures owner and columns cannot be modified.
     *
     * @param {string} boardId - Board ObjectId string
     * @param {Object} data - { title, description }
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Object>} Updated board document
     */
    async updateBoard(boardId, { title, description }, userId) {
        this.validateObjectId(boardId);

        const allowedUpdates = {};
        if (title !== undefined) allowedUpdates.title = title.trim();
        if (description !== undefined) allowedUpdates.description = description.trim();

        if (Object.keys(allowedUpdates).length === 0) {
            throw new ApiError(400, "At least one valid field (title or description) must be provided for update");
        }

        const updatedBoard = await Board.findOneAndUpdate(
            { _id: boardId, owner: userId },
            { $set: allowedUpdates },
            { returnDocument: "after", runValidators: true }
        );

        if (!updatedBoard) {
            throw new ApiError(404, "Board not found");
        }

        return updatedBoard;
    }

    /**
     * Generates a unique, stable, slug-friendly column key within a board.
     *
     * @param {string} name - Column name
     * @param {Array<Object>} existingColumns - Board's existing columns
     * @returns {string} Unique column key
     */
    generateColumnKey(name, existingColumns = []) {
        let baseKey = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        if (!baseKey) {
            baseKey = "col";
        }

        const existingKeys = new Set(existingColumns.map((c) => c.key));
        if (!existingKeys.has(baseKey)) {
            return baseKey;
        }

        let counter = 1;
        while (existingKeys.has(`${baseKey}-${counter}`)) {
            counter++;
        }
        return `${baseKey}-${counter}`;
    }

    /**
     * Adds a new column to a board, enforcing a maximum limit of 5 columns.
     * Generates a stable unique key and assigns the next available sequential order.
     * Uses atomic array length checking and optimistic concurrency retry to prevent race conditions.
     *
     * @param {string} boardId - Board ObjectId string
     * @param {Object} data - { name }
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @param {number} [maxRetries=3] - Maximum retry attempts on concurrent collision
     * @returns {Promise<Object>} Updated board document
     */
    async addColumn(boardId, { name }, userId, maxRetries = 3) {
        this.validateObjectId(boardId);

        if (!userId) {
            throw new ApiError(401, "User is not authenticated");
        }

        const trimmedName = typeof name === "string" ? name.trim() : "";
        if (!trimmedName) {
            throw new ApiError(400, "Column name cannot be empty");
        }

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const board = await Board.findOne({ _id: boardId, owner: userId });
            if (!board) {
                throw new ApiError(404, "Board not found");
            }

            // Ensure columns are persisted if legacy board
            await this.ensureBoardColumnsPersisted(board);

            const currentColumns = board.columns || [];
            if (currentColumns.length >= 5) {
                throw new ApiError(400, "Board cannot have more than 5 columns");
            }

            const key = this.generateColumnKey(trimmedName, currentColumns);
            const maxOrder = currentColumns.reduce(
                (max, col) => (typeof col.order === "number" && col.order > max ? col.order : max),
                -1
            );
            const nextOrder = maxOrder + 1;

            const newColumn = {
                name: trimmedName,
                title: trimmedName,
                key,
                order: nextOrder
            };

            // Atomic update matching exact current length AND 5-column cap guard
            const updatedBoard = await Board.findOneAndUpdate(
                {
                    _id: boardId,
                    owner: userId,
                    columns: { $size: currentColumns.length },
                    "columns.4": { $exists: false }
                },
                {
                    $push: { columns: newColumn }
                },
                { returnDocument: "after", runValidators: true }
            );

            if (updatedBoard) {
                return updatedBoard;
            }

            // Check if failure was due to board deletion or reaching 5 columns
            const currentCheck = await Board.findOne({ _id: boardId, owner: userId });
            if (!currentCheck) {
                throw new ApiError(404, "Board not found");
            }
            if (currentCheck.columns && currentCheck.columns.length >= 5) {
                throw new ApiError(400, "Board cannot have more than 5 columns");
            }
            // Another concurrent request changed the columns array size; retry
        }

        throw new ApiError(409, "Failed to add column due to concurrent modifications. Please retry.");
    }

    /**
     * Renames an existing column on a board without changing its key, order, or associated tasks.
     *
     * @param {string} boardId - Board ObjectId string
     * @param {string} columnKey - Unique column key identifier
     * @param {Object} data - { name }
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Object>} Updated board document
     */
    async renameColumn(boardId, columnKey, { name }, userId) {
        this.validateObjectId(boardId);

        if (!userId) {
            throw new ApiError(401, "User is not authenticated");
        }

        const trimmedName = typeof name === "string" ? name.trim() : "";
        if (!trimmedName) {
            throw new ApiError(400, "Column name cannot be empty");
        }

        const board = await Board.findOne({ _id: boardId, owner: userId });
        if (!board) {
            throw new ApiError(404, "Board not found");
        }

        await this.ensureBoardColumnsPersisted(board);

        const currentColumns = board.columns || [];

        const targetColumn = currentColumns.find((c) => c.key === columnKey);
        if (!targetColumn) {
            throw new ApiError(404, "Column not found");
        }

        targetColumn.name = trimmedName;
        targetColumn.title = trimmedName;

        await board.save();
        return board;
    }

    /**
     * Deletes a column from a board.
     * Supports action="move" (moves tasks to targetColumnKey and normalizes destination order)
     * and action="delete" (permanently deletes all tasks belonging to columnKey).
     * Normalizes remaining column orders.
     * Operates atomically within a MongoDB session/transaction.
     *
     * @param {string} boardId - Board ObjectId string
     * @param {string} columnKey - Column key to delete
     * @param {Object} options - { action: "move"|"delete", targetColumnKey }
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Object>} Updated board document
     */
    async deleteColumn(boardId, columnKey, { action, targetColumnKey }, userId) {
        this.validateObjectId(boardId);

        if (!userId) {
            throw new ApiError(401, "User is not authenticated");
        }

        const board = await Board.findOne({ _id: boardId, owner: userId });
        if (!board) {
            throw new ApiError(404, "Board not found");
        }

        await this.ensureBoardColumnsPersisted(board);

        const currentColumns = board.columns || [];
        const sourceColumn = currentColumns.find((c) => c.key === columnKey);
        if (!sourceColumn) {
            throw new ApiError(404, "Column not found");
        }

        if (action === "move") {
            if (!targetColumnKey) {
                throw new ApiError(400, "targetColumnKey is required when action is 'move'");
            }
            if (targetColumnKey === columnKey) {
                throw new ApiError(400, "Cannot move tasks to the column being deleted");
            }
            const targetColumn = currentColumns.find((c) => c.key === targetColumnKey);
            if (!targetColumn) {
                throw new ApiError(400, `Target column '${targetColumnKey}' does not exist on this board`);
            }
        } else if (action !== "delete") {
            throw new ApiError(400, "Action must be either 'move' or 'delete'");
        }

        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            if (action === "move") {
                // Find all tasks in source column, sorted by their existing order
                const sourceTasks = await Task.find({ boardId, columnKey })
                    .sort({ order: 1 })
                    .session(session);

                if (sourceTasks.length > 0) {
                    // Find max order in target column to append after existing tasks
                    const lastTargetTask = await Task.findOne({ boardId, columnKey: targetColumnKey })
                        .sort({ order: -1 })
                        .session(session);

                    const baseOrder = lastTargetTask ? lastTargetTask.order + 1 : 0;

                    for (let i = 0; i < sourceTasks.length; i++) {
                        await Task.updateOne(
                            { _id: sourceTasks[i]._id },
                            { $set: { columnKey: targetColumnKey, order: baseOrder + i } },
                            { session }
                        );
                    }

                    // Strictly normalize destination column tasks to sequential 0-based orders
                    const allTargetTasks = await Task.find({ boardId, columnKey: targetColumnKey })
                        .sort({ order: 1, updatedAt: 1 })
                        .session(session);

                    for (let i = 0; i < allTargetTasks.length; i++) {
                        if (allTargetTasks[i].order !== i) {
                            await Task.updateOne(
                                { _id: allTargetTasks[i]._id },
                                { $set: { order: i } },
                                { session }
                            );
                        }
                    }
                }
            } else if (action === "delete") {
                // Permanently delete all tasks in the deleted column
                await Task.deleteMany({ boardId, columnKey }).session(session);
            }

            // Remove source column from board
            board.columns = currentColumns.filter((c) => c.key !== columnKey);

            // Normalize remaining column order values
            board.columns.forEach((col, idx) => {
                col.order = idx;
            });

            await board.save({ session });

            await session.commitTransaction();
            return board;
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            await session.endSession();
        }
    }

    /**
     * Reorders columns on a board.
     * Validates that columnKeys is a valid permutation of existing board column keys.
     * Updates each column's order to sequential values starting at 0.
     *
     * @param {string} boardId - Board ObjectId string
     * @param {Object} data - { columnKeys }
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Object>} Updated board document
     */
    async reorderColumns(boardId, { columnKeys }, userId) {
        this.validateObjectId(boardId);

        if (!userId) {
            throw new ApiError(401, "User is not authenticated");
        }

        if (!Array.isArray(columnKeys)) {
            throw new ApiError(400, "columnKeys must be an array of strings");
        }

        const board = await Board.findOne({ _id: boardId, owner: userId });
        if (!board) {
            throw new ApiError(404, "Board not found");
        }

        await this.ensureBoardColumnsPersisted(board);

        const currentColumns = board.columns || [];
        const uniqueKeys = new Set(columnKeys);

        if (uniqueKeys.size !== columnKeys.length) {
            throw new ApiError(400, "columnKeys cannot contain duplicate keys");
        }

        if (columnKeys.length !== currentColumns.length) {
            throw new ApiError(
                400,
                `columnKeys length (${columnKeys.length}) must match the number of columns on the board (${currentColumns.length})`
            );
        }

        const currentKeyMap = new Map(currentColumns.map((c) => [c.key, c]));
        for (const key of columnKeys) {
            if (!currentKeyMap.has(key)) {
                throw new ApiError(400, `Column key '${key}' does not exist on this board`);
            }
        }

        const reorderedColumns = columnKeys.map((key, index) => {
            const col = currentKeyMap.get(key);
            col.order = index;
            return col;
        });

        board.columns = reorderedColumns;
        await board.save();
        return board;
    }

    /**
     * Deletes a board owned by the authenticated user.
     *
     * @param {string} boardId - Board ObjectId string
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Object>} Result message
     */
    async deleteBoard(boardId, userId) {
        this.validateObjectId(boardId);

        const deletedBoard = await Board.findOneAndDelete({
            _id: boardId,
            owner: userId
        });

        if (!deletedBoard) {
            throw new ApiError(404, "Board not found");
        }

        // Cascade cleanup: remove all tasks belonging to this board to prevent orphaned documents
        await Task.deleteMany({ boardId });

        return { message: "Board deleted successfully" };
    }
}

export const boardService = new BoardService();
