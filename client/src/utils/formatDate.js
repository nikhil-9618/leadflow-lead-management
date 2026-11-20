const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' });

const calendarFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

/**
 * Date-only values (task due dates, scheduled follow-ups) are stored at UTC
 * midnight. Formatting them in the viewer's timezone shifts them back a day for
 * anyone behind UTC, so the calendar date is always rendered in UTC.
 */
export function formatCalendarDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return calendarFormatter.format(date);
}

/** The calendar date of a value as local midnight, so day maths ignores timezone drift. */
export function toCalendarDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** True when a date-only value falls before today's calendar date. */
export function isPastCalendarDate(value) {
  const day = toCalendarDay(value);
  if (!day) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return day < today;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function formatMonth(value) {
  if (!value) return '';
  const date = new Date(`${value}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return monthFormatter.format(date);
}

export function formatShortDay(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date);
}

/** Converts a value into the YYYY-MM-DD shape an <input type="date"> expects. */
export function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function formatCurrency(value) {
  if (!value) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Human relative label used for due dates (Today, Tomorrow, Overdue …). */
export function describeDueDate(value) {
  const target = toCalendarDay(value);
  if (!target) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  return `In ${diffDays} days`;
}
