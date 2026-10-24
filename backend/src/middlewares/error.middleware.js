import { ApiError } from "../utils/ApiError.js";

/**
 * Centralized Express error-handling middleware.
 * Formats errors into a consistent JSON structure and manages status codes.
 * Hides stack traces in production to prevent information disclosure.
 */
const errorHandler = (err, req, res, next) => {
    let error = err;

    // Convert standard Errors or unexpected runtime exceptions to ApiError instances
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    const response = {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors || []
    };

    // Include stack trace only in non-production environments for debugging
    if (process.env.NODE_ENV !== "production") {
        response.stack = error.stack;
    }

    return res.status(error.statusCode).json(response);
};

export { errorHandler };
