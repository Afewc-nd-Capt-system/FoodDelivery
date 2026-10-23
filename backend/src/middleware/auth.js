const { isBlacklisted } = require('../utils/tokenBlacklist');
const { verifyAccessToken } = require('../security/tokenService');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    if (await isBlacklisted(token)) {
      return res.status(401).json({ message: 'Token has been invalidated. Please login again.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token is not valid or has expired' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
