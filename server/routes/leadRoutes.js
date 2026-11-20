const express = require('express');
const {
  getLeads,
  getLeadStats,
  getScoringRules,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStatus,
  addLeadNote,
  deleteLead,
} = require('../controllers/leadController');
const { getLeadActivities } = require('../controllers/activityController');
const { previewImport, importLeads, exportLeads } = require('../controllers/transferController');
const {
  createLeadRules,
  updateLeadRules,
  listLeadsRules,
  leadIdRule,
  statusUpdateRules,
  noteRules,
  exportRules,
  importRules,
} = require('../validators/leadValidator');
const validate = require('../middleware/validationMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { writeLimiter, importLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

/** Raw CSV uploads arrive as text/csv; normalise them into a body object. */
const normaliseCsvBody = (req, _res, next) => {
  if (typeof req.body === 'string') {
    req.body = { csv: req.body };
  }
  return next();
};

const csvParser = express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' });

// Static routes must be declared before the :id route.
router.get('/stats', listLeadsRules, validate, getLeadStats);
router.get('/scoring-rules', getScoringRules);

router.get('/export', exportRules, validate, exportLeads);

router.post(
  '/import/preview',
  importLimiter,
  csvParser,
  normaliseCsvBody,
  importRules,
  validate,
  previewImport
);

router.post('/import', importLimiter, csvParser, normaliseCsvBody, importRules, validate, importLeads);

router
  .route('/')
  .get(listLeadsRules, validate, getLeads)
  .post(writeLimiter, createLeadRules, validate, createLead);

router
  .route('/:id')
  .all(leadIdRule, validate, validateObjectId())
  .get(getLeadById)
  .put(writeLimiter, updateLeadRules, validate, updateLead)
  .delete(writeLimiter, deleteLead);

router.patch('/:id/status', leadIdRule, validate, validateObjectId(), writeLimiter, statusUpdateRules, validate, updateLeadStatus);

router.post('/:id/notes', leadIdRule, validate, validateObjectId(), writeLimiter, noteRules, validate, addLeadNote);

router.get('/:id/activities', leadIdRule, validate, validateObjectId(), getLeadActivities);

module.exports = router;
