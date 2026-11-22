/**
 * Migration runner (manual).
 *
 * Production no longer needs this: src/server.js runs pending migrations
 * automatically after Mongo connects, using the same lock/journal as here.
 *
 * Usage:
 *   node src/migrations/run.js          # apply pending migrations
 *   node src/migrations/run.js --list   # show status
 */
require('dotenv').config();

const mongoose = require('mongoose');
const runner = require('./runner');

async function main() {
  const listOnly = process.argv.includes('--list');
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery';

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const files = runner.listMigrationFiles();
  const applied = new Set(
    (await db.collection('migrations').find({}).toArray()).map((doc) => doc.name)
  );

  if (listOnly) {
    for (const file of files) {
      console.log(`[${applied.has(file.name) ? 'applied' : 'pending'}]  ${file.name}`);
    }
    console.log(`\n${files.filter((file) => !applied.has(file.name)).length} pending`);
  } else {
    const result = await runner.runPendingMigrations({ db });
    console.log(`[migrations] ${JSON.stringify(result)}`);
    if (result.failed) process.exitCode = 1;
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
