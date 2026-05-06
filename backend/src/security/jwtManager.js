const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTManager {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'fallback-secret-change-me';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
    this.blacklist = new Map();
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
      { expiresIn: this.accessTokenExpiry, issuer: 'vibechops' }
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
      { expiresIn: this.refreshTokenExpiry, issuer: 'vibechops' }
    );

    return { token, tokenId, familyId };
  }

  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, { issuer: 'vibechops' });
      if (this.blacklist.has(token)) {
        return null;
      }
      return decoded;
    } catch (err) {
      return null;
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret, { issuer: 'vibechops' });
    } catch (err) {
      return null;
    }
  }

  blacklistToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const ttl = decoded.exp * 1000 - Date.now();
        if (ttl > 0) {
          this.blacklist.set(token, true);
          setTimeout(() => this.blacklist.delete(token), ttl);
        }
      }
    } catch {}
  }

  invalidateTokenFamily(familyId) {
    console.log(`[SECURITY] Invalidating token family: ${familyId}`);
  }

  rotateRefreshToken(oldToken, user) {
    const decoded = this.verifyRefreshToken(oldToken);
    if (!decoded) return null;

    if (decoded.familyId) {
      this.invalidateTokenFamily(decoded.familyId);
    }

    return this.generateRefreshToken(user);
  }
}

module.exports = new JWTManager();