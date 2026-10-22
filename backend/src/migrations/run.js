/**
 * Minimal migration runner.
 *
 * Usage:
 *   node src/migrations/run.js          # apply pending migrations
 *   node src/migrations/run.js --list   # show status
 *
 * Applied migrations are recorded in the `migrations` collection, so re-running
 * is safe. Each migration module exports `up(db)` and optionally `down(db)`.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MIGRATION_FILE = /^\d{3,}[-_].*\.js$/;

async function main() {
  const listOnly = process.argv.includes('--list');
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery';

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const journal = db.collection('migrations');

  const files = fs
    .readdirSync(__dirname)
    .filter((file) => MIGRATION_FILE.test(file))
    .sort();

  const applied = new Set((await journal.find({}).toArray()).map((doc) => doc.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[skip]  ${file}`);
      continue;
    }

    console.log(`[${listOnly ? 'pending' : 'run'}]  ${file}`);
    if (listOnly) continue;

    const migration = require(path.join(__dirname, file));
    if (typeof migration.up !== 'function') {
      throw new Error(`${file} does not export an up(db) function`);
    }

    const result = await migration.up(db);
    await journal.insertOne({ name: file, appliedAt: new Date(), result: result ?? null });
    console.log(`[done]  ${file}`, result ? JSON.stringify(result) : '');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
