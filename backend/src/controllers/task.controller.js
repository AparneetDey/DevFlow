import { taskService } from "../services/task.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Controller to create a new task under a board.
 * Route: POST /api/v1/boards/:boardId/tasks
 */
export const createTask = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const task = await taskService.createTask(boardId, req.body, req.user._id);

    return res
        .status(201)
        .json(new ApiResponse(201, task, "Task created successfully"));
});

/**
 * Controller to list all tasks belonging to a board with optional column filter.
 * Route: GET /api/v1/boards/:boardId/tasks
 */
export const getBoardTasks = asyncHandler(async (req, res) => {
    const { boardId } = req.params;
    const { columnKey, column } = req.query;
    const tasks = await taskService.getBoardTasks(
        boardId,
        { columnKey: columnKey || column },
        req.user._id
    );

    return res
        .status(200)
        .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

/**
 * Controller to retrieve a single task by ID.
 * Route: GET /api/v1/boards/:boardId/tasks/:taskId
 */
export const getTask = asyncHandler(async (req, res) => {
    const { boardId, taskId } = req.params;
    const task = await taskService.getTaskById(boardId, taskId, req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task fetched successfully"));
});

/**
 * Controller to update a task's details (title, description, priority, dueDate).
 * Route: PATCH /api/v1/boards/:boardId/tasks/:taskId
 */
export const updateTask = asyncHandler(async (req, res) => {
    const { boardId, taskId } = req.params;
    const task = await taskService.updateTask(boardId, taskId, req.body, req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task updated successfully"));
});

/**
 * Controller to move a task between columns or reposition it within a column.
 * Route: PATCH /api/v1/boards/:boardId/tasks/:taskId/move
 */
export const moveTask = asyncHandler(async (req, res) => {
    const { boardId, taskId } = req.params;
    const task = await taskService.moveTask(boardId, taskId, req.body, req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task moved successfully"));
});

/**
 * Controller to delete a task.
 * Route: DELETE /api/v1/boards/:boardId/tasks/:taskId
 */
export const deleteTask = asyncHandler(async (req, res) => {
    const { boardId, taskId } = req.params;
    const result = await taskService.deleteTask(boardId, taskId, req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Task deleted successfully"));
});
