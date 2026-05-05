const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/TokenBlacklist');

const addToBlacklist = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    const expiresAt = new Date(decoded.exp * 1000);
    
    await TokenBlacklist.create({ token, expiresAt });
  } catch (error) {
    // Token already expired or invalid, no need to blacklist
  }
};

const isBlacklisted = async (token) => {
  try {
    const blacklisted = await TokenBlacklist.findOne({ token });
    return !!blacklisted;
  } catch (error) {
    return false;
  }
};

const blacklistMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token && await isBlacklisted(token)) {
      return res.status(401).json({ message: 'Token has been invalidated. Please login again.' });
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { addToBlacklist, isBlacklisted, blacklistMiddleware };
