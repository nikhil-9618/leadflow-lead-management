/**
 * Backwards-compatible re-export. All rules now live in `src/validations/`
 * so the app has a single source of truth on the client.
 */
export {
  SOURCES,
  STATUSES,
  PRIORITIES,
  TASK_STATUSES,
  PHONE_REGEX,
  EMAIL_REGEX,
  emptyLead,
  emptyTask,
  validateLead,
  validateTask,
  parseTagsInput,
} from '../validations/leadSchema.js';
