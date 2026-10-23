'use strict';

// Rotates passwords for accounts created by the development seed data.
// Run from the backend directory with MONGODB_URI set. By default passwords are
// printed once; pass `--output <path>` to write them to an untracked file
// instead. Never write this output to a tracked file.
require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../src/models/User');

const SEEDED_EMAILS = [
  'admin@vibechops.ng',
  'demo@vibechops.ng',
  'vendor@vibechops.ng',
  'restaurant@vibechops.ng',
  'rider@vibechops.ng',
  'delivery@vibechops.ng',
  'admin@fooddelivery.com',
  'demo@vibechops.com',
  'rider@vibechops.com',
  'fleet@vibechops.com',
];

function strongPassword() {
  return `Aa9!${crypto.randomBytes(24).toString('base64url')}`;
}

function getOutputPath() {
  const index = process.argv.indexOf('--output');
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value) throw new Error('--output requires a file path');
  return path.resolve(value);
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);

  const rotated = [];
  try {
    for (const email of SEEDED_EMAILS) {
      const user = await User.findOne({ email });
      if (!user) continue;
      const password = strongPassword();
      user.password = password;
      await user.save();
      rotated.push({ email, role: user.role, password });
    }
  } finally {
    await mongoose.disconnect();
  }

  if (rotated.length === 0) {
    console.log('No seeded accounts were found.');
    return;
  }

  const outputPath = getOutputPath();
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const body = [
      '# Rotated seeded-account credentials. Keep this file untracked.',
      ...rotated.map((account) => `${account.email} [${account.role}] -> ${account.password}`),
      '',
    ].join('\n');
    fs.writeFileSync(outputPath, body, { encoding: 'utf8', mode: 0o600 });
    console.log(`Rotated ${rotated.length} seeded accounts; credentials written to ${outputPath}`);
    console.log('Update any local E2E credentials before running the regression again.');
    return;
  }

  console.log('ROTATED SEEDED ACCOUNT PASSWORDS (displayed once):');
  for (const account of rotated) {
    console.log(`${account.email} [${account.role}] -> ${account.password}`);
  }
  console.log('Update any local E2E credentials before running the regression again.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
