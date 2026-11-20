const { body, param, query } = require('express-validator');
const { PRIORITIES } = require('../config/leadConstants');
const { TASK_STATUSES } = require('../models/Task');

const TASK_SCOPES = ['all', 'today', 'upcoming', 'overdue', 'open'];

const listTasksRules = [
  query('scope').optional({ values: 'falsy' }).isIn(TASK_SCOPES).withMessage(`scope must be one of: ${TASK_SCOPES.join(', ')}`),
  query('status').optional({ values: 'falsy' }).isIn(TASK_STATUSES).withMessage(`status must be one of: ${TASK_STATUSES.join(', ')}`),
  query('priority').optional({ values: 'falsy' }).isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}`),
  query('lead').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid lead id'),
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
];

const titleRule = (optional) =>
  (optional ? body('title').optional() : body('title'))
    .exists({ values: 'falsy' })
    .withMessage('Task title is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .isLength({ min: 2, max: 120 })
    .withMessage('Task title must be between 2 and 120 characters');

const descriptionRule = (optional) =>
  (optional ? body('description').optional({ values: 'null' }) : body('description').optional({ values: 'null' }))
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .isLength({ max: 1000 })
    .withMessage('Task description cannot exceed 1000 characters');

const dueDateRule = (optional) =>
  (optional ? body('dueDate').optional() : body('dueDate'))
    .exists({ values: 'falsy' })
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .toDate();

// The client always sends dueTime, using '' when no time is chosen, so empty
// values must be treated as "no time" rather than as a malformed HH:mm string.
const dueTimeRule = () =>
  body('dueTime')
    .optional({ values: 'falsy' })
    .matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Due time must use the HH:mm format');

const priorityRule = (optional) =>
  (optional ? body('priority').optional() : body('priority'))
    .isIn(PRIORITIES)
    .withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`);

const statusRule = (optional) =>
  (optional ? body('status').optional() : body('status'))
    .isIn(TASK_STATUSES)
    .withMessage(`Status must be one of: ${TASK_STATUSES.join(', ')}`);

const leadRule = (optional) =>
  (optional ? body('lead').optional({ values: 'null' }) : body('lead').optional({ values: 'null' }))
    .custom((value) => value === '' || value === null || /^[a-f0-9]{24}$/i.test(String(value)))
    .withMessage('lead must be a valid lead id');

const createTaskRules = [
  titleRule(false),
  descriptionRule(false),
  dueDateRule(false),
  dueTimeRule(false),
  priorityRule(false),
  statusRule(true),
  leadRule(false),
];

const updateTaskRules = [
  body().custom((value) => {
    const allowed = ['title', 'description', 'dueDate', 'dueTime', 'priority', 'status', 'lead'];
    if (allowed.every((field) => value[field] === undefined)) {
      throw new Error(`Provide at least one field to update: ${allowed.join(', ')}`);
    }
    return true;
  }),
  titleRule(true),
  descriptionRule(true),
  dueDateRule(true),
  dueTimeRule(true),
  priorityRule(true),
  statusRule(true),
  leadRule(true),
];

const taskIdRule = [param('id').isMongoId().withMessage('Invalid task id')];

module.exports = {
  listTasksRules,
  createTaskRules,
  updateTaskRules,
  taskIdRule,
  TASK_SCOPES,
};
