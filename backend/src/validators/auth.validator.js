import { z } from "zod";

export const registerSchema = z.object({
    username: z
        .string({ required_error: "Username is required" })
        .min(3, "Username must be at least 3 characters long")
        .max(30, "Username cannot exceed 30 characters")
        .regex(
            /^[A-Za-z0-9_]+$/,
            "Username can only contain English letters, numbers, and underscores"
        )
        .toLowerCase(),
    email: z
        .string({ required_error: "Email is required" })
        .trim()
        .email("Please provide a valid email address")
        .toLowerCase(),
    password: z
        .string({ required_error: "Password is required" })
        .min(6, "Password must be at least 6 characters long")
});

export const loginSchema = z.object({
    email: z
        .string({ required_error: "Email is required" })
        .trim()
        .email("Please provide a valid email address")
        .toLowerCase(),
    password: z
        .string({ required_error: "Password is required" })
        .min(1, "Password is required")
});

export const refreshTokenSchema = z.object({
    refreshToken: z
        .string({ required_error: "Refresh token is required" })
        .min(1, "Refresh token is required")
});
