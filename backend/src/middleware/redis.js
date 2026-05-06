const redis = require('redis');
const { promisify } = require('util');

let client = null;
let isConnected = false;

const connectRedis = async () => {
  try {
    if (process.env.REDIS_URL) {
      client = redis.createClient({ url: process.env.REDIS_URL });
      client.on('error', (err) => console.log('Redis error:', err));
      await client.connect();
      isConnected = true;
      console.log('Redis connected');
    }
  } catch (err) {
    console.log('Redis not available, using fallback');
    isConnected = false;
  }
};

const cacheGet = async (key) => {
  if (!isConnected || !client) return null;
  try { return await client.get(key); } catch { return null; }
};

const cacheSet = async (key, value, expirySeconds = 3600) => {
  if (!isConnected || !client) return;
  try { await client.setEx(key, expirySeconds, JSON.stringify(value)); } catch { }
};

const cacheDelete = async (key) => {
  if (!isConnected || !client) return;
  try { await client.del(key); } catch { }
};

const cacheDeletePattern = async (pattern) => {
  if (!isConnected || !client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(keys);
  } catch { }
};

module.exports = { connectRedis, cacheGet, cacheSet, cacheDelete, cacheDeletePattern, getClient: () => client };