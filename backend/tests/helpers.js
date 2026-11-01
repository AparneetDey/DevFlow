import mongoose from "mongoose";
import { User } from "../src/models/user.model.js";
import { Board, DEFAULT_COLUMNS } from "../src/models/board.model.js";
import { Task } from "../src/models/task.model.js";
import { TEST_DB_NAME } from "./setup.js";

/**
 * Safely cleans up all documents from the test database.
 * Throws immediately if connected to any database other than the dedicated test database.
 */
export async function cleanDatabase() {
    if (mongoose.connection.name !== TEST_DB_NAME) {
        throw new Error(
            `DESTRUCTIVE ACTION BLOCKED: Refusing to clean database "${mongoose.connection.name}". ` +
            `Must be connected to dedicated test database "${TEST_DB_NAME}".`
        );
    }

    await Promise.all([
        User.deleteMany({}),
        Board.deleteMany({}),
        Task.deleteMany({})
    ]);
}

/**
 * Creates and persists a test user directly in MongoDB.
 * Generates valid JWT access and refresh tokens, setting the hashed refresh token in the DB.
 *
 * @param {Object} override - Optional fields to override defaults
 * @returns {Promise<Object>} Object containing user document, raw password, tokens, and ready-to-use auth headers/cookies
 */
export async function createTestUser(override = {}) {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const rawPassword = override.password || "SecureTestPass123!";

    const user = new User({
        username: override.username || `user_${uniqueSuffix}`,
        email: override.email || `test_${uniqueSuffix}@example.com`,
        password: rawPassword
    });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = User.hashRefreshToken(refreshToken);

    await user.save();

    return {
        user,
        rawPassword,
        accessToken,
        refreshToken,
        authHeaders: {
            Authorization: `Bearer ${accessToken}`
        },
        authCookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`
    };
}

/**
 * Creates and persists a test board directly in MongoDB.
 *
 * @param {string|mongoose.Types.ObjectId} ownerId - Owner user ID
 * @param {Object} override - Optional field overrides
 * @returns {Promise<Object>} Board document
 */
export async function createTestBoard(ownerId, override = {}) {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const board = await Board.create({
        title: override.title || `Test Board ${uniqueSuffix}`,
        description: override.description !== undefined ? override.description : "Test board description",
        owner: ownerId,
        columns: override.columns || DEFAULT_COLUMNS
    });

    return board;
}

/**
 * Creates and persists a test task directly in MongoDB.
 *
 * @param {string|mongoose.Types.ObjectId} boardId - Parent board ID
 * @param {Object} override - Optional field overrides
 * @returns {Promise<Object>} Task document
 */
export async function createTestTask(boardId, override = {}) {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const task = await Task.create({
        title: override.title || `Test Task ${uniqueSuffix}`,
        description: override.description !== undefined ? override.description : "Test task description",
        boardId,
        columnKey: override.columnKey || "todo",
        order: override.order !== undefined ? override.order : 0,
        priority: override.priority || "medium",
        dueDate: override.dueDate || null,
        isCompleted: override.isCompleted !== undefined ? override.isCompleted : false
    });

    return task;
}

/**
 * Extracts cookie metadata from a Supertest response header.
 *
 * @param {Object} res - Supertest response
 * @param {string} cookieName - Name of the cookie to extract
 * @returns {Object|null} Extracted cookie details { value, isHttpOnly, isSecure, path, maxAge }
 */
export function getCookieValue(res, cookieName) {
    const rawCookies = res.headers["set-cookie"];
    if (!rawCookies) return null;

    const cookieList = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
    for (const cookieStr of cookieList) {
        const parts = cookieStr.split(";");
        const [cName, cVal] = parts[0].trim().split("=");
        if (cName === cookieName) {
            return {
                value: cVal,
                isHttpOnly: /httponly/i.test(cookieStr),
                isSecure: /secure/i.test(cookieStr),
                path: (cookieStr.match(/path=([^;]+)/i) || [])[1] || null,
                maxAge: (cookieStr.match(/max-age=([^;]+)/i) || [])[1] || null
            };
        }
    }
    return null;
}
