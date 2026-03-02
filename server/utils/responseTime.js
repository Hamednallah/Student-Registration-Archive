const { logger } = require('./logger');

// Response time middleware
const responseTime = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Response time for ${req.method} ${req.path}: ${duration}ms`);
  });

  next();
};

module.exports = responseTime;
