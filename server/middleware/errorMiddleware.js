const ApiError = require('../utils/ApiError');

/**
 * Centralised error handler. Every error leaves the API in the same shape:
 * { success: false, message, errors? }
 */
const errorHandler = (err, _req, res, _next) => {
  let error = err;

  // Mongoose: malformed ObjectId typed into a query
  if (err.name === 'CastError') {
    error = ApiError.badRequest('Invalid lead id');
  }

  // Mongoose: schema validation failure
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
    error = ApiError.badRequest(errors[0]?.message || 'Validation failed', errors);
  }

  // MongoDB: unique index violation
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ') || 'value';
    error = ApiError.conflict(`A record with this ${field} already exists`);
  }

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON in request body');
  }

  if (err.type === 'entity.too.large') {
    error = ApiError.badRequest('Request body is too large');
  }

  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const isOperational = error instanceof ApiError || error.isOperational;

  if (!isOperational) {
    console.error('[error]', err);
  }

  const payload = {
    success: false,
    message: isOperational ? error.message : 'Internal server error',
  };

  if (error.details) payload.errors = error.details;

  if (process.env.NODE_ENV === 'development' && !isOperational) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
