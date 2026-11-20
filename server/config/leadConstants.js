/**
 * Shared domain constants for leads.
 * Kept in one place so the Mongoose schema, the HTTP validators, the CSV
 * importer and the scoring rules can never drift apart.
 */

const SOURCES = ['Website', 'LinkedIn', 'Referral', 'Social Media', 'Advertisement', 'Other'];
const STATUSES = ['New', 'Contacted', 'Qualified', 'Lost'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const SCORE_BANDS = [
  { band: 'Cold', min: 0, max: 29 },
  { band: 'Warm', min: 30, max: 59 },
  { band: 'Hot', min: 60, max: 100 },
];

const PHONE_REGEX = /^(\+?[0-9]{1,3}[\s-]?)?[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Columns accepted by the CSV importer, in export order. */
const CSV_COLUMNS = [
  'name',
  'email',
  'phone',
  'company',
  'source',
  'status',
  'priority',
  'jobTitle',
  'description',
  'tags',
  'estimatedValue',
  'lastContactedAt',
  'nextFollowUpAt',
];

/** Columns a CSV file must contain before any row is accepted. */
const CSV_REQUIRED_HEADERS = ['name', 'email', 'phone', 'company', 'source'];

const MAX_IMPORT_ROWS = 1000;

module.exports = {
  SOURCES,
  STATUSES,
  PRIORITIES,
  SCORE_BANDS,
  PHONE_REGEX,
  EMAIL_REGEX,
  CSV_COLUMNS,
  CSV_REQUIRED_HEADERS,
  MAX_IMPORT_ROWS,
};
