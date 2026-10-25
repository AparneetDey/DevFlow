/**
 * Utility function to extract a clean, human-readable error message from
 * a backend ApiError response or network exception.
 *
 * Backend error response structure:
 * {
 *   statusCode: number,
 *   success: false,
 *   message: string,
 *   errors: string[]
 * }
 *
 * @param {any} error - Caught error from Axios or runtime
 * @returns {string} Readable error description
 */
export function extractErrorMessage(error) {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Response received from server with structured payload
  if (error.response?.data) {
    const { errors, message } = error.response.data;

    // Granular validation issues take highest priority
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.join('. ');
    }

    // High-level operational error message
    if (message && typeof message === 'string') {
      return message;
    }
  }

  // Request initiated but no response received (e.g. offline, timeout, server unavailable)
  if (error.request && !error.response) {
    return 'Unable to reach the server. Please check your internet connection.';
  }

  // Generic JavaScript or Axios error message
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
