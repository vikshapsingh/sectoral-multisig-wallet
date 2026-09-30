const AppError = require('../utils/AppError');

/**
 * Express error-handling middleware (must have 4 args to be recognized as
 * such). Converts known error types into useful messages instead of a
 * generic "Something went wrong."
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  if (!(err instanceof AppError) && statusCode === 500) {
    // Unexpected error: log full detail server-side, keep client message generic-but-honest.
    console.error('[unhandled error]', err);
    message = 'An unexpected server error occurred. Please try again.';
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `No route: ${req.method} ${req.originalUrl}` } });
}

module.exports = { errorHandler, notFoundHandler };
