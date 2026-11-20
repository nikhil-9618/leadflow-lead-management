import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:5173';

const app = require('../app');

let mongod;

export const startDatabase = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

export const stopDatabase = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

export const resetDatabase = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

let counter = 0;

export const uniqueEmail = (prefix = 'lead') => {
  counter += 1;
  return `${prefix}.${counter}.${Date.now()}@example.com`;
};

export const validLead = (overrides = {}) => ({
  name: 'Nikhil Sharma',
  email: uniqueEmail(),
  phone: '9876543210',
  company: 'Meru Technosoft Pvt. Ltd.',
  source: 'Website',
  ...overrides,
});

export const createLead = async (overrides = {}) => {
  const res = await request(app).post('/api/leads').send(validLead(overrides));
  return res.body.data;
};

/** Formats a date offset (in days) as YYYY-MM-DD, used by date-scoped tests. */
export const isoDay = (offsetDays = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

export { app, mongoose };
export { default as request } from 'supertest';
