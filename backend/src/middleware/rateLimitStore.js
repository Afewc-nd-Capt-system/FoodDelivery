'use strict';

const { getClient } = require('./redis');

// express-rate-limit store backed by the shared Redis instance. Without a
// shared store every Render instance keeps its own counter, so a client can
// exceed the limit by hitting a different instance. Falls back to a local map
// only when Redis is unavailable (never fail-open).
class RedisRateLimitStore {
  constructor(prefix = 'rl:', options = {}) {
    this.prefix = prefix;
    this.local = new Map();
    // Injectable for tests: a provider that returns an ioredis-like client.
    this.clientProvider = options.clientProvider || getClient;
  }

  init(options) {
    this.windowMs = options.windowMs || 60000;
  }

  #redisReady() {
    const client = this.clientProvider();
    return client && client.status === 'ready' ? client : null;
  }

  #localBump(key, delta) {
    const now = Date.now();
    const entry = this.local.get(key);
    if (!entry || entry.expiresAt <= now) {
      if (delta < 0 && !entry) return 0;
      this.local.set(key, { count: Math.max(0, delta), expiresAt: now + this.windowMs });
      return Math.max(0, delta);
    }
    entry.count = Math.max(0, entry.count + delta);
    return entry.count;
  }

  async increment(key) {
    const redisKey = `${this.prefix}${key}`;
    const client = this.#redisReady();
    if (client) {
      try {
        const total = await client.incr(redisKey);
        if (total === 1) await client.pexpire(redisKey, this.windowMs);
        const pttl = await client.pttl(redisKey);
        return {
          totalHits: total,
          resetTime: new Date(Date.now() + Math.max(pttl, 0)),
        };
      } catch (error) {
        console.error('[SECURITY] Redis rate-limit increment failed, using memory:', error.message);
      }
    }
    const total = this.#localBump(key, 1);
    const entry = this.local.get(key);
    return { totalHits: total, resetTime: new Date(entry?.expiresAt || Date.now() + this.windowMs) };
  }

  async decrement(key) {
    const redisKey = `${this.prefix}${key}`;
    const client = this.#redisReady();
    if (client) {
      try {
        const current = await client.get(redisKey);
        if (current && Number(current) > 0) await client.decr(redisKey);
        return;
      } catch (error) {
        console.error('[SECURITY] Redis rate-limit decrement failed, using memory:', error.message);
      }
    }
    this.#localBump(key, -1);
  }

  async resetKey(key) {
    const redisKey = `${this.prefix}${key}`;
    const client = this.#redisReady();
    if (client) {
      try {
        await client.del(redisKey);
        return;
      } catch (error) {
        console.error('[SECURITY] Redis rate-limit reset failed, using memory:', error.message);
      }
    }
    this.local.delete(key);
  }
}

module.exports = { RedisRateLimitStore };
