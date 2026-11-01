import { z } from "zod";
import mongoose from "mongoose";
import { TASK_COLUMNS, TASK_PRIORITIES } from "../models/task.model.js";

/**
 * Reusable schema validator for dueDate.
 * Accepts ISO string, Date object, or null, and validates against invalid date parsing.
 */
const dueDateSchema = z
    .union([z.string(), z.date()])
    .nullable()
    .optional()
    .refine(
        (val) => {
            if (val === undefined || val === null) return true;
            return !isNaN(new Date(val).getTime());
        },
        { message: "Invalid date format for dueDate" }
    );

/**
 * Validation schema for task creation.
 * Accepts title, description, columnKey, priority, dueDate, and isCompleted.
 * Disallows boardId, order, and unrecognized fields.
 */
export const createTaskSchema = z
    .object({
        title: z
            .string({
                required_error: "Title is required",
                invalid_type_error: "Title must be a string"
            })
            .trim()
            .min(1, "Title cannot be empty")
            .max(150, "Title cannot exceed 150 characters"),
        description: z
            .string({
                invalid_type_error: "Description must be a string"
            })
            .trim()
            .max(2000, "Description cannot exceed 2000 characters")
            .optional(),
        columnKey: z
            .string({
                invalid_type_error: "Column key must be a string"
            })
            .trim()
            .min(1, "Column key cannot be empty")
            .optional(),
        priority: z
            .enum(TASK_PRIORITIES, {
                errorMap: () => ({ message: "Priority must be one of: low, medium, high" })
            })
            .optional(),
        dueDate: dueDateSchema,
        isCompleted: z
            .boolean({
                invalid_type_error: "isCompleted must be a boolean"
            })
            .optional()
    })
    .strict({ message: "Unrecognized field provided. Only title, description, columnKey, priority, dueDate, and isCompleted are allowed" });

/**
 * Validation schema for task update.
 * Allows updating title, description, priority, dueDate, and isCompleted.
 * Disallows boardId, columnKey, order, and unrecognized fields.
 * Requires at least one field to be provided.
 */
export const updateTaskSchema = z
    .object({
        title: z
            .string({
                invalid_type_error: "Title must be a string"
            })
            .trim()
            .min(1, "Title cannot be empty")
            .max(150, "Title cannot exceed 150 characters")
            .optional(),
        description: z
            .string({
                invalid_type_error: "Description must be a string"
            })
            .trim()
            .max(2000, "Description cannot exceed 2000 characters")
            .optional(),
        priority: z
            .enum(TASK_PRIORITIES, {
                errorMap: () => ({ message: "Priority must be one of: low, medium, high" })
            })
            .optional(),
        dueDate: dueDateSchema,
        isCompleted: z
            .boolean({
                invalid_type_error: "isCompleted must be a boolean"
            })
            .optional()
    })
    .strict({ message: "Unrecognized field provided. Only title, description, priority, dueDate, and isCompleted can be updated" })
    .refine(
        (data) =>
            data.title !== undefined ||
            data.description !== undefined ||
            data.priority !== undefined ||
            data.dueDate !== undefined ||
            data.isCompleted !== undefined,
        {
            message: "At least one valid field (title, description, priority, dueDate, or isCompleted) must be provided for update"
        }
    );

/**
 * Validation schema for task movement between or within columns.
 * Accepts destination columnKey and optional destination order.
 */
export const moveTaskSchema = z
    .object({
        columnKey: z
            .string({
                required_error: "Column key is required",
                invalid_type_error: "Column key must be a string"
            })
            .trim()
            .min(1, "Column key cannot be empty"),
        order: z
            .number({
                invalid_type_error: "Order must be a number"
            })
            .int("Order must be an integer")
            .min(0, "Order must be a non-negative integer")
            .optional()
    })
    .strict({ message: "Unrecognized field provided. Only columnKey and order are allowed" });

/**
 * Route parameter schema for routes with :boardId.
 */
export const boardIdParamSchema = z.object({
    boardId: z
        .string({ required_error: "Board ID is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid board ID format"
        })
});

/**
 * Route parameter schema for routes with :boardId and :taskId.
 */
export const taskParamsSchema = z.object({
    boardId: z
        .string({ required_error: "Board ID is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid board ID format"
        }),
    taskId: z
        .string({ required_error: "Task ID is required" })
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid task ID format"
        })
});
