/**
 * Removes Mongo operator keys ($gt, $ne, …) and dotted paths from any nested
 * value. Applied to body, query and params before validation so a client can
 * never smuggle a query object into a Mongoose filter.
 */
const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      if (key.startsWith('$') || key.includes('.')) {
        return acc;
      }
      acc[key] = sanitizeValue(entry);
      return acc;
    }, {});
  }

  return value;
};

const sanitizeRequest = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  return next();
};

module.exports = sanitizeRequest;
module.exports.sanitizeValue = sanitizeValue;
