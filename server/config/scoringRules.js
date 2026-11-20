const { EMAIL_REGEX, PHONE_REGEX } = require('./leadConstants');

/**
 * Rule-based lead scoring.
 *
 * These are deterministic heuristics — explicitly *not* machine learning.
 * Every rule is a small predicate over the lead's stored fields, so the same
 * explanation shown in the UI is the one used to compute the number.
 */
const SCORING_RULES = [
  {
    key: 'validEmail',
    label: 'Valid email address',
    points: 10,
    describe: (lead) => EMAIL_REGEX.test(String(lead.email || '').trim()),
  },
  {
    key: 'phone',
    label: 'Phone number available',
    points: 5,
    describe: (lead) => PHONE_REGEX.test(String(lead.phone || '').trim()),
  },
  {
    key: 'company',
    label: 'Company available',
    points: 5,
    describe: (lead) => String(lead.company || '').trim().length >= 2,
  },
  {
    key: 'referral',
    label: 'Referral source',
    points: 10,
    describe: (lead) => lead.source === 'Referral',
  },
  {
    key: 'qualified',
    label: 'Qualified status',
    points: 20,
    describe: (lead) => lead.status === 'Qualified',
  },
  {
    key: 'highPriority',
    label: 'High priority',
    points: 15,
    describe: (lead) => lead.priority === 'High',
  },
  {
    key: 'estimatedValue',
    label: 'Estimated value captured',
    points: 10,
    describe: (lead) => Number(lead.estimatedValue) > 0,
  },
  {
    key: 'followUp',
    label: 'Next follow-up scheduled',
    points: 5,
    describe: (lead) => Boolean(lead.nextFollowUpAt),
  },
];

module.exports = { SCORING_RULES };
