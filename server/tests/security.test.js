import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, startDatabase, stopDatabase, resetDatabase, validLead } from './helpers.js';

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(resetDatabase);

describe('input safety', () => {
  it('rejects a NoSQL operator injected through the body', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ ...validLead(), email: { $ne: null } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a NoSQL operator injected through the query string', async () => {
    const res = await request(app).get('/api/leads?status[$ne]=New');
    expect(res.status).toBe(400);
  });

  it('treats a regular-expression search as a literal string', async () => {
    await request(app).post('/api/leads').send(validLead({ name: 'Anita Desai' }));

    const wildcard = await request(app).get('/api/leads?search=.*');
    expect(wildcard.status).toBe(200);
    expect(wildcard.body.data).toHaveLength(0);

    const anchored = await request(app).get('/api/leads?search=Anita.*');
    expect(anchored.body.data).toHaveLength(0);
  });

  it('stores XSS payloads as plain text rather than trusting them', async () => {
    const payload = '<script>alert("xss")</script>';
    const created = await request(app)
      .post('/api/leads')
      .send(validLead({ name: payload, company: '<img src=x onerror=alert(1)>' }));

    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe(payload);

    const list = await request(app).get('/api/leads');
    expect(list.headers['content-type']).toMatch(/application\/json/);
    expect(list.body.data[0].name).toBe(payload);
  });

  it('rejects malformed JSON with a 400 and a safe message', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Content-Type', 'application/json')
      .send('{"name": "broken"');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Malformed JSON/i);
    expect(res.body.stack).toBeUndefined();
  });

  it('rejects an oversized JSON body', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send(validLead({ description: 'a'.repeat(300 * 1024) }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too large/i);
  });

  it('rejects an unexpected Origin through CORS', async () => {
    const res = await request(app).get('/api/leads').set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not allowed by CORS/i);
  });

  it('allows the configured client origin', async () => {
    const res = await request(app).get('/api/leads').set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('sets hardened security headers', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns a consistent 404 envelope for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false });
    expect(res.body.message).toMatch(/Route not found/);
  });

  it('does not leak stack traces for unexpected errors', async () => {
    const res = await request(app).get('/api/leads/64b64c1f1f1f1f1f1f1f1f1f/activities');
    expect(res.status).toBe(404);
    expect(res.body.stack).toBeUndefined();
  });
});

describe('activity immutability', () => {
  it('refuses to modify a stored activity record', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    const Activity = require('../models/Activity');

    const activity = await Activity.findOne({ lead: created.body.data.id });
    activity.description = 'tampered';

    await expect(activity.save()).rejects.toThrow(/immutable/i);
  });

  it('does not expose endpoints to edit or delete activities', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    const Activity = require('../models/Activity');
    const activity = await Activity.findOne({ lead: created.body.data.id });

    await request(app).put(`/api/leads/${created.body.data.id}/activities`).expect(404);
    await request(app).delete(`/api/leads/${created.body.data.id}/activities`).expect(404);
    expect(activity).toBeTruthy();
  });
});
