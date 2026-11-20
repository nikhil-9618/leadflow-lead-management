const ApiError = require('../utils/ApiError');

/**
 * 404 handler for unmatched routes.
 */
const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
