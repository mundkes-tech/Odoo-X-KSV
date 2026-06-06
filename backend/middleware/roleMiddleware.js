function roleMiddleware(...allowedRoles) {
  const normalizedRoles = allowedRoles.map((role) => String(role).toUpperCase());

  return (req, res, next) => {
    const userRole = req.user && req.user.role ? String(req.user.role).toUpperCase() : null;

    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    return next();
  };
}

module.exports = roleMiddleware;
