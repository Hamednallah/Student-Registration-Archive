const helmet = require('helmet');
const { logger } = require('./logger');

// Helmet security middleware
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5000", "http://127.0.0.1:5000", "https://l9hcq09q-3000.euw.devtunnels.ms/"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'same-origin' }
});

// Log security headers
const securityLogger = (req, res, next) => {
  logger.info(`Security headers applied to ${req.method} ${req.path}`);
  next();
};

module.exports = { helmetMiddleware, securityLogger };