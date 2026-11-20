const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

/**
 * Rejects malformed MongoDB ObjectIds before they reach a query.
 */
const validateObjectId = (paramName = 'id', message = 'Invalid lead id') => (req, _res, next) => {
  const value = req.params[paramName];

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return next(ApiError.badRequest(message));
  }

  return next();
};

module.exports = validateObjectId;
