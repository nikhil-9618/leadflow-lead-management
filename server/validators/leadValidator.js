const { body, param, query } = require('express-validator');
const {
  SOURCES,
  STATUSES,
  PRIORITIES,
  PHONE_REGEX,
  MAX_IMPORT_ROWS,
} = require('../config/leadConstants');

const SORT_VALUES = ['newest', 'oldest', 'score', 'name'];

const nameRule = (optional) =>
  (optional ? body('name').optional() : body('name'))
    .exists({ values: 'falsy' })
    .withMessage('Name is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters');

const emailRule = (optional) =>
  (optional ? body('email').optional() : body('email'))
    .exists({ values: 'falsy' })
    .withMessage('Email is required')
    .normalizeEmail({ gmail_remove_dots: false })
    .isEmail()
    .withMessage('Please provide a valid email address')
    .bail()
    .isLength({ max: 254 })
    .withMessage('Email is too long');

const phoneRule = (optional) =>
  (optional ? body('phone').optional() : body('phone'))
    .exists({ values: 'falsy' })
    .withMessage('Phone is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .matches(PHONE_REGEX)
    .withMessage('Phone must be a 10-digit number, optionally prefixed with a country code (e.g. +91 9876543210)');

const companyRule = (optional) =>
  (optional ? body('company').optional() : body('company'))
    .exists({ values: 'falsy' })
    .withMessage('Company is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .isLength({ min: 2, max: 120 })
    .withMessage('Company must be between 2 and 120 characters');

const sourceRule = (optional) =>
  (optional ? body('source').optional() : body('source'))
    .exists({ values: 'falsy' })
    .withMessage('Source is required')
    .isIn(SOURCES)
    .withMessage(`Source must be one of: ${SOURCES.join(', ')}`);

// Status is optional on input and defaults to New in the schema.
const statusRule = () =>
  body('status')
    .optional({ values: 'null' })
    .isIn(STATUSES)
    .withMessage(`Status must be one of: ${STATUSES.join(', ')}`);

// Priority is optional on input and defaults to Medium in the schema.
const priorityRule = () =>
  body('priority')
    .optional({ values: 'null' })
    .isIn(PRIORITIES)
    .withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`);

const jobTitleRule = (optional) =>
  (optional ? body('jobTitle').optional({ values: 'null' }) : body('jobTitle').optional({ values: 'null' }))
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .isLength({ max: 100 })
    .withMessage('Job title cannot exceed 100 characters');

const descriptionRule = (optional) =>
  (optional ? body('description').optional({ values: 'null' }) : body('description').optional({ values: 'null' }))
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters');

const tagsRule = (optional) =>
  (optional ? body('tags').optional({ values: 'null' }) : body('tags').optional({ values: 'null' }))
    .isArray({ max: 10 })
    .withMessage('Tags must be an array of at most 10 items')
    .custom((tags) => tags.every((tag) => typeof tag === 'string' && tag.trim().length > 0 && tag.trim().length <= 30))
    .withMessage('Each tag must be between 1 and 30 characters');

const estimatedValueRule = (optional) =>
  (optional ? body('estimatedValue').optional({ values: 'null' }) : body('estimatedValue').optional({ values: 'null' }))
    .isFloat({ min: 0, max: 1000000000 })
    .withMessage('Estimated value must be a number between 0 and 1,000,000,000')
    .toFloat();

const dateRule = (field) => (optional) =>
  (optional ? body(field).optional({ values: 'null' }) : body(field).optional({ values: 'null' }))
    .custom((value) => value === '' || value === null || !Number.isNaN(new Date(value).getTime()))
    .withMessage(`${field} must be a valid date`);

const lastContactedRule = dateRule('lastContactedAt');
const nextFollowUpRule = dateRule('nextFollowUpAt');

const leadFieldRules = (optional) => [
  nameRule(optional),
  emailRule(optional),
  phoneRule(optional),
  companyRule(optional),
  sourceRule(optional),
  statusRule(),
  priorityRule(),
  jobTitleRule(optional),
  descriptionRule(optional),
  tagsRule(optional),
  estimatedValueRule(optional),
  lastContactedRule(optional),
  nextFollowUpRule(optional),
];

const UPDATABLE_FIELDS = [
  'name',
  'email',
  'phone',
  'company',
  'jobTitle',
  'source',
  'status',
  'priority',
  'description',
  'tags',
  'estimatedValue',
  'lastContactedAt',
  'nextFollowUpAt',
];

const createLeadRules = leadFieldRules(false);

const updateLeadRules = [
  body().custom((value) => {
    const provided = UPDATABLE_FIELDS.filter((field) => value[field] !== undefined);
    if (provided.length === 0) {
      throw new Error(`Provide at least one field to update: ${UPDATABLE_FIELDS.join(', ')}`);
    }
    return true;
  }),
  ...leadFieldRules(true),
];

const listLeadsRules = [
  query('search').optional().isString().trim().isLength({ max: 100 }).withMessage('Search term is too long'),
  query('status').optional({ values: 'falsy' }).isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  query('source').optional({ values: 'falsy' }).isIn(SOURCES).withMessage(`Source must be one of: ${SOURCES.join(', ')}`),
  query('priority').optional({ values: 'falsy' }).isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  query('dateFrom').optional({ values: 'falsy' }).isISO8601().withMessage('dateFrom must be a valid date (YYYY-MM-DD)').toDate(),
  query('dateTo').optional({ values: 'falsy' }).isISO8601().withMessage('dateTo must be a valid date (YYYY-MM-DD)').toDate(),
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  query('sort').optional({ values: 'falsy' }).isIn(SORT_VALUES).withMessage(`Sort must be one of: ${SORT_VALUES.join(', ')}`),
];

const leadIdRule = [param('id').isMongoId().withMessage('Invalid lead id')];

const statusUpdateRules = [
  body('status')
    .exists({ values: 'falsy' })
    .withMessage('Status is required')
    .isIn(STATUSES)
    .withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
];

const noteRules = [
  body('text')
    .exists({ values: 'falsy' })
    .withMessage('Note text is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .isLength({ max: 2000 })
    .withMessage('A note cannot exceed 2000 characters'),
];

const exportRules = [
  query('ids').optional().isString().withMessage('ids must be a comma separated list'),
  ...listLeadsRules,
];

const importRules = [
  body('csv').optional().isString().withMessage('csv must be a string').isLength({ max: 2 * 1024 * 1024 }),
  body('rows')
    .optional()
    .isInt({ min: 1, max: MAX_IMPORT_ROWS })
    .withMessage(`A single import is limited to ${MAX_IMPORT_ROWS} rows`),
];

module.exports = {
  createLeadRules,
  updateLeadRules,
  listLeadsRules,
  leadIdRule,
  statusUpdateRules,
  noteRules,
  exportRules,
  importRules,
  UPDATABLE_FIELDS,
};
