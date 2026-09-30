const { verifyToken } = require('../utils/jwt.utils');
const { sendError } = require('../utils/response.utils');
const User = require('../../modules/auth/auth.model');

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Access denied. Authorization token missing.');
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return sendError(res, 401, 'Invalid authentication token.');
    }

    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user || !user.isActive) {
      return sendError(res, 401, 'Invalid or deactivated user token.');
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, 'Authentication failed. Invalid token.');
  }
};

module.exports = authMiddleware;
