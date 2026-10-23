'use strict';

// Seeds the database configured by MONGODB_URI from this machine. This mounts
// the same seed router used by non-production servers, but it is a short-lived
// local process and never exposes the routes on the deployed API.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (!process.env.SEED_KEY) throw new Error('SEED_KEY is required');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const app = express();
  app.use(express.json());
  app.use('/api/v2/seed', require('../src/routes/seed'));

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/v2/seed/init`, {
      headers: { 'x-seed-key': process.env.SEED_KEY },
    });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    if (!response.ok) {
      throw new Error(`Seed request failed (${response.status}): ${text}`);
    }
    console.log(JSON.stringify(body, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
