/**
 * Reusable wrapper for asynchronous Express route handlers and middleware.
 * Catches unhandled promise rejections and forwards them to Express next().
 *
 * @param {Function} requestHandler - Asynchronous Express middleware/controller function
 * @returns {Function} Express middleware that wraps the handler
 */
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export { asyncHandler };
