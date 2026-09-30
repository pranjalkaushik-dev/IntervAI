const { sendError } = require('../utils/response.utils');

const errorHandler = (err, req, res, next) => {
  console.error('[Global Error Handler]:', err.stack || err.message);

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, statusCode, message, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = errorHandler;
