import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Service encapsulating authentication business logic.
 */
class AuthService {
    /**
     * Registers a new user with hashed password and initial access/refresh tokens.
     *
     * @param {Object} userData - Registration parameters { username, email, password }
     * @returns {Promise<Object>} Safe user object and tokens
     */
    async registerUser({ username, email, password }) {
        // Check for existing duplicate records
        const existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
            throw new ApiError(409, "User with this username already exists");
        }

        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            throw new ApiError(409, "User with this email already exists");
        }

        try {
            const user = new User({
                username,
                email,
                password
            });

            // Generate tokens
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();

            // Store deterministic SHA-256 hash of refresh token
            user.refreshToken = User.hashRefreshToken(refreshToken);

            await user.save();

            const safeUser = {
                _id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };

            return {
                user: safeUser,
                accessToken,
                refreshToken
            };
        } catch (error) {
            // Guard for race-condition duplicate key errors
            if (error.code === 11000) {
                const duplicateField = Object.keys(error.keyPattern || {})[0] || "credential";
                throw new ApiError(409, `User with this ${duplicateField} already exists`);
            }
            throw error;
        }
    }

    /**
     * Authenticates a user by email and password, rotating refresh token.
     *
     * @param {Object} credentials - { email, password }
     * @returns {Promise<Object>} Safe user object and new tokens
     */
    async loginUser({ email, password }) {
        // Explicitly select password and refreshToken which have select: false
        const user = await User.findOne({ email }).select("+password +refreshToken");
        if (!user) {
            throw new ApiError(401, "Invalid email or password");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid email or password");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Atomically update refresh token hash
        user.refreshToken = User.hashRefreshToken(refreshToken);
        await user.save({ validateBeforeSave: false });

        const safeUser = {
            _id: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        return {
            user: safeUser,
            accessToken,
            refreshToken
        };
    }

    /**
     * Validates an existing refresh token and performs atomic token rotation.
     *
     * @param {string} incomingRefreshToken - Candidate raw refresh token
     * @returns {Promise<Object>} New accessToken and new refreshToken
     */
    async refreshAccessToken(incomingRefreshToken) {
        if (!incomingRefreshToken) {
            throw new ApiError(400, "Refresh token is required");
        }

        // Verify JWT signature and expiration
        let decoded;
        try {
            decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch {
            throw new ApiError(401, "Invalid or expired refresh token");
        }

        if (!decoded?._id) {
            throw new ApiError(401, "Invalid refresh token payload");
        }

        // Find user with current refreshToken hash
        const user = await User.findById(decoded._id).select("+refreshToken");
        if (!user) {
            throw new ApiError(401, "User not found or token has been revoked");
        }

        // Check token hash validity
        if (!user.refreshToken || !user.isRefreshTokenCorrect(incomingRefreshToken)) {
            throw new ApiError(401, "Refresh token is invalid or has already been used");
        }

        // Generate new token pair
        const newAccessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();
        const newHashedRefreshToken = User.hashRefreshToken(newRefreshToken);

        // Atomic conditional update using current stored hash to prevent concurrent rotation collisions
        const currentStoredHash = user.refreshToken;
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id, refreshToken: currentStoredHash },
            { $set: { refreshToken: newHashedRefreshToken } },
            { returnDocument: "after" }
        );

        if (!updatedUser) {
            throw new ApiError(401, "Refresh token was consumed by a concurrent request. Please log in again.");
        }

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    }

    /**
     * Logs out user by clearing the stored refresh token hash.
     *
     * @param {string} userId - User ObjectId
     * @returns {Promise<Object>} Success message
     */
    async logoutUser(userId) {
        await User.findByIdAndUpdate(userId, {
            $unset: { refreshToken: 1 }
        });

        return { message: "Logged out successfully" };
    }

    /**
     * Retrieves current authenticated user profile without sensitive fields.
     *
     * @param {string} userId - User ObjectId
     * @returns {Promise<Object>} Safe user profile
     */
    async getCurrentUser(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return user;
    }
}

export const authService = new AuthService();
