import { z } from "zod";
import mongoose from "mongoose";

/**
 * Validation schema for board creation requests.
 * Accepts only title (required) and description (optional).
 * Disallows owner, columns, and any unrecognized fields.
 */
export const createBoardSchema = z
    .object({
        title: z
            .string({
                required_error: "Title is required",
                invalid_type_error: "Title must be a string"
            })
            .trim()
            .min(1, "Title cannot be empty")
            .max(100, "Title cannot exceed 100 characters"),
        description: z
            .string({
                invalid_type_error: "Description must be a string"
            })
            .trim()
            .max(500, "Description cannot exceed 500 characters")
            .optional()
    })
    .strict({ message: "Unrecognized field provided. Only title and description are allowed" });

/**
 * Validation schema for board update requests.
 * Accepts title and/or description.
 * Disallows owner, columns, and any unrecognized fields.
 * Requires at least one field to be provided.
 */
export const updateBoardSchema = z
    .object({
        title: z
            .string({
                invalid_type_error: "Title must be a string"
            })
            .trim()
            .min(1, "Title cannot be empty")
            .max(100, "Title cannot exceed 100 characters")
            .optional(),
        description: z
            .string({
                invalid_type_error: "Description must be a string"
            })
            .trim()
            .max(500, "Description cannot exceed 500 characters")
            .optional()
    })
    .strict({ message: "Unrecognized field provided. Only title and description are allowed" })
    .refine(
        (data) => data.title !== undefined || data.description !== undefined,
        {
            message: "At least one field (title or description) must be provided for update"
        }
    );

/**
 * Validation schema for board route parameters (:boardId).
 * Ensures the boardId parameter is a valid MongoDB ObjectId.
 */
export const boardIdParamSchema = z.object({
    boardId: z
        .string({
            required_error: "Board ID is required"
        })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid board ID format"
        })
});

/**
 * Validation schema for adding a column to a board.
 * Accepts only name (required).
 */
export const addColumnSchema = z
    .object({
        name: z
            .string({
                required_error: "Column name is required",
                invalid_type_error: "Column name must be a string"
            })
            .trim()
            .min(1, "Column name cannot be empty")
            .max(50, "Column name cannot exceed 50 characters")
    })
    .strict({ message: "Unrecognized field provided. Only name is allowed" });

/**
 * Validation schema for renaming an existing column on a board.
 * Accepts only name (required).
 */
export const renameColumnSchema = z
    .object({
        name: z
            .string({
                required_error: "Column name is required",
                invalid_type_error: "Column name must be a string"
            })
            .trim()
            .min(1, "Column name cannot be empty")
            .max(50, "Column name cannot exceed 50 characters")
    })
    .strict({ message: "Unrecognized field provided. Only name is allowed" });

/**
 * Validation schema for route parameters with :boardId and :columnKey.
 */
export const columnKeyParamSchema = z.object({
    boardId: z
        .string({ required_error: "Board ID is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid board ID format"
        }),
    columnKey: z
        .string({ required_error: "Column key is required" })
        .trim()
        .min(1, "Column key cannot be empty")
});
