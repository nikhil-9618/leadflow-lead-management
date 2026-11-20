import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { calculateLeadScore } from '../utils/scoring.js';
import { SCORING_RULES } from '../config/scoringRules.js';
import { app, startDatabase, stopDatabase, resetDatabase, validLead } from './helpers.js';

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(resetDatabase);

describe('rule-based scoring', () => {
  it('awards points only for satisfied rules', () => {
    const { score, scoreBand, breakdown } = calculateLeadScore({
      email: 'lead@example.com',
      phone: '9876543210',
      company: 'Acme Corp',
      source: 'Website',
      status: 'New',
      priority: 'Low',
    });

    expect(score).toBe(20);
    expect(scoreBand).toBe('Cold');
    expect(breakdown.find((rule) => rule.key === 'referral').earned).toBe(false);
    expect(breakdown.find((rule) => rule.key === 'validEmail').awarded).toBe(10);
  });

  it('classifies cold, warm and hot bands at the documented boundaries', () => {
    const cold = calculateLeadScore({ email: 'a@b.co', phone: '1', company: '', source: 'Website', status: 'New' });
    expect(cold.scoreBand).toBe('Cold');

    const warm = calculateLeadScore({
      email: 'a@b.co',
      phone: '9876543210',
      company: 'Acme Corp',
      source: 'Referral',
      status: 'New',
      priority: 'Low',
    });
    expect(warm.score).toBe(30);
    expect(warm.scoreBand).toBe('Warm');

    const hot = calculateLeadScore({
      email: 'a@b.co',
      phone: '9876543210',
      company: 'Acme Corp',
      source: 'Referral',
      status: 'Qualified',
      priority: 'High',
      estimatedValue: 1000,
      nextFollowUpAt: new Date(),
    });
    expect(hot.score).toBe(80);
    expect(hot.scoreBand).toBe('Hot');
  });

  it('never exceeds 100', () => {
    const result = calculateLeadScore({
      email: 'a@b.co',
      phone: '9876543210',
      company: 'Acme Corp',
      source: 'Referral',
      status: 'Qualified',
      priority: 'High',
      estimatedValue: 500,
      nextFollowUpAt: new Date(),
    });

    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('exposes the rule catalogue for explanation in the UI', async () => {
    const res = await request(app).get('/api/leads/scoring-rules');

    expect(res.status).toBe(200);
    expect(res.body.data.rules).toHaveLength(SCORING_RULES.length);
    expect(res.body.data.bands.map((band) => band.band)).toEqual(['Cold', 'Warm', 'Hot']);
  });

  it('recalculates the stored score whenever relevant fields change', async () => {
    const created = await request(app).post('/api/leads').send(validLead());
    expect(created.body.data.score).toBe(20);

    const updated = await request(app)
      .put(`/api/leads/${created.body.data.id}`)
      .send({ source: 'Referral', status: 'Qualified', priority: 'High' });

    expect(updated.body.data.score).toBe(65);
    expect(updated.body.data.scoreBand).toBe('Hot');

    const pipeline = await request(app)
      .patch(`/api/leads/${created.body.data.id}/status`)
      .send({ status: 'Lost' });

    expect(pipeline.body.data.score).toBe(45);
    expect(pipeline.body.data.scoreBand).toBe('Warm');
  });
});
