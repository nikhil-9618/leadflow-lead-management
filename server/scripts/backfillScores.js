/**
 * One-off upgrade helper for LeadFlow V2.
 *
 * V2 stores a derived `score`/`scoreBand` on each lead. Records created before
 * V2 have no score, and defaults such as `priority` are only materialised on
 * save, so this script loads every lead and re-saves it — which runs the
 * schema's scoring hook and writes the missing defaults.
 *
 * Usage: npm run backfill:score
 */
require('dotenv').config();

const { connectDB, disconnectDB } = require('../config/db');
const Lead = require('../models/Lead');

const run = async () => {
  await connectDB();

  const leads = await Lead.find();
  let updated = 0;

  for (const lead of leads) {
    await lead.save();
    updated += 1;
  }

  console.log(`[backfill] Recalculated scores and defaults for ${updated} lead(s)`);
  await disconnectDB();
};

run().catch(async (error) => {
  console.error('[backfill] Failed:', error.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
