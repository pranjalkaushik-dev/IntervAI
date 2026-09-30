const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return 'intervai_dev_secret_change_this';
};

const generateToken = (payload, options = {}) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '7d'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

module.exports = { generateToken, verifyToken };
