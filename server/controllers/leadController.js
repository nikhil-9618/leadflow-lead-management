const Lead = require('../models/Lead');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');
const { calculateLeadScore } = require('../utils/scoring');
const { STATUSES, SOURCES, PRIORITIES } = require('../config/leadConstants');
const { UPDATABLE_FIELDS } = require('../validators/leadValidator');

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const MAX_EXPORT_ROWS = 5000;

/** Escapes user input before building a RegExp so a search can never inject a pattern. */
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const startOfUtcDay = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfUtcDay = (value) => {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

/** Builds the Mongo filter from already-validated query values. */
const buildFilter = (query = {}) => {
  const filter = {};
  const { search, status, source, priority, dateFrom, dateTo } = query;

  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }];
  }
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (priority) filter.priority = priority;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = startOfUtcDay(dateFrom);
    if (dateTo) filter.createdAt.$lte = endOfUtcDay(dateTo);
  }

  return filter;
};

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  score: { score: -1, createdAt: -1 },
  name: { name: 1 },
};

const normaliseTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];
  tags.forEach((tag) => {
    const clean = String(tag).trim();
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  });
  return result.slice(0, 10);
};

/**
 * @route   GET /api/leads
 * @desc    Paginated, searchable, filterable and sortable lead list
 * @access  Public
 */
const getLeads = asyncHandler(async (req, res) => {
  const page = req.query.page || DEFAULT_PAGE;
  const limit = req.query.limit || DEFAULT_LIMIT;
  const sort = SORTS[req.query.sort] || SORTS.newest;
  const filter = buildFilter(req.query);
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    Lead.find(filter).sort(sort).skip(skip).limit(limit),
    Lead.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.status(200).json({
    success: true,
    data: leads,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

/** Fills missing days/months so a chart never draws a misleading gap. */
const fillDaily = (rows, from, to) => {
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  const series = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ date: key, count: counts.get(key) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
};

const fillMonthly = (rows) => {
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  const series = [];
  const now = new Date();
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = date.toISOString().slice(0, 7);
    series.push({ month: key, count: counts.get(key) || 0 });
  }
  return series;
};

/**
 * @route   GET /api/leads/stats
 * @desc    Aggregated dashboard statistics and chart series from MongoDB
 * @access  Public
 */
const getLeadStats = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const now = new Date();

  const rangeFilter = { ...filter };
  const dayFrom = filter.createdAt?.$gte
    ? startOfUtcDay(filter.createdAt.$gte)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  const dayTo = filter.createdAt?.$lte ? endOfUtcDay(filter.createdAt.$lte) : now;

  const dailyMatch = { ...rangeFilter, createdAt: { $gte: dayFrom, $lte: dayTo } };
  const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const monthlyMatch = { ...filter, createdAt: { ...(filter.createdAt || {}), $gte: monthlyStart } };
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [statusAgg, sourceAgg, priorityAgg, dailyAgg, monthlyAgg, filteredTotal, monthCount, valueAgg] =
    await Promise.all([
      Lead.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: filter }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: filter }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Lead.aggregate([
        { $match: dailyMatch },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: monthlyMatch },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Lead.countDocuments(filter),
      Lead.countDocuments({ ...filter, createdAt: { ...(filter.createdAt || {}), $gte: monthStart } }),
      Lead.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$estimatedValue' } } }]),
    ]);

  const byStatus = STATUSES.map((status) => ({
    name: status,
    value: statusAgg.find((row) => row._id === status)?.count || 0,
  }));
  const bySource = SOURCES.map((source) => ({
    name: source,
    value: sourceAgg.find((row) => row._id === source)?.count || 0,
  }));
  const byPriority = PRIORITIES.map((priority) => ({
    name: priority,
    value: priorityAgg.find((row) => row._id === priority)?.count || 0,
  }));

  const stats = {
    total: filteredTotal,
    new: byStatus.find((row) => row.name === 'New').value,
    contacted: byStatus.find((row) => row.name === 'Contacted').value,
    qualified: byStatus.find((row) => row.name === 'Qualified').value,
    lost: byStatus.find((row) => row.name === 'Lost').value,
    createdThisMonth: monthCount,
    conversionRate: filteredTotal ? Math.round((byStatus.find((row) => row.name === 'Qualified').value / filteredTotal) * 1000) / 10 : 0,
    totalEstimatedValue: valueAgg[0]?.total || 0,
    charts: {
      byStatus,
      bySource,
      byPriority,
      dailyTrend: fillDaily(dailyAgg, dayFrom, dayTo),
      monthlyTrend: fillMonthly(monthlyAgg),
    },
  };

  const recentLeads = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .limit(6)
    .select('name company email status priority source score scoreBand createdAt');

  res.status(200).json({ success: true, data: { ...stats, recentLeads } });
});

/**
 * @route   GET /api/leads/scoring-rules
 * @desc    The rule-based scoring model, so the UI can explain every point
 * @access  Public
 */
const getScoringRules = asyncHandler(async (_req, res) => {
  const { SCORING_RULES } = require('../config/scoringRules');
  res.status(200).json({
    success: true,
    data: {
      maxScore: 100,
      bands: [
        { band: 'Cold', min: 0, max: 29 },
        { band: 'Warm', min: 30, max: 59 },
        { band: 'Hot', min: 60, max: 100 },
      ],
      rules: SCORING_RULES.map(({ key, label, points }) => ({ key, label, points })),
    },
  });
});

/**
 * @route   GET /api/leads/:id
 * @desc    Single lead by id, including its score breakdown
 * @access  Public
 */
const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  res.status(200).json({
    success: true,
    data: { ...lead.toJSON(), scoreBreakdown: calculateLeadScore(lead).breakdown },
  });
});

/**
 * @route   POST /api/leads
 * @desc    Create a lead
 * @access  Public
 */
const createLead = asyncHandler(async (req, res) => {
  const body = req.body;

  const existing = await Lead.findOne({ email: String(body.email).toLowerCase() });
  if (existing) {
    throw ApiError.conflict('A lead with this email address already exists');
  }

  const lead = await Lead.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company,
    jobTitle: body.jobTitle || '',
    source: body.source,
    status: body.status || 'New',
    priority: body.priority || 'Medium',
    description: body.description || '',
    tags: normaliseTags(body.tags),
    estimatedValue: body.estimatedValue || 0,
    lastContactedAt: body.lastContactedAt || null,
    nextFollowUpAt: body.nextFollowUpAt || null,
  });

  await logActivity({
    lead: lead._id,
    action: 'created',
    description: `Lead created from ${lead.source}`,
    metadata: { status: lead.status, priority: lead.priority, score: lead.score },
  });

  let activity;
  if (body.nextFollowUpAt) {
    activity = await logActivity({
      lead: lead._id,
      action: 'followup_scheduled',
      description: `Initial follow-up scheduled for ${new Date(body.nextFollowUpAt).toISOString()}`,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: { ...lead.toJSON(), scoreBreakdown: calculateLeadScore(lead).breakdown },
    ...(activity ? {} : {}),
  });
});

const sameDate = (a, b) => {
  const left = a ? new Date(a).getTime() : null;
  const right = b ? new Date(b).getTime() : null;
  return left === right;
};

/**
 * @route   PUT /api/leads/:id
 * @desc    Update any subset of a lead's fields
 * @access  Public
 */
const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  const body = req.body;

  if (body.email && String(body.email).toLowerCase() !== lead.email) {
    const duplicate = await Lead.findOne({
      email: String(body.email).toLowerCase(),
      _id: { $ne: lead._id },
    });
    if (duplicate) {
      throw ApiError.conflict('A lead with this email address already exists');
    }
  }

  const previousStatus = lead.status;
  const previousFollowUp = lead.nextFollowUpAt;
  const changed = [];

  UPDATABLE_FIELDS.forEach((field) => {
    if (body[field] === undefined) return;

    if (field === 'tags') {
      const next = normaliseTags(body.tags);
      if (JSON.stringify(next) !== JSON.stringify(lead.tags)) {
        lead.tags = next;
        changed.push('tags');
      }
      return;
    }

    if (field === 'lastContactedAt' || field === 'nextFollowUpAt') {
      const nextValue = body[field] ? new Date(body[field]) : null;
      if (!sameDate(nextValue, lead[field])) {
        lead[field] = nextValue;
        changed.push(field);
      }
      return;
    }

    if (field === 'estimatedValue') {
      const nextValue = Number(body[field]) || 0;
      if (nextValue !== lead.estimatedValue) {
        lead.estimatedValue = nextValue;
        changed.push(field);
      }
      return;
    }

    const nextValue = typeof body[field] === 'string' ? body[field].trim() : body[field];
    if (String(lead[field] ?? '') !== String(nextValue ?? '')) {
      lead[field] = nextValue;
      changed.push(field);
    }
  });

  if (changed.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No changes were applied',
      data: { ...lead.toJSON(), scoreBreakdown: calculateLeadScore(lead).breakdown },
    });
  }

  await lead.save();

  if (lead.status !== previousStatus) {
    await logActivity({
      lead: lead._id,
      action: 'status_changed',
      description: `Status changed from ${previousStatus} to ${lead.status}`,
      metadata: { from: previousStatus, to: lead.status },
    });
  }

  const nonStatusChanges = changed.filter((field) => field !== 'status');
  if (nonStatusChanges.length > 0) {
    await logActivity({
      lead: lead._id,
      action: 'updated',
      description: `Updated ${nonStatusChanges.join(', ')}`,
      metadata: { fields: nonStatusChanges, score: lead.score },
    });
  }

  if (changed.includes('nextFollowUpAt') && lead.nextFollowUpAt && !sameDate(lead.nextFollowUpAt, previousFollowUp)) {
    await logActivity({
      lead: lead._id,
      action: 'followup_scheduled',
      description: `Follow-up scheduled for ${lead.nextFollowUpAt.toISOString()}`,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Lead updated successfully',
    data: { ...lead.toJSON(), scoreBreakdown: calculateLeadScore(lead).breakdown },
  });
});

/**
 * @route   PATCH /api/leads/:id/status
 * @desc    Move a lead between pipeline stages (used by the Kanban board)
 * @access  Public
 */
const updateLeadStatus = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  const { status } = req.body;
  const previousStatus = lead.status;

  if (previousStatus === status) {
    return res.status(200).json({
      success: true,
      message: 'Lead already in that stage',
      data: lead,
    });
  }

  lead.status = status;
  await lead.save();

  await logActivity({
    lead: lead._id,
    action: 'status_changed',
    description: `Status changed from ${previousStatus} to ${lead.status} in the pipeline`,
    metadata: { from: previousStatus, to: lead.status, source: 'pipeline' },
  });

  return res.status(200).json({ success: true, message: 'Lead status updated', data: lead });
});

/**
 * @route   POST /api/leads/:id/notes
 * @desc    Append a note to a lead
 * @access  Public
 */
const addLeadNote = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  lead.notes.push({ text: req.body.text });
  await lead.save();

  const note = lead.notes[lead.notes.length - 1];

  await logActivity({
    lead: lead._id,
    action: 'note_added',
    description: 'Note added',
    metadata: { noteId: note._id.toString(), preview: req.body.text.slice(0, 120) },
  });

  res.status(201).json({ success: true, message: 'Note added', data: note });
});

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete a lead, keeping its audit trail
 * @access  Public
 */
const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);

  if (!lead) {
    throw ApiError.notFound('Lead not found');
  }

  // Tasks outlive the lead but must not point at a deleted record.
  await Task.updateMany({ lead: lead._id }, { $set: { lead: null } });

  await logActivity({
    lead: lead._id,
    action: 'deleted',
    description: `Lead deleted (${lead.name} · ${lead.email})`,
    metadata: { name: lead.name, email: lead.email, company: lead.company, status: lead.status },
  });

  res.status(200).json({ success: true, message: 'Lead deleted successfully', data: { id: lead.id } });
});

module.exports = {
  getLeads,
  getLeadStats,
  getScoringRules,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStatus,
  addLeadNote,
  deleteLead,
  buildFilter,
  SORTS,
  MAX_EXPORT_ROWS,
};
