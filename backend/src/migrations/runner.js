'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIGRATION_FILE = /^\d{3,}[-_].*\.js$/;
const LOCK_ID = 'migrations';
const DEFAULT_LOCK_TTL_MS = 2 * 60 * 1000;

function listMigrationFiles(dir = __dirname) {
  return fs.readdirSync(dir)
    .filter((name) => MIGRATION_FILE.test(name))
    .sort()
    .map((name) => {
      const migration = require(path.join(dir, name));
      if (typeof migration.up !== 'function') return null;
      return { name, up: migration.up };
    })
    .filter(Boolean);
}

let lastStatus = {
  pending: listMigrationFiles().length,
  lastRun: null,
  applied: 0,
  failed: 0,
  error: null,
};

function setStatus(patch) {
  lastStatus = { ...lastStatus, ...patch };
}

function getMigrationStatus() {
  return { ...lastStatus };
}

async function ensureIndexes(db) {
  await db.collection('migration_locks')
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch(() => {});
  await db.collection('migrations')
    .createIndex({ name: 1 }, { unique: true })
    .catch(() => {});
}

async function acquireLock(db, owner, ttlMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const locks = db.collection('migration_locks');

  try {
    await locks.insertOne({ _id: LOCK_ID, owner, expiresAt });
    return true;
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  // An expired lock (crashed instance) can be taken over immediately; the TTL
  // index is a second line of defence.
  const result = await locks.findOneAndUpdate(
    { _id: LOCK_ID, expiresAt: { $lt: now } },
    { $set: { owner, expiresAt } },
    { returnDocument: 'after' }
  );
  const updated = result && result.value ? result.value : result;
  return Boolean(updated && updated.owner === owner);
}

async function releaseLock(db, owner) {
  await db.collection('migration_locks').deleteOne({ _id: LOCK_ID, owner }).catch(() => {});
}

/**
 * Apply pending migrations once. The lock + journal make concurrent boots and
 * overlapping deploys safe. A failing migration is logged and left pending;
 * the caller keeps serving and the next boot retries.
 */
async function runPendingMigrations({
  db,
  files = null,
  lockTtlMs = DEFAULT_LOCK_TTL_MS,
  logger = console,
} = {}) {
  if (!db) throw new Error('A database connection is required to run migrations');

  const migrations = files || listMigrationFiles();
  const journal = db.collection('migrations');
  await ensureIndexes(db);

  const appliedDocs = await journal.find({}).toArray();
  const applied = new Set(appliedDocs.map((doc) => doc.name));
  const pendingFiles = migrations.filter((migration) => !applied.has(migration.name));

  if (!pendingFiles.length) {
    setStatus({ pending: 0, lastRun: new Date().toISOString(), applied: 0, failed: 0, error: null });
    return { acquired: true, applied: 0, failed: 0, pending: 0, error: null };
  }

  const owner = crypto.randomUUID();
  const acquired = await acquireLock(db, owner, lockTtlMs);
  if (!acquired) {
    setStatus({ pending: pendingFiles.length });
    logger.warn(`[migrations] another instance holds the migration lock; ${pendingFiles.length} pending`);
    return { acquired: false, applied: 0, failed: 0, pending: pendingFiles.length, error: null };
  }

  let appliedCount = 0;
  let failed = 0;
  let lastError = null;

  try {
    for (const migration of pendingFiles) {
      try {
        const result = await migration.up(db);
        await journal.insertOne({
          name: migration.name,
          appliedAt: new Date(),
          result: result === undefined ? null : result,
        });
        appliedCount += 1;
        logger.log(`[migrations] applied ${migration.name}`, result === undefined ? '' : result);
      } catch (error) {
        failed += 1;
        lastError = error.message;
        logger.error(`[migrations] ${migration.name} failed: ${error.message}`);
        // Leave the failed migration and the rest pending; retry next boot.
        break;
      }
    }
  } finally {
    await releaseLock(db, owner);
  }

  const remaining = Math.max(0, pendingFiles.length - appliedCount);
  setStatus({
    pending: remaining,
    lastRun: new Date().toISOString(),
    applied: appliedCount,
    failed,
    error: lastError,
  });
  return { acquired: true, applied: appliedCount, failed, pending: remaining, error: lastError };
}

// Never throws: a migration problem must not crash-loop the server.
async function runPendingMigrationsAtBoot(options = {}) {
  try {
    return await runPendingMigrations(options);
  } catch (error) {
    setStatus({ lastRun: new Date().toISOString(), failed: 1, error: error.message });
    console.error(`[migrations] boot run failed: ${error.message}`);
    return { acquired: false, applied: 0, failed: 1, pending: null, error: error.message };
  }
}

module.exports = {
  listMigrationFiles,
  runPendingMigrations,
  runPendingMigrationsAtBoot,
  getMigrationStatus,
  DEFAULT_LOCK_TTL_MS,
};
