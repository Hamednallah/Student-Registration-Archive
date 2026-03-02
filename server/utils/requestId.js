const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

// Request ID middleware
const requestId = (req, res, next) => {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  logger.info(`Request ID generated: ${requestId} for ${req.method} ${req.path}`);
  
  next();
};

module.exports = requestId;