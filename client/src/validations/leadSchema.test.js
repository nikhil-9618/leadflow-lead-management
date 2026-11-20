import { describe, expect, it } from 'vitest';
import { emptyLead, parseTagsInput, validateLead, validateTask } from './leadSchema.js';

const valid = {
  ...emptyLead,
  name: 'Nikhil Sharma',
  email: 'nikhil@example.com',
  phone: '9876543210',
  company: 'Meru Technosoft',
};

describe('validateLead', () => {
  it('accepts a well-formed lead', () => {
    expect(validateLead(valid)).toEqual({});
  });

  it('flags every required field when empty', () => {
    const errors = validateLead(emptyLead);

    expect(Object.keys(errors).sort()).toEqual(['company', 'email', 'name', 'phone']);
  });

  it('rejects malformed email and phone values', () => {
    const errors = validateLead({ ...valid, email: 'nope', phone: '123' });

    expect(errors.email).toMatch(/valid email/i);
    expect(errors.phone).toMatch(/10-digit/i);
  });

  it('enforces length limits', () => {
    const errors = validateLead({
      ...valid,
      name: 'a',
      company: 'b',
      description: 'x'.repeat(2001),
      jobTitle: 'y'.repeat(101),
    });

    expect(errors.name).toMatch(/at least 2/);
    expect(errors.company).toMatch(/at least 2/);
    expect(errors.description).toMatch(/2000/);
    expect(errors.jobTitle).toMatch(/100/);
  });

  it('rejects invalid enum values and negative estimated value', () => {
    const errors = validateLead({ ...valid, source: 'Carrier pigeon', status: 'Won', estimatedValue: '-5' });

    expect(errors.source).toBeTruthy();
    expect(errors.status).toBeTruthy();
    expect(errors.estimatedValue).toMatch(/0 or more/);
  });

  it('limits tags to 10 items of 30 characters', () => {
    const many = Array.from({ length: 11 }, (_, index) => `tag${index}`).join(',');
    expect(validateLead({ ...valid, tags: many }).tags).toMatch(/at most 10/);

    const long = 'a'.repeat(31);
    expect(validateLead({ ...valid, tags: long }).tags).toMatch(/30 characters/);
  });
});

describe('parseTagsInput', () => {
  it('trims, de-duplicates and caps tags', () => {
    expect(parseTagsInput(' enterprise, demo ,Enterprise,, q3 ')).toEqual(['enterprise', 'demo', 'q3']);
    expect(parseTagsInput('')).toEqual([]);
  });
});

describe('validateTask', () => {
  it('requires a title and a due date', () => {
    const errors = validateTask({ title: '', dueDate: '', priority: 'Medium', status: 'Pending' });

    expect(errors.title).toBeTruthy();
    expect(errors.dueDate).toBeTruthy();
  });

  it('accepts a complete task', () => {
    const errors = validateTask({
      title: 'Call the lead',
      dueDate: '2026-05-01',
      dueTime: '09:30',
      priority: 'High',
      status: 'Pending',
    });

    expect(errors).toEqual({});
  });

  it('rejects an invalid time format', () => {
    const errors = validateTask({
      title: 'Call the lead',
      dueDate: '2026-05-01',
      dueTime: '25:99',
      priority: 'High',
      status: 'Pending',
    });

    expect(errors.dueTime).toBeTruthy();
  });
});
