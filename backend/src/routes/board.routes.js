import { Router } from "express";
import {
    createBoard,
    getUserBoards,
    getBoard,
    updateBoard,
    deleteBoard,
    addColumn,
    renameColumn
} from "../controllers/board.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate, validateParams } from "../middlewares/validate.middleware.js";
import {
    createBoardSchema,
    updateBoardSchema,
    boardIdParamSchema,
    addColumnSchema,
    renameColumnSchema,
    columnKeyParamSchema
} from "../validators/board.validator.js";
import taskRouter from "./task.routes.js";

const router = Router();

// Protect all board routes with JWT authentication
router.use(verifyJWT);

// Nested task routes for a board: /api/v1/boards/:boardId/tasks
router.use("/:boardId/tasks", taskRouter);

// Board collection routes
router
    .route("/")
    .post(validate(createBoardSchema), createBoard)
    .get(getUserBoards);

// Board column management routes
router
    .route("/:boardId/columns")
    .post(
        validateParams(boardIdParamSchema),
        validate(addColumnSchema),
        addColumn
    );

router
    .route("/:boardId/columns/:columnKey")
    .patch(
        validateParams(columnKeyParamSchema),
        validate(renameColumnSchema),
        renameColumn
    );

// Individual board item routes
router
    .route("/:boardId")
    .get(validateParams(boardIdParamSchema), getBoard)
    .patch(
        validateParams(boardIdParamSchema),
        validate(updateBoardSchema),
        updateBoard
    )
    .delete(validateParams(boardIdParamSchema), deleteBoard);

export default router;
