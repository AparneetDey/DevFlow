import { ApiError } from "../utils/ApiError.js";

/**
 * 404 Not Found middleware for unmatched application routes.
 * Generates an ApiError with the requested HTTP method and URL, then forwards to errorHandler.
 */
const notFoundHandler = (req, res, next) => {
    const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
    next(error);
};

export { notFoundHandler };
