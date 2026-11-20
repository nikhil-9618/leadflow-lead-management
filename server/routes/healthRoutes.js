const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Liveness probe including database connection state
 * @access  Public
 */
router.get('/', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = states[mongoose.connection.readyState] || 'unknown';
  const healthy = dbState === 'connected';

  res.status(200).json({
    success: true,
    data: {
      status: healthy ? 'ok' : 'degraded',
      service: 'leadflow-api',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.round(process.uptime()),
      database: dbState,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
