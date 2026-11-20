/**
 * Centralized error handling utility
 * Ensures consistent, safe error responses across all routes
 */

class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Only operational errors are sent to clients
  }
}

/**
 * Safe error response builder
 * Returns generic error to client, logs detailed error internally
 */
function handleError(error, res, context = '') {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log full error details internally
  console.error(`[ERROR] ${context}:`, {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Determine status code
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';

  // Build response
  const response = {
    error: error.isOperational 
      ? error.message 
      : 'An error occurred processing your request',
    code: errorCode
  };

  // Only include stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
}

/**
 * Async wrapper to catch errors in route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Express error middleware (goes at the end of app.ts)
 * Catches all errors thrown by routes
 */
const errorMiddleware = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error
  console.error('[EXPRESS ERROR]:', {
    message: err.message,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    stack: isDevelopment ? err.stack : undefined
  });

  // Send safe response
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    error: err.isOperational 
      ? err.message 
      : 'An error occurred processing your request',
    code: errorCode,
    ...(isDevelopment && { stack: err.stack })
  });
};

module.exports = {
  AppError,
  handleError,
  asyncHandler,
  errorMiddleware
};
