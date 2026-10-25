import { Router } from "express";
import {
    createBoard,
    getUserBoards,
    getBoard,
    updateBoard,
    deleteBoard
} from "../controllers/board.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate, validateParams } from "../middlewares/validate.middleware.js";
import {
    createBoardSchema,
    updateBoardSchema,
    boardIdParamSchema
} from "../validators/board.validator.js";

const router = Router();

// Protect all board routes with JWT authentication
router.use(verifyJWT);

// Board collection routes
router
    .route("/")
    .post(validate(createBoardSchema), createBoard)
    .get(getUserBoards);

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
