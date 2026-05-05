const jwt = require('jsonwebtoken');

const blacklistedTokens = new Set();

const addToBlacklist = (token) => {
  blacklistedTokens.add(token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    const expiresIn = decoded.exp * 1000 - Date.now();
    if (expiresIn > 0) {
      setTimeout(() => {
        blacklistedTokens.delete(token);
      }, expiresIn);
    }
  } catch (error) {
    blacklistedTokens.delete(token);
  }
};

const isBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

const blacklistMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token && isBlacklisted(token)) {
    return res.status(401).json({ message: 'Token has been invalidated. Please login again.' });
  }
  next();
};

module.exports = { addToBlacklist, isBlacklisted, blacklistMiddleware };
