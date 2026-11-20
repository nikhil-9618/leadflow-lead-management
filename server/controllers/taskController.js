const Task = require('../models/Task');
const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');

const startOfUtcDay = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfUtcDay = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const OPEN_STATUSES = ['Pending', 'In Progress'];

/** Scope filters explained in the README and mirrored by the Tasks page tabs. */
const buildScopeFilter = (scope = 'all') => {
  const todayStart = startOfUtcDay();
  const todayEnd = endOfUtcDay();

  if (scope === 'today') {
    return { dueDate: { $gte: todayStart, $lte: todayEnd } };
  }
  if (scope === 'upcoming') {
    return { dueDate: { $gt: todayEnd }, status: { $in: OPEN_STATUSES } };
  }
  if (scope === 'overdue') {
    return { dueDate: { $lt: todayStart }, status: { $in: OPEN_STATUSES } };
  }
  if (scope === 'open') {
    return { status: { $in: OPEN_STATUSES } };
  }
  return {};
};

/**
 * @route   GET /api/tasks
 * @desc    Paginated task list with scope tabs and counters
 * @access  Public
 */
const getTasks = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 25;

  const filter = buildScopeFilter(req.query.scope);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.lead) filter.lead = req.query.lead;

  const sort = req.query.scope === 'all' ? { dueDate: 1, dueTime: 1 } : { dueDate: 1, dueTime: 1 };

  const [tasks, total, today, upcoming, overdue, open] = await Promise.all([
    Task.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('lead', 'name company status'),
    Task.countDocuments(filter),
    Task.countDocuments(buildScopeFilter('today')),
    Task.countDocuments(buildScopeFilter('upcoming')),
    Task.countDocuments(buildScopeFilter('overdue')),
    Task.countDocuments(buildScopeFilter('open')),
  ]);

  res.status(200).json({
    success: true,
    data: tasks,
    counts: { today, upcoming, overdue, open },
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const resolveLead = async (leadId) => {
  if (!leadId) return null;
  const lead = await Lead.findById(leadId).select('_id name');
  if (!lead) {
    throw ApiError.badRequest('The selected lead does not exist');
  }
  return lead;
};

/**
 * @route   POST /api/tasks
 * @desc    Create a task or follow-up
 * @access  Public
 */
const createTask = asyncHandler(async (req, res) => {
  const { title, description, dueDate, dueTime, priority, status, lead: leadId } = req.body;
  const lead = await resolveLead(leadId);

  const task = await Task.create({
    title,
    description: description || '',
    dueDate,
    dueTime: dueTime || '',
    priority: priority || 'Medium',
    status: status || 'Pending',
    lead: lead ? lead._id : null,
    completedAt: status === 'Completed' ? new Date() : null,
  });

  if (lead) {
    await logActivity({
      lead: lead._id,
      action: 'task_created',
      description: `Follow-up task created: ${task.title}`,
      metadata: { taskId: task.id, dueDate: task.dueDate },
    });
  }

  res.status(201).json({ success: true, message: 'Task created successfully', data: task });
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Public
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw ApiError.notFound('Task not found');
  }

  const { title, description, dueDate, dueTime, priority, status, lead: leadId } = req.body;

  if (leadId !== undefined) {
    if (!leadId) {
      task.lead = null;
    } else {
      const lead = await resolveLead(leadId);
      task.lead = lead._id;
    }
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (dueTime !== undefined) task.dueTime = dueTime;
  if (priority !== undefined) task.priority = priority;

  if (status !== undefined) {
    task.status = status;
    task.completedAt = status === 'Completed' ? task.completedAt || new Date() : null;
  }

  await task.save();

  if (status === 'Completed' && task.lead) {
    await logActivity({
      lead: task.lead,
      action: 'task_completed',
      description: `Task completed: ${task.title}`,
      metadata: { taskId: task.id },
    });
  }

  res.status(200).json({ success: true, message: 'Task updated successfully', data: task });
});

/**
 * @route   PATCH /api/tasks/:id/complete
 * @desc    Mark a task complete (or reopen it)
 * @access  Public
 */
const completeTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw ApiError.notFound('Task not found');
  }

  const nextCompleted = req.body.completed === undefined ? true : Boolean(req.body.completed);

  task.status = nextCompleted ? 'Completed' : 'Pending';
  task.completedAt = nextCompleted ? new Date() : null;
  await task.save();

  if (nextCompleted && task.lead) {
    await logActivity({
      lead: task.lead,
      action: 'task_completed',
      description: `Task completed: ${task.title}`,
      metadata: { taskId: task.id },
    });
  }

  res.status(200).json({
    success: true,
    message: nextCompleted ? 'Task marked complete' : 'Task reopened',
    data: task,
  });
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Public
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);

  if (!task) {
    throw ApiError.notFound('Task not found');
  }

  res.status(200).json({ success: true, message: 'Task deleted successfully', data: { id: task.id } });
});

module.exports = { getTasks, createTask, updateTask, completeTask, deleteTask, buildScopeFilter };
