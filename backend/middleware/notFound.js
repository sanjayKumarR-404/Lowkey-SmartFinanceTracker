// notFound.js — Handles requests for routes that don't exist (404 handler)
// Express runs middleware in order; if no route matched, this middleware runs last

const notFound = (req, res, next) => {
  // Build a helpful message showing exactly which URL was not found
  const message = `Route not found: ${req.method} ${req.originalUrl}`;

  res.status(404).json({ success: false, message });
};

module.exports = notFound;
