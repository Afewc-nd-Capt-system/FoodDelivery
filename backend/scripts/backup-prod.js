#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

const uri = process.env.MONGODB_URI;
const stamp = process.argv[2] || new Date().toISOString().slice(0, 10);
const outDir = path.join(__dirname, '..', 'backups', stamp);
const collections = [
  'users',
  'orders',
  'restaurants',
  'deliverycompanies',
  'wallettransactions',
];

if (!uri) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

if (!uri.includes('/vibechops_prod')) {
  console.error('Refusing to back up: MONGODB_URI must contain /vibechops_prod.');
  process.exit(1);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;

  console.log(`Database: ${db.databaseName}`);
  console.log(`Output:   ${outDir}`);

  let total = 0;
  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, EJSON.stringify(docs, null, 2));
    console.log(`${name}: ${docs.length}`);
    total += docs.length;
  }

  console.log(`total: ${total}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`BACKUP_FAILED: ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
