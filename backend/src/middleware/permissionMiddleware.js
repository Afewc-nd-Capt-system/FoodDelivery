const Permission = require('../models/Permission');

const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (req.user.role === 'admin') {
        return next(); // Admins have all permissions
      }

      const permission = await Permission.findOne({
        resource,
        action,
        roles: req.user.role
      });

      if (!permission) {
        return res.status(403).json({
          message: 'You do not have permission to perform this action',
          required: { resource, action }
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Permission check failed' });
    }
  };
};

module.exports = requirePermission;
