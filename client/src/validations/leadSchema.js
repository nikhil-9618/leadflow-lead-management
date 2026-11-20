export const SOURCES = ['Website', 'LinkedIn', 'Referral', 'Social Media', 'Advertisement', 'Other'];
export const STATUSES = ['New', 'Contacted', 'Qualified', 'Lost'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

export const PHONE_REGEX = /^(\+?[0-9]{1,3}[\s-]?)?[0-9]{10}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emptyLead = {
  name: '',
  email: '',
  phone: '',
  company: '',
  jobTitle: '',
  source: 'Website',
  status: 'New',
  priority: 'Medium',
  description: '',
  tags: '',
  estimatedValue: '',
  lastContactedAt: '',
  nextFollowUpAt: '',
};

/**
 * Client-side mirror of the API rules, for instant feedback.
 * The backend always re-validates; this never replaces it.
 */
export function validateLead(values) {
  const errors = {};
  const name = (values.name || '').trim();
  const email = (values.email || '').trim();
  const phone = (values.phone || '').trim();
  const company = (values.company || '').trim();
  const jobTitle = (values.jobTitle || '').trim();
  const description = (values.description || '').trim();

  if (!name) errors.name = 'Full name is required';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (name.length > 80) errors.name = 'Name cannot exceed 80 characters';

  if (!email) errors.email = 'Email address is required';
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address, e.g. name@company.com';

  if (!phone) errors.phone = 'Phone number is required';
  else if (!PHONE_REGEX.test(phone))
    errors.phone = 'Enter a valid 10-digit number, optionally with country code (e.g. +91 9876543210)';

  if (!company) errors.company = 'Company name is required';
  else if (company.length < 2) errors.company = 'Company must be at least 2 characters';
  else if (company.length > 120) errors.company = 'Company cannot exceed 120 characters';

  if (jobTitle.length > 100) errors.jobTitle = 'Job title cannot exceed 100 characters';
  if (description.length > 2000) errors.description = 'Description cannot exceed 2000 characters';

  if (!SOURCES.includes(values.source)) errors.source = 'Select a valid lead source';
  if (!STATUSES.includes(values.status)) errors.status = 'Select a valid lead status';
  if (!PRIORITIES.includes(values.priority)) errors.priority = 'Select a valid priority';

  const tags = String(values.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length > 10) errors.tags = 'Use at most 10 tags';
  if (tags.some((tag) => tag.length > 30)) errors.tags = 'Each tag must be 30 characters or fewer';

  if (String(values.estimatedValue || '').trim()) {
    const value = Number(values.estimatedValue);
    if (Number.isNaN(value) || value < 0) errors.estimatedValue = 'Estimated value must be 0 or more';
  }

  return errors;
}

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

export const emptyTask = {
  title: '',
  description: '',
  lead: '',
  dueDate: '',
  dueTime: '',
  priority: 'Medium',
  status: 'Pending',
};

export function validateTask(values) {
  const errors = {};
  const title = (values.title || '').trim();
  const description = (values.description || '').trim();

  if (!title) errors.title = 'Task title is required';
  else if (title.length < 2) errors.title = 'Title must be at least 2 characters';
  else if (title.length > 120) errors.title = 'Title cannot exceed 120 characters';

  if (description.length > 1000) errors.description = 'Description cannot exceed 1000 characters';

  if (!values.dueDate) errors.dueDate = 'Due date is required';
  else if (Number.isNaN(new Date(values.dueDate).getTime())) errors.dueDate = 'Enter a valid due date';

  if (values.dueTime && !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(values.dueTime)) {
    errors.dueTime = 'Due time must use the HH:mm format';
  }

  if (!PRIORITIES.includes(values.priority)) errors.priority = 'Select a valid priority';
  if (!TASK_STATUSES.includes(values.status)) errors.status = 'Select a valid task status';

  return errors;
}

/** "a, b, c" -> ['a','b','c'] with de-duplication, matching the API's normalisation. */
export const parseTagsInput = (value) => {
  const seen = new Set();
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
};
