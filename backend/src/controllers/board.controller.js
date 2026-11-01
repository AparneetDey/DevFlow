import { boardService } from "../services/board.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Controller to create a new board.
 * Route: POST /api/v1/boards
 */
export const createBoard = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const board = await boardService.createBoard({ title, description }, req.user._id);

    return res
        .status(201)
        .json(new ApiResponse(201, board, "Board created successfully"));
});

/**
 * Controller to list all boards belonging to the authenticated user.
 * Route: GET /api/v1/boards
 */
export const getUserBoards = asyncHandler(async (req, res) => {
    const boards = await boardService.getUserBoards(req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, boards, "Boards fetched successfully"));
});

/**
 * Controller to retrieve a single board by ID.
 * Route: GET /api/v1/boards/:boardId
 */
export const getBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const board = await boardService.getBoardById(boardId, req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, board, "Board fetched successfully"));
});

/**
 * Controller to update a board.
 * Route: PATCH /api/v1/boards/:boardId
 */
export const updateBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const { title, description } = req.body;
    const board = await boardService.updateBoard(boardId, { title, description }, req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, board, "Board updated successfully"));
});

/**
 * Controller to add a column to a board.
 * Route: POST /api/v1/boards/:boardId/columns
 */
export const addColumn = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const { name } = req.body;
    const board = await boardService.addColumn(boardId, { name }, req.user._id);

    return res
        .status(201)
        .json(new ApiResponse(201, board, "Column added successfully"));
});

/**
 * Controller to rename an existing column on a board.
 * Route: PATCH /api/v1/boards/:boardId/columns/:columnKey
 */
export const renameColumn = asyncHandler(async (req, res) => {
    const { boardId, columnKey } = req.params;
    const { name } = req.body;
    const board = await boardService.renameColumn(boardId, columnKey, { name }, req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, board, "Column renamed successfully"));
});

/**
 * Controller to delete a board.
 * Route: DELETE /api/v1/boards/:boardId
 */
export const deleteBoard = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const result = await boardService.deleteBoard(boardId, req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Board deleted successfully"));
});
