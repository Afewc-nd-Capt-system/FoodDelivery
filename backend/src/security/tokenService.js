'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getClient } = require('../middleware/redis');

const ACCESS_TTL = '15m';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const ISSUER = 'vibechops';

// Redis is the production store. The Map keeps local development and a
// temporary Redis outage from failing open: refresh tokens still rotate, just
// per process.
const memory = new Map();

class AuthError extends Error {
  constructor(message, status = 401, code = 'AUTH_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function secret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function redisUsable() {
  const client = getClient();
  return client && client.status === 'ready';
}

async function storeSet(key, value, ttlSeconds) {
  if (redisUsable()) {
    try {
      await getClient().setEx(key, ttlSeconds, value);
      return;
    } catch (error) {
      console.error('[AUTH] Redis token store write failed:', error.message);
    }
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function storeGet(key) {
  if (redisUsable()) {
    try {
      const value = await getClient().get(key);
      if (value !== null) return value;
    } catch (error) {
      console.error('[AUTH] Redis token store read failed:', error.message);
    }
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

async function storeDel(key) {
  if (redisUsable()) {
    try { await getClient().del(key); } catch { /* fall through */ }
  }
  memory.delete(key);
}

async function deletePattern(pattern) {
  if (redisUsable()) {
    try {
      const keys = await getClient().keys(pattern);
      if (keys.length) await getClient().del(keys);
    } catch (error) {
      console.error('[AUTH] Redis token store cleanup failed:', error.message);
    }
  }
  const prefix = pattern.replace(/\*$/, '');
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

function signAccessToken(user, familyId) {
  return jwt.sign(
    {
      id: String(user._id),
      email: user.email,
      role: user.role,
      type: 'access',
      familyId,
    },
    secret('JWT_SECRET'),
    { expiresIn: ACCESS_TTL, issuer: ISSUER, algorithm: 'HS256' }
  );
}

function signRefreshToken(user, familyId, tokenId) {
  return jwt.sign(
    {
      id: String(user._id),
      type: 'refresh',
      familyId,
      tokenId,
    },
    secret('JWT_REFRESH_SECRET'),
    { expiresIn: REFRESH_TTL_SECONDS, issuer: ISSUER, algorithm: 'HS256' }
  );
}

async function issueTokens(user, existingFamilyId) {
  const familyId = existingFamilyId || crypto.randomBytes(16).toString('hex');
  const tokenId = crypto.randomBytes(16).toString('hex');
  const accessToken = signAccessToken(user, familyId);
  const refreshToken = signRefreshToken(user, familyId, tokenId);

  await storeSet(
    `refresh:${familyId}:${tokenId}`,
    hash(refreshToken),
    REFRESH_TTL_SECONDS
  );

  return { accessToken, refreshToken, familyId };
}

function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, secret('JWT_REFRESH_SECRET'), {
      issuer: ISSUER,
      algorithms: ['HS256'],
    });
    if (decoded.type !== 'refresh' || !decoded.familyId || !decoded.tokenId) return null;
    return decoded;
  } catch {
    return null;
  }
}

async function rotateRefreshToken(refreshToken) {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) throw new AuthError('Invalid refresh token', 401, 'INVALID_REFRESH');

  if (await storeGet(`refresh:revoked:${decoded.familyId}`)) {
    throw new AuthError('Refresh token family has been revoked', 401, 'REFRESH_REVOKED');
  }

  const key = `refresh:${decoded.familyId}:${decoded.tokenId}`;
  const storedHash = await storeGet(key);
  if (!storedHash) {
    const usedKey = `refresh:used:${decoded.familyId}:${decoded.tokenId}`;
    if (await storeGet(usedKey)) {
      await revokeFamily(decoded.familyId);
      throw new AuthError('Refresh token reuse detected; session revoked', 401, 'REFRESH_REUSE');
    }
    throw new AuthError('Invalid refresh token', 401, 'INVALID_REFRESH');
  }

  if (storedHash !== hash(refreshToken)) {
    await revokeFamily(decoded.familyId);
    throw new AuthError('Refresh token mismatch; session revoked', 401, 'REFRESH_REUSE');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    await revokeFamily(decoded.familyId);
    throw new AuthError('User no longer exists', 401, 'INVALID_REFRESH');
  }

  await storeDel(key);
  await storeSet(
    `refresh:used:${decoded.familyId}:${decoded.tokenId}`,
    '1',
    REFRESH_TTL_SECONDS
  );

  const tokens = await issueTokens(user, decoded.familyId);
  return { ...tokens, user };
}

async function revokeFamily(familyId) {
  if (!familyId) return;
  await storeSet(`refresh:revoked:${familyId}`, '1', REFRESH_TTL_SECONDS);
  await deletePattern(`refresh:${familyId}:*`);
  await deletePattern(`refresh:used:${familyId}:*`);
}

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, secret('JWT_SECRET'), {
      issuer: ISSUER,
      algorithms: ['HS256'],
      maxAge: ACCESS_TTL,
    });
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

function createMfaToken(user) {
  return jwt.sign(
    { id: String(user._id), type: 'mfa', purpose: 'login' },
    secret('JWT_SECRET'),
    { expiresIn: '5m', issuer: ISSUER, algorithm: 'HS256' }
  );
}

function verifyMfaToken(token) {
  try {
    const decoded = jwt.verify(token, secret('JWT_SECRET'), {
      issuer: ISSUER,
      algorithms: ['HS256'],
    });
    if (decoded.type !== 'mfa' || decoded.purpose !== 'login') return null;
    return decoded;
  } catch {
    return null;
  }
}

module.exports = {
  AuthError,
  issueTokens,
  rotateRefreshToken,
  revokeFamily,
  verifyAccessToken,
  verifyRefreshToken,
  createMfaToken,
  verifyMfaToken,
  ACCESS_TTL,
  REFRESH_TTL_SECONDS,
};
