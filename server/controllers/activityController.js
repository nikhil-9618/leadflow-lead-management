const Activity = require('../models/Activity');
const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/leads/:id/activities
 * @desc    Immutable activity timeline for one lead (newest first)
 * @access  Public
 */
const getLeadActivities = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id).select('_id');

  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  const activities = await Activity.find({ lead: lead._id }).sort({ createdAt: -1 }).limit(200);

  res.status(200).json({ success: true, data: activities });
});

module.exports = { getLeadActivities };
