const { CSV_REQUIRED_HEADERS, CSV_COLUMNS } = require('../config/leadConstants');

/** RFC4180-style CSV reader: handles quotes, escaped quotes, CRLF and a BOM. */
const parseCsv = (text) => {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      index += 1;
      continue;
    }
    if (char === '\r') {
      index += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      index += 1;
      continue;
    }

    field += char;
    index += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ''));
};

/** Normalises a header cell so "Job Title", "job_title" and "jobtitle" match. */
const normaliseHeader = (value) => String(value || '').replace(/[\s_-]/g, '').toLowerCase();

const CANONICAL_BY_NORMALISED = CSV_COLUMNS.reduce((acc, column) => {
  acc[normaliseHeader(column)] = column;
  return acc;
}, {});

/** A cell that begins with a formula character is prefixed so spreadsheets keep it as text. */
const escapeFormula = (value) => {
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

const quoteCell = (value) => {
  const text = escapeFormula(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Serialises leads to CSV. Values are protected against spreadsheet formula
 * injection, which is the documented risk of exporting user-supplied text.
 */
const leadsToCsv = (leads = []) => {
  const header = CSV_COLUMNS.map((column) => column).join(',');
  const lines = leads.map((lead) =>
    CSV_COLUMNS.map((column) => {
      const value = lead[column];
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return quoteCell(value.join(';'));
      if (value instanceof Date) return quoteCell(value.toISOString());
      if (column.endsWith('At') && typeof value === 'string') {
        const date = new Date(value);
        return quoteCell(Number.isNaN(date.getTime()) ? value : date.toISOString());
      }
      return quoteCell(value);
    }).join(',')
  );

  return [header, ...lines].join('\r\n');
};

/** Undoes the export-side formula guard so a round-trip keeps the original value. */
const stripFormulaGuard = (value) => {
  const text = String(value ?? '').trim();
  return /^'[=+\-@]/.test(text) ? text.slice(1) : text;
};

/**
 * Reads a CSV document into a header map plus raw row objects.
 * Returns { ok, error, headers, rows } without touching the database.
 */
const readLeadCsv = (text) => {
  const table = parseCsv(text);

  if (table.length === 0) {
    return { ok: false, error: 'The uploaded file is empty' };
  }

  const rawHeaders = table[0].map((cell) => stripFormulaGuard(cell));
  const headers = rawHeaders.map((cell) => CANONICAL_BY_NORMALISED[normaliseHeader(cell)] || null);

  const unknown = rawHeaders.filter((header) => !CANONICAL_BY_NORMALISED[normaliseHeader(header)]);
  const missing = CSV_REQUIRED_HEADERS.filter((required) => !headers.includes(required));

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      missing,
      unknown,
    };
  }

  const rows = table.slice(1).map((cells, rowIndex) => {
    const raw = {};
    headers.forEach((key, cellIndex) => {
      if (key) raw[key] = stripFormulaGuard(cells[cellIndex]);
    });
    return { rowNumber: rowIndex + 2, raw };
  });

  return { ok: true, headers, unknown: unknown.filter(Boolean), rows };
};

module.exports = {
  parseCsv,
  leadsToCsv,
  readLeadCsv,
  normaliseHeader,
  escapeFormula,
  stripFormulaGuard,
};
