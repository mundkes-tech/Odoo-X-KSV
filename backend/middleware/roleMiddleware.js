function authorizeRoles(...allowedRoles) {
  const normalizedRoles = allowedRoles
    .filter((role) => role !== undefined && role !== null)
    .map((role) => String(role).trim().toUpperCase());

  if (normalizedRoles.length === 0) {
    throw new Error('authorizeRoles requires at least one allowed role.');
  }

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

module.exports = authorizeRoles;
module.exports.authorizeRoles = authorizeRoles;
