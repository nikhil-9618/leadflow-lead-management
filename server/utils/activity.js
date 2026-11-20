const Activity = require('../models/Activity');

/**
 * Appends an audit entry. Awaited by the controllers so an audit failure is
 * surfaced instead of silently dropping history.
 */
const logActivity = async ({ lead, action, description, actor = 'system', metadata = {} }) => {
  return Activity.create({ lead, action, description, actor, metadata });
};

module.exports = { logActivity };
