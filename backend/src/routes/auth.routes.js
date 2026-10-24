import { Router } from "express";
import {
    register,
    login,
    refreshAccessToken,
    logout,
    getCurrentUser
} from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema
} from "../validators/auth.validator.js";

const router = Router();

// Public authentication routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post(
    "/refresh-token",
    (req, res, next) => {
        if ((!req.body || !req.body.refreshToken) && req.cookies?.refreshToken) {
            req.body = { ...(req.body || {}), refreshToken: req.cookies.refreshToken };
        }
        next();
    },
    validate(refreshTokenSchema),
    refreshAccessToken
);

// Protected authentication routes
router.post("/logout", verifyJWT, logout);
router.get("/me", verifyJWT, getCurrentUser);

export default router;
