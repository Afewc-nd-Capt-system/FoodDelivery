const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getClient } = require('../middleware/redis');

class JWTManager {
  constructor() {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
    }
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
  }

  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        mfaVerified: user.mfaEnabled ? false : true,
        type: 'access'
      },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry, issuer: 'vibechops', algorithm: 'HS256' }
    );
  }

  generateRefreshToken(user) {
    const tokenId = crypto.randomBytes(16).toString('hex');
    const familyId = user.refreshTokenFamily || crypto.randomBytes(16).toString('hex');

    const token = jwt.sign(
      {
        id: user._id,
        tokenId,
        familyId,
        type: 'refresh'
      },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry, issuer: 'vibechops', algorithm: 'HS256' }
    );

    return { token, tokenId, familyId };
  }

  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, { issuer: 'vibechops', algorithms: ['HS256'] });
      const redisClient = getClient();
      const isBlacklisted = redisClient ? await redisClient.get(`blacklist:${token}`) : false;
      if (isBlacklisted) {
        return null;
      }
      return decoded;
    } catch (err) {
      return null;
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret, { issuer: 'vibechops', algorithms: ['HS256'] });
    } catch (err) {
      return null;
    }
  }

  async blacklistToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          const redisClient = getClient();
          if (redisClient) {
            await redisClient.setEx(`blacklist:${token}`, ttl, '1');
          }
        }
      }
    } catch (err) {
      console.error('[SECURITY] Failed to blacklist token:', err);
    }
  }

  async invalidateTokenFamily(familyId) {
    try {
      const redisClient = getClient();
      if (!redisClient) {
        console.error('[SECURITY] Redis not available for token family invalidation');
        return;
      }
      const pattern = `token_family:${familyId}:*`;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      console.log(`[SECURITY] Invalidated ${keys.length} tokens in family: ${familyId}`);
    } catch (err) {
      console.error('[SECURITY] Failed to invalidate token family:', err);
    }
  }

  async rotateRefreshToken(oldToken, user) {
    const decoded = this.verifyRefreshToken(oldToken);
    if (!decoded) return null;

    if (decoded.familyId) {
      await this.invalidateTokenFamily(decoded.familyId);
    }

    return this.generateRefreshToken(user);
  }
}

module.exports = new JWTManager();