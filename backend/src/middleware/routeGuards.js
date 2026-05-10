const roleGuard = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

module.exports = {
  customerGuard: roleGuard(['customer']),
  restaurantGuard: roleGuard(['restaurant']),
  vendorGuard: roleGuard(['vendor']),
  deliveryCompanyGuard: roleGuard(['delivery_company']),
  deliveryRiderGuard: roleGuard(['delivery_rider']),
  adminGuard: roleGuard(['admin'])
};
