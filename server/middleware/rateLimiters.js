const rateLimit = require('express-rate-limit');

const skipInTests = () => process.env.NODE_ENV === 'test';

const handler = (_req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  });
};

/** Broad protection for every API route. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  skip: skipInTests,
});

/** Tighter budget for mutations, which are the expensive operations. */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  skip: skipInTests,
});

/** CSV import parses untrusted documents, so it gets its own small budget. */
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  skip: skipInTests,
});

module.exports = { apiLimiter, writeLimiter, importLimiter };
