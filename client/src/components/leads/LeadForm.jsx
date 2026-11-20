import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import {
  PRIORITIES,
  SOURCES,
  STATUSES,
  emptyLead,
  parseTagsInput,
  validateLead,
} from '../../validations/leadSchema.js';
import { getApiErrorMessage } from '../../services/api.js';
import { toDateInput } from '../../utils/formatDate.js';

const fieldClass = (hasError) => `input ${hasError ? 'input-error' : ''}`;

const toPayloadDate = (value) => (value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null);

const fromLead = (lead) => ({
  name: lead.name || '',
  email: lead.email || '',
  phone: lead.phone || '',
  company: lead.company || '',
  jobTitle: lead.jobTitle || '',
  source: lead.source || 'Website',
  status: lead.status || 'New',
  priority: lead.priority || 'Medium',
  description: lead.description || '',
  tags: (lead.tags || []).join(', '),
  estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : '',
  lastContactedAt: toDateInput(lead.lastContactedAt),
  nextFollowUpAt: toDateInput(lead.nextFollowUpAt),
});

export default function LeadForm({ open, mode = 'create', lead, onClose, onSubmit }) {
  const [values, setValues] = useState(emptyLead);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(lead ? fromLead(lead) : emptyLead);
    setErrors({});
    setFormError('');
    setSubmitting(false);
  }, [open, lead]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateLead(values);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      company: values.company.trim(),
      jobTitle: values.jobTitle.trim(),
      source: values.source,
      status: values.status,
      priority: values.priority,
      description: values.description.trim(),
      tags: parseTagsInput(values.tags),
      estimatedValue: String(values.estimatedValue).trim() ? Number(values.estimatedValue) : 0,
      lastContactedAt: toPayloadDate(values.lastContactedAt),
      nextFollowUpAt: toPayloadDate(values.nextFollowUpAt),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
      setSubmitting(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Edit lead' : 'Add a new lead'}
      description={
        isEdit
          ? 'Update contact details, priority and pipeline stage.'
          : 'Capture a new contact. Only the fields marked * are required.'
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="lead-form" className="btn-primary" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create lead'}
          </button>
        </div>
      }
    >
      <form id="lead-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{formError}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="label">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoFocus
              value={values.name}
              onChange={handleChange}
              placeholder="e.g. Rahul Sharma"
              className={fieldClass(errors.name)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
              maxLength={80}
            />
            {errors.name ? (
              <p id="name-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="email" className="label">
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              placeholder="rahul@company.com"
              className={fieldClass(errors.email)}
              aria-invalid={Boolean(errors.email)}
              maxLength={254}
            />
            {errors.email ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="phone" className="label">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className={fieldClass(errors.phone)}
              aria-invalid={Boolean(errors.phone)}
              maxLength={20}
            />
            {errors.phone ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone}</p> : null}
          </div>

          <div>
            <label htmlFor="company" className="label">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              id="company"
              name="company"
              type="text"
              value={values.company}
              onChange={handleChange}
              placeholder="e.g. Meru Technosoft Pvt. Ltd."
              className={fieldClass(errors.company)}
              aria-invalid={Boolean(errors.company)}
              maxLength={120}
            />
            {errors.company ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.company}</p> : null}
          </div>

          <div>
            <label htmlFor="jobTitle" className="label">
              Job title
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              value={values.jobTitle}
              onChange={handleChange}
              placeholder="Head of Sales"
              className={fieldClass(errors.jobTitle)}
              maxLength={100}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-3">
          <div>
            <label htmlFor="source" className="label">
              Source <span className="text-red-500">*</span>
            </label>
            <select id="source" name="source" value={values.source} onChange={handleChange} className="input">
              {SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="label">
              Status <span className="text-red-500">*</span>
            </label>
            <select id="status" name="status" value={values.status} onChange={handleChange} className="input">
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="label">
              Priority
            </label>
            <select id="priority" name="priority" value={values.priority} onChange={handleChange} className="input">
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-3">
          <div>
            <label htmlFor="estimatedValue" className="label">
              Estimated value (₹)
            </label>
            <input
              id="estimatedValue"
              name="estimatedValue"
              type="number"
              min="0"
              step="1000"
              value={values.estimatedValue}
              onChange={handleChange}
              placeholder="50000"
              className={fieldClass(errors.estimatedValue)}
            />
            {errors.estimatedValue ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.estimatedValue}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="lastContactedAt" className="label">
              Last contacted
            </label>
            <input
              id="lastContactedAt"
              name="lastContactedAt"
              type="date"
              value={values.lastContactedAt}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="nextFollowUpAt" className="label">
              Next follow-up
            </label>
            <input
              id="nextFollowUpAt"
              name="nextFollowUpAt"
              type="date"
              value={values.nextFollowUpAt}
              onChange={handleChange}
              className="input"
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-line pt-4">
          <div>
            <label htmlFor="tags" className="label">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              value={values.tags}
              onChange={handleChange}
              placeholder="enterprise, demo, q3"
              className={fieldClass(errors.tags)}
            />
            <p className="mt-1 text-xs text-muted">Comma separated, up to 10 tags.</p>
            {errors.tags ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tags}</p> : null}
          </div>

          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={values.description}
              onChange={handleChange}
              placeholder="Context, requirements, next steps…"
              className={fieldClass(errors.description)}
              maxLength={2000}
            />
            {errors.description ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description}</p>
            ) : null}
          </div>
        </div>
      </form>
    </Modal>
  );
}
