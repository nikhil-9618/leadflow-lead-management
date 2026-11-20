import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  app,
  startDatabase,
  stopDatabase,
  resetDatabase,
  uniqueEmail,
  validLead,
} from './helpers.js';

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(resetDatabase);

describe('GET /api/health', () => {
  it('reports a connected database', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.status).toBe('ok');
  });
});

describe('POST /api/leads', () => {
  it('creates a lead with defaults and a computed score', async () => {
    const res = await request(app).post('/api/leads').send(validLead());

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Lead created successfully');
    expect(res.body.data).toMatchObject({
      name: 'Nikhil Sharma',
      status: 'New',
      priority: 'Medium',
      tags: [],
      estimatedValue: 0,
    });
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.score).toBe(20);
    expect(res.body.data.scoreBand).toBe('Cold');
    expect(res.body.data.scoreBreakdown).toHaveLength(8);
  });

  it('accepts the optional V2 fields and scores a hot lead', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send(
        validLead({
          source: 'Referral',
          status: 'Qualified',
          priority: 'High',
          jobTitle: 'Head of Sales',
          description: 'Wants a demo next week',
          tags: ['enterprise', 'demo'],
          estimatedValue: 250000,
          lastContactedAt: '2026-01-10',
          nextFollowUpAt: '2026-02-01',
        })
      );

    expect(res.status).toBe(201);
    expect(res.body.data.jobTitle).toBe('Head of Sales');
    expect(res.body.data.tags).toEqual(['enterprise', 'demo']);
    expect(res.body.data.estimatedValue).toBe(250000);
    expect(res.body.data.score).toBe(80);
    expect(res.body.data.scoreBand).toBe('Hot');
  });

  it('rejects a missing required field with field-level errors', async () => {
    const res = await request(app).post('/api/leads').send({ ...validLead(), name: undefined });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((error) => error.field === 'name')).toBe(true);
  });

  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/leads').send(validLead({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    expect(res.body.errors.some((error) => error.field === 'email')).toBe(true);
  });

  it('rejects an invalid phone number', async () => {
    const res = await request(app).post('/api/leads').send(validLead({ phone: '12345' }));

    expect(res.status).toBe(400);
    expect(res.body.errors.some((error) => error.field === 'phone')).toBe(true);
  });

  it('rejects an invalid status and priority', async () => {
    const res = await request(app).post('/api/leads').send(validLead({ status: 'Won', priority: 'Urgent' }));

    expect(res.status).toBe(400);
    expect(res.body.errors.some((error) => error.field === 'status')).toBe(true);
    expect(res.body.errors.some((error) => error.field === 'priority')).toBe(true);
  });

  it('returns 409 for a duplicate email', async () => {
    const lead = validLead({ email: uniqueEmail('duplicate') });
    await request(app).post('/api/leads').send(lead).expect(201);

    const res = await request(app).post('/api/leads').send({ ...lead, name: 'Another Person' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('normalises the email to lowercase', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send(validLead({ email: 'Mixed.Case@Example.com' }));

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('mixed.case@example.com');
  });
});

describe('GET /api/leads', () => {
  it('lists leads newest first with pagination metadata', async () => {
    await request(app).post('/api/leads').send(validLead({ name: 'Older Lead' }));
    await request(app).post('/api/leads').send(validLead({ name: 'Newer Lead' }));

    const res = await request(app).get('/api/leads');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('Newer Lead');
    expect(res.body.pagination).toMatchObject({ total: 2, page: 1, limit: 10, totalPages: 1 });
  });

  it('searches name, email, phone and company case-insensitively', async () => {
    await request(app)
      .post('/api/leads')
      .send(validLead({ name: 'Anita Desai', company: 'Acme Corp', email: uniqueEmail('anita') }));
    await request(app).post('/api/leads').send(validLead({ name: 'Rahul Verma', company: 'Globex' }));

    const byName = await request(app).get('/api/leads?search=ANITA');
    expect(byName.body.data).toHaveLength(1);
    expect(byName.body.data[0].name).toBe('Anita Desai');

    const byCompany = await request(app).get('/api/leads?search=globex');
    expect(byCompany.body.data).toHaveLength(1);

    const byEmail = await request(app).get('/api/leads?search=anita.');
    expect(byEmail.body.data).toHaveLength(1);

    const byPhone = await request(app).get('/api/leads?search=9876543210');
    expect(byPhone.body.data).toHaveLength(2);
  });

  it('combines status, source and priority filters', async () => {
    await request(app)
      .post('/api/leads')
      .send(validLead({ status: 'Qualified', source: 'Referral', priority: 'High' }));
    await request(app)
      .post('/api/leads')
      .send(validLead({ status: 'Qualified', source: 'Website', priority: 'High' }));
    await request(app)
      .post('/api/leads')
      .send(validLead({ status: 'New', source: 'Referral', priority: 'Low' }));

    const res = await request(app).get('/api/leads?status=Qualified&source=Referral&priority=High');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it('filters by creation date range', async () => {
    await request(app).post('/api/leads').send(validLead());

    const inRange = await request(app).get('/api/leads?dateFrom=2000-01-01&dateTo=2000-01-02');
    expect(inRange.body.data).toHaveLength(0);

    const today = new Date().toISOString().slice(0, 10);
    const todayRange = await request(app).get(`/api/leads?dateFrom=${today}&dateTo=${today}`);
    expect(todayRange.body.data).toHaveLength(1);
  });

  it('sorts oldest first and by score', async () => {
    await request(app).post('/api/leads').send(validLead({ name: 'First Lead' }));
    await request(app)
      .post('/api/leads')
      .send(validLead({ name: 'Hot Lead', source: 'Referral', status: 'Qualified', priority: 'High' }));

    const oldest = await request(app).get('/api/leads?sort=oldest');
    expect(oldest.body.data[0].name).toBe('First Lead');

    const byScore = await request(app).get('/api/leads?sort=score');
    expect(byScore.body.data[0].name).toBe('Hot Lead');
  });

  it('paginates through results', async () => {
    for (let index = 0; index < 12; index += 1) {
      await request(app).post('/api/leads').send(validLead({ name: `Lead ${index}` }));
    }

    const page1 = await request(app).get('/api/leads?page=1&limit=10');
    const page2 = await request(app).get('/api/leads?page=2&limit=10');

    expect(page1.body.data).toHaveLength(10);
    expect(page2.body.data).toHaveLength(2);
    expect(page1.body.pagination).toMatchObject({ total: 12, totalPages: 2, hasNextPage: true });
    expect(page2.body.pagination.hasPrevPage).toBe(true);
  });

  it('rejects an out-of-range limit and an invalid sort', async () => {
    const res = await request(app).get('/api/leads?limit=500');
    expect(res.status).toBe(400);

    const badSort = await request(app).get('/api/leads?sort=random');
    expect(badSort.status).toBe(400);
  });
});

describe('GET /api/leads/stats', () => {
  it('aggregates accurate dashboard statistics and chart series', async () => {
    await request(app).post('/api/leads').send(validLead({ status: 'New', source: 'Website' }));
    await request(app).post('/api/leads').send(validLead({ status: 'Contacted', source: 'LinkedIn' }));
    await request(app).post('/api/leads').send(validLead({ status: 'Qualified', source: 'Referral' }));
    await request(app)
      .post('/api/leads')
      .send(validLead({ status: 'Qualified', source: 'Website', estimatedValue: 5000 }));

    const res = await request(app).get('/api/leads/stats');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: 4,
      new: 1,
      contacted: 1,
      qualified: 2,
      lost: 0,
      createdThisMonth: 4,
      conversionRate: 50,
      totalEstimatedValue: 5000,
    });

    expect(res.body.data.charts.byStatus).toHaveLength(4);
    expect(res.body.data.charts.bySource).toHaveLength(6);
    expect(res.body.data.charts.dailyTrend).toHaveLength(30);
    expect(res.body.data.charts.monthlyTrend).toHaveLength(12);
    expect(res.body.data.recentLeads).toHaveLength(4);
    expect(res.body.data.charts.byStatus.find((row) => row.name === 'Qualified').value).toBe(2);
  });

  it('returns zeros for an empty database', async () => {
    const res = await request(app).get('/api/leads/stats');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.conversionRate).toBe(0);
    expect(res.body.data.charts.dailyTrend.every((point) => point.count === 0)).toBe(true);
  });

  it('honours date filters', async () => {
    await request(app).post('/api/leads').send(validLead());

    const res = await request(app).get('/api/leads/stats?dateFrom=2000-01-01&dateTo=2000-01-02');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });
});

describe('GET /api/leads/:id', () => {
  it('returns one lead with its score breakdown', async () => {
    const created = await request(app).post('/api/leads').send(validLead());

    const res = await request(app).get(`/api/leads/${created.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
    expect(res.body.data.scoreBreakdown.find((rule) => rule.key === 'validEmail').earned).toBe(true);
  });

  it('rejects a malformed id with 400', async () => {
    const res = await request(app).get('/api/leads/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid lead id');
  });

  it('returns 404 for a well-formed but unknown id', async () => {
    const res = await request(app).get('/api/leads/64b64c1f1f1f1f1f1f1f1f1f');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/leads/:id', () => {
  it('updates a subset of fields and records activity', async () => {
    const created = await request(app).post('/api/leads').send(validLead());

    const res = await request(app)
      .put(`/api/leads/${created.body.data.id}`)
      .send({ company: 'Updated Corp', priority: 'High' });

    expect(res.status).toBe(200);
    expect(res.body.data.company).toBe('Updated Corp');
    expect(res.body.data.priority).toBe('High');
    expect(res.body.data.score).toBeGreaterThan(created.body.data.score);

    const activities = await request(app).get(`/api/leads/${created.body.data.id}/activities`);
    expect(activities.body.data.length).toBeGreaterThanOrEqual(2);
    expect(activities.body.data.some((item) => item.action === 'updated')).toBe(true);
  });

  it('records a status change separately in the timeline', async () => {
    const created = await request(app).post('/api/leads').send(validLead());

    await request(app)
      .put(`/api/leads/${created.body.data.id}`)
      .send({ status: 'Qualified' })
      .expect(200);

    const activities = await request(app).get(`/api/leads/${created.body.data.id}/activities`);
    const statusChange = activities.body.data.find((item) => item.action === 'status_changed');

    expect(statusChange).toBeTruthy();
    expect(statusChange.description).toMatch(/New to Qualified/);
  });

  it('rejects an empty update body', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    const res = await request(app).put(`/api/leads/${created.body.data.id}`).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least one field/i);
  });

  it('rejects invalid updated values', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    const res = await request(app).put(`/api/leads/${created.body.data.id}`).send({ email: 'broken' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when updating to another lead email', async () => {
    const first = await request(app).post('/api/leads').send(validLead());
    const second = await request(app).post('/api/leads').send(validLead());

    const res = await request(app)
      .put(`/api/leads/${second.body.data.id}`)
      .send({ email: first.body.data.email });

    expect(res.status).toBe(409);
  });

  it('returns 404 for an unknown lead', async () => {
    const res = await request(app).put('/api/leads/64b64c1f1f1f1f1f1f1f1f1f').send({ company: 'Nope' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/leads/:id/status', () => {
  it('moves a lead between pipeline stages', async () => {
    const created = await request(app).post('/api/leads').send(validLead());

    const res = await request(app)
      .patch(`/api/leads/${created.body.data.id}/status`)
      .send({ status: 'Contacted' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Contacted');

    const activities = await request(app).get(`/api/leads/${created.body.data.id}/activities`);
    expect(activities.body.data[0].action).toBe('status_changed');
  });

  it('rejects an invalid stage', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    const res = await request(app)
      .patch(`/api/leads/${created.body.data.id}/status`)
      .send({ status: 'Archived' });

    expect(res.status).toBe(400);
  });
});

describe('notes and activity history', () => {
  it('adds a note and exposes it on the lead', async () => {
    const created = await request(app).post('/api/leads').send(validLead());

    const note = await request(app)
      .post(`/api/leads/${created.body.data.id}/notes`)
      .send({ text: 'Called and left a voicemail.' });

    expect(note.status).toBe(201);
    expect(note.body.data.text).toBe('Called and left a voicemail.');

    const lead = await request(app).get(`/api/leads/${created.body.data.id}`);
    expect(lead.body.data.notes).toHaveLength(1);

    const activities = await request(app).get(`/api/leads/${created.body.data.id}/activities`);
    expect(activities.body.data.some((item) => item.action === 'note_added')).toBe(true);
  });

  it('rejects an empty note', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    const res = await request(app).post(`/api/leads/${created.body.data.id}/notes`).send({ text: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for activities of an unknown lead', async () => {
    const res = await request(app).get('/api/leads/64b64c1f1f1f1f1f1f1f1f1f/activities');
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/leads/:id', () => {
  it('deletes a lead and keeps its audit trail', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    const id = created.body.data.id;

    const res = await request(app).delete(`/api/leads/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);

    await request(app).get(`/api/leads/${id}`).expect(404);

    const Activity = require('../models/Activity');
    const deleted = await Activity.findOne({ lead: id, action: 'deleted' });
    expect(deleted).toBeTruthy();
  });

  it('returns 404 when deleting twice', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    await request(app).delete(`/api/leads/${created.body.data.id}`).expect(200);
    await request(app).delete(`/api/leads/${created.body.data.id}`).expect(404);
  });
});
