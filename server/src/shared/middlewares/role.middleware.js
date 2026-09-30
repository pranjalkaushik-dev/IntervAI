const { sendError } = require('../utils/response.utils');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.accountRole)) {
      return sendError(
        res,
        403,
        `Forbidden: Role '${req.user ? req.user.accountRole : 'GUEST'}' is not authorized to perform this action.`
      );
    }
    next();
  };
};

module.exports = authorizeRoles;
