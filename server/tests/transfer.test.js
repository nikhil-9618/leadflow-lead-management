import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, startDatabase, stopDatabase, resetDatabase, validLead, uniqueEmail } from './helpers.js';

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(resetDatabase);

const postCsv = (path, csv) =>
  request(app).post(path).set('Content-Type', 'text/csv').send(csv);

const HEADER = 'name,email,phone,company,source,status,priority';

describe('GET /api/leads/export', () => {
  it('exports all leads with CSV headers', async () => {
    await request(app).post('/api/leads').send(validLead({ name: 'Anita Desai' }));
    await request(app).post('/api/leads').send(validLead({ name: 'Rahul Verma' }));

    const res = await request(app).get('/api/leads/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="leadflow-leads-/);
    expect(res.headers['x-total-count']).toBe('2');

    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toContain('name,email,phone,company,source');
    expect(lines).toHaveLength(3);
  });

  it('exports only the filtered leads', async () => {
    await request(app).post('/api/leads').send(validLead({ name: 'Qualified One', status: 'Qualified' }));
    await request(app).post('/api/leads').send(validLead({ name: 'New One', status: 'New' }));

    const res = await request(app).get('/api/leads/export?status=Qualified');

    expect(res.status).toBe(200);
    expect(res.headers['x-total-count']).toBe('1');
    expect(res.text).toContain('Qualified One');
    expect(res.text).not.toContain('New One');
  });

  it('exports only selected ids', async () => {
    const first = await request(app).post('/api/leads').send(validLead({ name: 'Selected Lead' }));
    await request(app).post('/api/leads').send(validLead({ name: 'Not Selected' }));

    const res = await request(app).get(`/api/leads/export?ids=${first.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Selected Lead');
    expect(res.text).not.toContain('Not Selected');
  });

  it('rejects invalid selected ids', async () => {
    const res = await request(app).get('/api/leads/export?ids=not-an-id');
    expect(res.status).toBe(400);
  });

  it('returns 404 when nothing matches the export', async () => {
    const res = await request(app).get('/api/leads/export?status=Lost');
    expect(res.status).toBe(404);
  });

  it('neutralises spreadsheet formula injection', async () => {
    await request(app)
      .post('/api/leads')
      .send(validLead({ name: '=HYPERLINK("http://evil.example","click")', company: '@SUM(1+1)', phone: '+919876543210' }));

    const res = await request(app).get('/api/leads/export');

    expect(res.status).toBe(200);
    expect(res.text).toContain('"\'=HYPERLINK');
    expect(res.text).toContain("'@SUM(1+1)");
    // The phone keeps its country code but is guarded in the file.
    expect(res.text).toContain("'+919876543210");
    expect(res.text).not.toMatch(/(^|,)=HYPERLINK/);
  });

  it('round-trips a phone number with a country code through export and import', async () => {
    await request(app).post('/api/leads').send(validLead({ phone: '+919876543210' }));
    const exported = await request(app).get('/api/leads/export');
    await resetDatabase();

    const result = await postCsv('/api/leads/import', exported.text);

    expect(result.status).toBe(201);
    expect(result.body.data.imported).toBe(1);

    const list = await request(app).get('/api/leads');
    expect(list.body.data[0].phone).toBe('+919876543210');
  });
});

describe('POST /api/leads/import/preview', () => {
  it('classifies valid rows and normalises values', async () => {
    const csv = `${HEADER}
Anita Desai,anita@example.com,9876543210,Acme Corp,website,qualified,high`;

    const res = await postCsv('/api/leads/import/preview', csv);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({ total: 1, valid: 1, invalid: 0, duplicates: 0 });
    expect(res.body.data.rows[0].values).toMatchObject({
      name: 'Anita Desai',
      email: 'anita@example.com',
      source: 'Website',
      status: 'Qualified',
      priority: 'High',
    });
  });

  it('reports invalid rows with messages', async () => {
    const csv = `${HEADER}
,not-an-email,123,,Nope,InvalidStage,Urgent`;

    const res = await postCsv('/api/leads/import/preview', csv);
    const row = res.body.data.rows[0];

    expect(row.status).toBe('invalid');
    expect(row.errors.length).toBeGreaterThan(2);
    expect(res.body.data.summary.invalid).toBe(1);
  });

  it('detects duplicates against the database and within the file', async () => {
    const email = uniqueEmail('existing');
    await request(app).post('/api/leads').send(validLead({ email }));

    const csv = `${HEADER}
Existing Lead,${email},9876543210,Acme Corp,Website,New,Medium
Duplicate Lead,${email},9876543210,Acme Corp,Website,New,Medium
Same File,same.file@example.com,9876543210,Acme Corp,Website,New,Medium
Same File Twice,same.file@example.com,9876543210,Acme Corp,Website,New,Medium`;

    const res = await postCsv('/api/leads/import/preview', csv);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.duplicates).toBe(3);
    expect(res.body.data.summary.valid).toBe(1);
  });

  it('rejects a file without required headers', async () => {
    const res = await postCsv('/api/leads/import/preview', 'name,email\nAnita,anita@example.com');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Missing required column/);
  });

  it('rejects an empty upload', async () => {
    const res = await postCsv('/api/leads/import/preview', '  ');
    expect(res.status).toBe(400);
  });

  it('rejects a header-only file', async () => {
    const res = await postCsv('/api/leads/import/preview', HEADER);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no lead rows/i);
  });
});

describe('POST /api/leads/import', () => {
  it('imports valid rows, skips duplicates and reports failures', async () => {
    const csv = `${HEADER}
Anita Desai,anita@example.com,9876543210,Acme Corp,Referral,New,High
Rahul Verma,rahul@example.com,9876543211,Globex,Website,Contacted,Medium
Broken Row,broken-email,123,Globex,Website,Contacted,Medium`;

    const res = await postCsv('/api/leads/import', csv);

    expect(res.status).toBe(201);
    expect(res.body.data.imported).toBe(2);
    expect(res.body.data.summary.invalid).toBe(1);

    const list = await request(app).get('/api/leads');
    expect(list.body.pagination.total).toBe(2);

    const imported = list.body.data.find((lead) => lead.email === 'anita@example.com');
    expect(imported.source).toBe('Referral');
    expect(imported.score).toBeGreaterThan(0);

    const activities = await request(app).get(`/api/leads/${imported.id}/activities`);
    expect(activities.body.data.some((item) => item.action === 'imported')).toBe(true);
  });

  it('returns nothing-to-import when every row is a duplicate', async () => {
    const email = uniqueEmail('dup');
    await request(app).post('/api/leads').send(validLead({ email }));

    const csv = `${HEADER}
Existing,${email},9876543210,Acme Corp,Website,New,Medium`;

    const res = await postCsv('/api/leads/import', csv);

    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(0);
    expect(res.body.data.skipped).toBe(1);
  });

  it('accepts JSON payloads as well as raw CSV', async () => {
    const csv = `${HEADER}
Json Import,json@example.com,9876543210,Acme Corp,Website,New,Medium`;

    const res = await request(app)
      .post('/api/leads/import')
      .send({ csv, confirm: true });

    expect(res.status).toBe(201);
    expect(res.body.data.imported).toBe(1);
  });
});
