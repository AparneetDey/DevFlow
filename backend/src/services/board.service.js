import mongoose from "mongoose";
import { Board, DEFAULT_COLUMNS } from "../models/board.model.js";
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
     * Retrieves all boards owned by the authenticated user, sorted by most recently updated.
     *
     * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
     * @returns {Promise<Array>} List of boards
     */
    async getUserBoards(userId) {
        if (!userId) {
            throw new ApiError(401, "User is not authenticated");
        }

        const boards = await Board.find({ owner: userId }).sort({ updatedAt: -1 });
        return boards;
    }

    /**
     * Retrieves a single board by ID owned by the authenticated user.
     * Returns 404 if the board does not exist or is not owned by the user.
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

        return { message: "Board deleted successfully" };
    }
}

export const boardService = new BoardService();
