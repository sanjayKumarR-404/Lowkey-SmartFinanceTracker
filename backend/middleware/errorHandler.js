// errorHandler.js — Catches any error passed via next(error) in any route
// Express recognises a middleware with 4 parameters as an error handler

const errorHandler = (err, req, res, next) => {
  // Use the error's own status code if it has one, otherwise default to 500
  const statusCode = err.statusCode || 500;

  // In development we want to see the full stack trace; in production hide it
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only include the stack trace when we are in development mode
    stack: isDev ? err.stack : undefined,
  });
};

module.exports = errorHandler;
