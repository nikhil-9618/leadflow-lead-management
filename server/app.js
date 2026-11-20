const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const ApiError = require('./utils/ApiError');
const healthRoutes = require('./routes/healthRoutes');
const leadRoutes = require('./routes/leadRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notFound = require('./middleware/notFoundMiddleware');
const errorHandler = require('./middleware/errorMiddleware');
const sanitizeRequest = require('./middleware/sanitizeRequest');
const { apiLimiter } = require('./middleware/rateLimiters');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

// Behind Render/Vercel the client IP arrives in X-Forwarded-For, which the rate
// limiter needs in order to identify callers correctly.
app.set('trust proxy', 1);
app.set('query parser', 'extended');
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server / curl requests without an Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // A wildcard is only acceptable outside production.
      if (!isProduction && allowedOrigins.includes('*')) return callback(null, true);
      return callback(new ApiError(403, `Origin ${origin} is not allowed by CORS`));
    },
    credentials: false,
  })
);

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Strip Mongo operators/dotted paths from every request before validation.
app.use(sanitizeRequest);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(isProduction ? 'combined' : 'dev'));
}

app.use('/api', apiLimiter);

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'LeadFlow API is running',
    version: '2.0.0',
    docs: '/api/leads',
    health: '/api/health',
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
