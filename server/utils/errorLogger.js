const { logger } = require('./logger');

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    error: err.message,
    stack: err.stack
  };

  logger.error(errorDetails);

  // Pass the error to the next middleware
  next(err);
};

module.exports = errorLogger;