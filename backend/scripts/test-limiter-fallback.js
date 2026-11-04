'use strict';

/**
 * Verifies the Redis-backed limiter store degrades to the in-memory store when
 * Redis is down or throwing, and never fails open (unlimited) or throws.
 */
const assert = require('assert');
const { RedisRateLimitStore } = require('../src/middleware/rateLimitStore');

function storeWith(clientFactory) {
  const store = new RedisRateLimitStore('test:', { clientProvider: clientFactory });
  store.init({ windowMs: 60_000 });
  return store;
}

(async () => {
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  // 1. Redis not connected: memory store enforces the limit.
  {
    const store = storeWith(() => ({ status: 'connecting' }));
    const first = await store.increment('k');
    const second = await store.increment('k');
    check('no Redis: counts accumulate in memory', first.totalHits === 1 && second.totalHits === 2,
      `hits=${first.totalHits},${second.totalHits}`);
    await store.decrement('k');
    const after = await store.increment('k');
    check('no Redis: decrement works (skipSuccessfulRequests)', after.totalHits === 2, `hits=${after.totalHits}`);
    await store.resetKey('k');
    const reset = await store.increment('k');
    check('no Redis: resetKey clears the counter', reset.totalHits === 1, `hits=${reset.totalHits}`);
  }

  // 2. Redis "ready" but every command throws: must fall back, never throw.
  {
    const throwing = {
      status: 'ready',
      incr: async () => { throw new Error('redis down'); },
      pexpire: async () => { throw new Error('redis down'); },
      pttl: async () => { throw new Error('redis down'); },
      get: async () => { throw new Error('redis down'); },
      decr: async () => { throw new Error('redis down'); },
      del: async () => { throw new Error('redis down'); },
    };
    const store = storeWith(() => throwing);
    let threw = false;
    let hits = [];
    try {
      hits.push((await store.increment('j')).totalHits);
      hits.push((await store.increment('j')).totalHits);
      await store.decrement('j');
      hits.push((await store.increment('j')).totalHits);
    } catch {
      threw = true;
    }
    check('Redis throwing: no exception escapes', !threw);
    check('Redis throwing: in-memory counter still enforces', hits[0] === 1 && hits[1] === 2 && hits[2] === 2,
      `hits=${hits.join(',')}`);
  }

  // 3. Redis up: writes go through the client.
  {
    let value = 0;
    const fake = {
      status: 'ready',
      incr: async () => { value += 1; return value; },
      pexpire: async () => 1,
      pttl: async () => 900_000,
      get: async () => String(value),
      decr: async () => { value -= 1; return value; },
      del: async () => { value = 0; return 1; },
    };
    const store = storeWith(() => fake);
    const a = await store.increment('z');
    const b = await store.increment('z');
    check('Redis up: increments use the shared store', a.totalHits === 1 && b.totalHits === 2,
      `hits=${a.totalHits},${b.totalHits}`);
    await store.resetKey('z');
    check('Redis up: resetKey deletes the shared key', value === 0, `value=${value}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nLIMITER FALLBACK ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
})().catch((error) => {
  console.error('LIMITER FALLBACK crashed:', error.message);
  process.exit(1);
});
