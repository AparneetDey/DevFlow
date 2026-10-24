import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Middleware to verify JWT access tokens from Authorization Bearer header.
 * Attaches the authenticated user document to req.user (excluding password and refreshToken).
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
    let token = req.cookies?.accessToken;

    const authHeader = req.headers.authorization;
    if (authHeader) {
        if (!authHeader.startsWith("Bearer ")) {
            throw new ApiError(401, "Invalid authorization format. Format must be 'Bearer <token>'");
        }

        token = authHeader.split(" ")[1]?.trim();
        if (!token) {
            throw new ApiError(401, "Access token missing");
        }
    }

    if (!token) {
        throw new ApiError(401, "Authorization header missing");
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Access token has expired");
        }
        throw new ApiError(401, "Invalid access token");
    }

    if (!decoded?._id) {
        throw new ApiError(401, "Malformed token payload");
    }

    const user = await User.findById(decoded._id);
    if (!user) {
        throw new ApiError(401, "User no longer exists");
    }

    req.user = user;
    next();
});
