const compression = require('compression');
const { logger } = require('./logger');

// Compression middleware
const compressResponse = (req, res, next) => {
  // Skip compression for certain routes
  if (req.path.startsWith('/api-docs')) {
    return next();
  }

  // Apply compression
  compression()(req, res, next);
  
  // Log compression
  logger.info(`Compression applied to ${req.method} ${req.path}`);
};

module.exports = compressResponse;