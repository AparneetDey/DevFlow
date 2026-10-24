import { ApiError } from "../utils/ApiError.js";

/**
 * Middleware factory to validate request body using a Zod schema.
 * Replaces req.body with parsed/sanitized data on success, or forwards a 400 ApiError on failure.
 *
 * @param {import("zod").ZodSchema} schema - Zod schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => (req, res, next) => {
    try {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => issue.message);
            return next(new ApiError(400, "Validation Error", errors));
        }

        req.body = result.data;
        next();
    } catch (error) {
        next(error);
    }
};
