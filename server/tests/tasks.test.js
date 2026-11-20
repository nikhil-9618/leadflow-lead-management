import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, startDatabase, stopDatabase, resetDatabase, validLead, isoDay } from './helpers.js';

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(resetDatabase);

const createTask = (payload) => request(app).post('/api/tasks').send(payload);

const baseTask = (overrides = {}) => ({
  title: 'Call back about pricing',
  dueDate: isoDay(0),
  priority: 'High',
  ...overrides,
});

describe('POST /api/tasks', () => {
  it('creates a task linked to a lead and logs it on the timeline', async () => {
    const lead = await request(app).post('/api/leads').send(validLead());

    const res = await createTask(baseTask({ lead: lead.body.data.id, dueTime: '14:30' }));

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Call back about pricing');
    expect(res.body.data.status).toBe('Pending');
    expect(res.body.data.lead).toBe(lead.body.data.id);

    const activities = await request(app).get(`/api/leads/${lead.body.data.id}/activities`);
    expect(activities.body.data.some((item) => item.action === 'task_created')).toBe(true);
  });

  it('rejects a missing title and an invalid due date', async () => {
    const res = await createTask({ dueDate: 'not-a-date' });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((error) => error.field);
    expect(fields).toContain('title');
    expect(fields).toContain('dueDate');
  });

  it('rejects an unknown lead reference', async () => {
    const res = await createTask(baseTask({ lead: '64b64c1f1f1f1f1f1f1f1f1f' }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lead does not exist/i);
  });
});

describe('GET /api/tasks', () => {
  it('groups tasks into today, upcoming and overdue scopes', async () => {
    await createTask(baseTask({ title: 'Due today', dueDate: isoDay(0) }));
    await createTask(baseTask({ title: 'Overdue task', dueDate: isoDay(-3) }));
    await createTask(baseTask({ title: 'Upcoming task', dueDate: isoDay(5) }));

    const all = await request(app).get('/api/tasks');
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(3);
    expect(all.body.counts).toMatchObject({ today: 1, upcoming: 1, overdue: 1, open: 3 });

    const today = await request(app).get('/api/tasks?scope=today');
    expect(today.body.data).toHaveLength(1);
    expect(today.body.data[0].title).toBe('Due today');

    const overdue = await request(app).get('/api/tasks?scope=overdue');
    expect(overdue.body.data[0].title).toBe('Overdue task');

    const upcoming = await request(app).get('/api/tasks?scope=upcoming');
    expect(upcoming.body.data[0].title).toBe('Upcoming task');
  });

  it('filters by lead and validates the lead id', async () => {
    const lead = await request(app).post('/api/leads').send(validLead());
    await createTask(baseTask({ lead: lead.body.data.id }));
    await createTask(baseTask({ title: 'Standalone task' }));

    const filtered = await request(app).get(`/api/tasks?lead=${lead.body.data.id}`);
    expect(filtered.body.data).toHaveLength(1);

    const invalid = await request(app).get('/api/tasks?lead=nope');
    expect(invalid.status).toBe(400);
  });
});

describe('task mutations', () => {
  it('updates a task', async () => {
    const created = await createTask(baseTask());

    const res = await request(app)
      .put(`/api/tasks/${created.body.data.id}`)
      .send({ title: 'Rescheduled call', priority: 'Low', dueDate: isoDay(2) });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Rescheduled call');
    expect(res.body.data.priority).toBe('Low');
  });

  it('marks a task complete and reopens it', async () => {
    const lead = await request(app).post('/api/leads').send(validLead());
    const created = await createTask(baseTask({ lead: lead.body.data.id }));

    const completed = await request(app).patch(`/api/tasks/${created.body.data.id}/complete`);
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('Completed');
    expect(completed.body.data.completedAt).toBeTruthy();

    const activities = await request(app).get(`/api/leads/${lead.body.data.id}/activities`);
    expect(activities.body.data.some((item) => item.action === 'task_completed')).toBe(true);

    const reopened = await request(app)
      .patch(`/api/tasks/${created.body.data.id}/complete`)
      .send({ completed: false });
    expect(reopened.body.data.status).toBe('Pending');
    expect(reopened.body.data.completedAt).toBeNull();
  });

  it('deletes a task and returns 404 afterwards', async () => {
    const created = await createTask(baseTask());

    await request(app).delete(`/api/tasks/${created.body.data.id}`).expect(200);
    await request(app).delete(`/api/tasks/${created.body.data.id}`).expect(404);
  });

  it('rejects a malformed task id', async () => {
    const res = await request(app).get('/api/tasks/nope');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid task id');
  });

  it('detaches tasks when their lead is deleted', async () => {
    const lead = await request(app).post('/api/leads').send(validLead());
    const created = await createTask(baseTask({ lead: lead.body.data.id }));

    await request(app).delete(`/api/leads/${lead.body.data.id}`).expect(200);

    const task = await request(app).get(`/api/tasks/${created.body.data.id}`);
    expect(task.body.data.lead).toBeNull();
  });
});
