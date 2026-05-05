const jwt = require('jsonwebtoken');
const { isBlacklisted } = require('../utils/tokenBlacklist');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    if (isBlacklisted(token)) {
      return res.status(401).json({ message: 'Token has been invalidated. Please login again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
