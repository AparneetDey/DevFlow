import { Router } from "express";
import {
    createTask,
    getBoardTasks,
    getTask,
    updateTask,
    moveTask,
    deleteTask
} from "../controllers/task.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate, validateParams } from "../middlewares/validate.middleware.js";
import {
    createTaskSchema,
    updateTaskSchema,
    moveTaskSchema,
    boardIdParamSchema,
    taskParamsSchema
} from "../validators/task.validator.js";

const router = Router({ mergeParams: true });

// Protect all task endpoints with JWT authentication
router.use(verifyJWT);

// Board tasks collection routes: /api/v1/boards/:boardId/tasks
router
    .route("/")
    .post(
        validateParams(boardIdParamSchema),
        validate(createTaskSchema),
        createTask
    )
    .get(
        validateParams(boardIdParamSchema),
        getBoardTasks
    );

// Individual task item routes: /api/v1/boards/:boardId/tasks/:taskId
router
    .route("/:taskId")
    .get(
        validateParams(taskParamsSchema),
        getTask
    )
    .patch(
        validateParams(taskParamsSchema),
        validate(updateTaskSchema),
        updateTask
    )
    .delete(
        validateParams(taskParamsSchema),
        deleteTask
    );

// Task move route: /api/v1/boards/:boardId/tasks/:taskId/move
router
    .route("/:taskId/move")
    .patch(
        validateParams(taskParamsSchema),
        validate(moveTaskSchema),
        moveTask
    );

export default router;
