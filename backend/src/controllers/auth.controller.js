import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Common base cookie options enforcing security standards.
 */
export const getBaseCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/"
});

/**
 * Cookie options for short-lived access tokens (1 day).
 */
export const getAccessTokenCookieOptions = () => ({
    ...getBaseCookieOptions(),
    maxAge: 24 * 60 * 60 * 1000 // 1 day
});

/**
 * Cookie options for longer-lived refresh tokens (10 days).
 */
export const getRefreshTokenCookieOptions = () => ({
    ...getBaseCookieOptions(),
    maxAge: 10 * 24 * 60 * 60 * 1000 // 10 days
});

/**
 * Controller handling user registration.
 * Route: POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
    const result = await authService.registerUser(req.body);

    return res
        .status(201)
        .cookie("accessToken", result.accessToken, getAccessTokenCookieOptions())
        .cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions())
        .json(new ApiResponse(201, result, "User registered successfully"));
});

/**
 * Controller handling user login.
 * Route: POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
    const result = await authService.loginUser(req.body);

    return res
        .status(200)
        .cookie("accessToken", result.accessToken, getAccessTokenCookieOptions())
        .cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions())
        .json(new ApiResponse(200, result, "User logged in successfully"));
});

/**
 * Controller handling refresh token rotation.
 * Route: POST /api/v1/auth/refresh-token
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refreshAccessToken(incomingRefreshToken);

    return res
        .status(200)
        .cookie("accessToken", result.accessToken, getAccessTokenCookieOptions())
        .cookie("refreshToken", result.refreshToken, getRefreshTokenCookieOptions())
        .json(new ApiResponse(200, result, "Access token refreshed successfully"));
});

/**
 * Controller handling user logout.
 * Route: POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
    const result = await authService.logoutUser(req.user._id);

    return res
        .status(200)
        .clearCookie("accessToken", getBaseCookieOptions())
        .clearCookie("refreshToken", getBaseCookieOptions())
        .json(new ApiResponse(200, result, "User logged out successfully"));
});

/**
 * Controller retrieving authenticated current user profile.
 * Route: GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user fetched successfully"));
});

