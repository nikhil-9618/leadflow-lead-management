const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');
const { readLeadCsv, leadsToCsv } = require('../utils/csv');
const {
  SOURCES,
  STATUSES,
  PRIORITIES,
  MAX_IMPORT_ROWS,
} = require('../config/leadConstants');
const { buildFilter, SORTS, MAX_EXPORT_ROWS } = require('./leadController');

/** Accepts either a raw text/csv body or JSON { csv }. */
const readCsvPayload = (req) => {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body.csv === 'string') return req.body.csv;
  return '';
};

const normaliseEnum = (value, allowed) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  return allowed.find((option) => option.toLowerCase() === text) || null;
};

const parseDate = (value) => {
  const text = String(value || '').trim();
  if (!text) return { value: null, error: null };
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return { value: null, error: `"${text}" is not a valid date` };
  return { value: date, error: null };
};

const parseTags = (value) =>
  String(value || '')
    .split(/[;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);

/**
 * Turns a raw CSV row into a lead payload, collecting every problem found.
 * Mongoose's own schema validation is reused so the import rules can never
 * diverge from the API rules.
 */
const normaliseRow = (raw) => {
  const errors = [];

  const source = normaliseEnum(raw.source, SOURCES);
  const status = raw.status ? normaliseEnum(raw.status, STATUSES) : 'New';
  const priority = raw.priority ? normaliseEnum(raw.priority, PRIORITIES) : 'Medium';

  if (!source) errors.push(`source must be one of: ${SOURCES.join(', ')}`);
  if (raw.status && !status) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  if (raw.priority && !priority) errors.push(`priority must be one of: ${PRIORITIES.join(', ')}`);

  const lastContacted = parseDate(raw.lastContactedAt);
  const nextFollowUp = parseDate(raw.nextFollowUpAt);
  if (lastContacted.error) errors.push(`lastContactedAt: ${lastContacted.error}`);
  if (nextFollowUp.error) errors.push(`nextFollowUpAt: ${nextFollowUp.error}`);

  let estimatedValue = 0;
  if (String(raw.estimatedValue || '').trim()) {
    const parsed = Number(String(raw.estimatedValue).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(parsed) || parsed < 0) errors.push('estimatedValue must be a positive number');
    else estimatedValue = parsed;
  }

  const payload = {
    name: String(raw.name || '').trim(),
    email: String(raw.email || '').trim().toLowerCase(),
    phone: String(raw.phone || '').trim(),
    company: String(raw.company || '').trim(),
    jobTitle: String(raw.jobTitle || '').trim(),
    description: String(raw.description || '').trim(),
    source: source || String(raw.source || '').trim(),
    status: status || 'New',
    priority: priority || 'Medium',
    tags: parseTags(raw.tags),
    estimatedValue,
    lastContactedAt: lastContacted.value,
    nextFollowUpAt: nextFollowUp.value,
  };

  const doc = new Lead(payload);
  const validation = doc.validateSync();
  if (validation) {
    Object.values(validation.errors).forEach((error) => errors.push(error.message));
  }

  return {
    payload,
    errors: [...new Set(errors)],
  };
};

/** Parses the uploaded document and classifies every row as valid, duplicate or invalid. */
const buildPreview = async (csv) => {
  const parsed = readLeadCsv(csv);

  if (!parsed.ok) {
    throw ApiError.badRequest(parsed.error, parsed.missing ? { missing: parsed.missing } : undefined);
  }

  if (parsed.rows.length === 0) {
    throw ApiError.badRequest('The CSV contains a header row but no lead rows');
  }

  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw ApiError.badRequest(`A single import is limited to ${MAX_IMPORT_ROWS} rows`);
  }

  const emails = parsed.rows.map((row) => String(row.raw.email || '').trim().toLowerCase()).filter(Boolean);
  const existing = await Lead.find({ email: { $in: emails } }).select('email').lean();
  const existingEmails = new Set(existing.map((lead) => lead.email));
  const seenInFile = new Set();

  const rows = parsed.rows.map(({ rowNumber, raw }) => {
    const { payload, errors } = normaliseRow(raw);
    let status = 'valid';

    if (errors.length > 0) {
      status = 'invalid';
    } else if (existingEmails.has(payload.email)) {
      status = 'duplicate';
      errors.push('A lead with this email already exists');
    } else if (seenInFile.has(payload.email)) {
      status = 'duplicate';
      errors.push('This email appears earlier in the same file');
    } else {
      seenInFile.add(payload.email);
    }

    return { rowNumber, values: payload, errors, status };
  });

  return {
    rows,
    unknownColumns: parsed.unknown || [],
    summary: {
      total: rows.length,
      valid: rows.filter((row) => row.status === 'valid').length,
      invalid: rows.filter((row) => row.status === 'invalid').length,
      duplicates: rows.filter((row) => row.status === 'duplicate').length,
    },
  };
};

/**
 * @route   POST /api/leads/import/preview
 * @desc    Validates a CSV and reports what would happen — writes nothing
 * @access  Public
 */
const previewImport = asyncHandler(async (req, res) => {
  const csv = readCsvPayload(req);

  if (!csv.trim()) {
    throw ApiError.badRequest('Upload a CSV file to preview the import');
  }

  const preview = await buildPreview(csv);

  res.status(200).json({ success: true, data: preview });
});

/**
 * @route   POST /api/leads/import
 * @desc    Imports the valid rows of a CSV, skipping duplicates
 * @access  Public
 */
const importLeads = asyncHandler(async (req, res) => {
  const csv = readCsvPayload(req);

  if (!csv.trim()) {
    throw ApiError.badRequest('Upload a CSV file to import');
  }

  const preview = await buildPreview(csv);
  const candidates = preview.rows.filter((row) => row.status === 'valid');

  if (!req.body?.confirm && candidates.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'Nothing to import',
      data: { imported: 0, skipped: preview.summary.duplicates, failed: [], summary: preview.summary },
    });
  }

  const failed = [];
  let imported = 0;

  for (const row of candidates) {
    try {
      const lead = await Lead.create(row.values);
      await logActivity({
        lead: lead._id,
        action: 'imported',
        description: `Lead imported from CSV (row ${row.rowNumber})`,
        metadata: { rowNumber: row.rowNumber, source: lead.source },
      });
      imported += 1;
    } catch (error) {
      const message = error.code === 11000 ? 'A lead with this email already exists' : error.message;
      failed.push({ rowNumber: row.rowNumber, email: row.values.email, message });
    }
  }

  res.status(imported > 0 ? 201 : 200).json({
    success: true,
    message: `Imported ${imported} lead${imported === 1 ? '' : 's'}`,
    data: {
      imported,
      skipped: preview.summary.duplicates,
      failed,
      summary: preview.summary,
    },
  });
});

/**
 * @route   GET /api/leads/export
 * @desc    CSV export of all, filtered or explicitly selected leads
 * @access  Public
 */
const exportLeads = asyncHandler(async (req, res) => {
  let filter = buildFilter(req.query);

  if (req.query.ids) {
    const ids = String(req.query.ids)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      throw ApiError.badRequest('Provide at least one lead id to export');
    }
    if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      throw ApiError.badRequest('One or more selected lead ids are invalid');
    }

    filter = { _id: { $in: ids } };
  }

  const leads = await Lead.find(filter)
    .sort(SORTS[req.query.sort] || SORTS.newest)
    .limit(MAX_EXPORT_ROWS);

  if (leads.length === 0) {
    throw ApiError.notFound('No leads match this export');
  }

  const csv = leadsToCsv(leads.map((lead) => lead.toJSON()));
  const filename = `leadflow-leads-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Total-Count', String(leads.length));
  // The BOM lets Excel read UTF-8 names correctly.
  res.status(200).send(`\uFEFF${csv}`);
});

module.exports = { previewImport, importLeads, exportLeads };
