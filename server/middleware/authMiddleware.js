const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

// Enhanced authentication middleware
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.warn('Authentication attempt without token', { ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add additional security checks
    if (!decoded.userId || !decoded.role) {
      logger.warn('Invalid token payload', { ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure.'
      });
    }

    // Attach user information to request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      username: decoded.username
    };

    logger.info('User authenticated', { userId: decoded.userId });
    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message, ip: req.ip });
    
    const message = error.name === 'TokenExpiredError'
      ? 'Token expired. Please log in again.'
      : 'Invalid token.';

    res.status(401).json({
      success: false,
      message
    });
  }
};

// Enhanced authorization middleware
const authorize = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        logger.warn('Authorization attempt without user role', { ip: req.ip });
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Unauthorized access attempt', {
          userId: req.user.id,
          attemptedRole: req.user.role,
          requiredRoles: roles,
          endpoint: req.originalUrl
        });
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${roles.join(', ')}.`,
          requiredRoles: roles
        });
      }

      logger.info('Authorized access', {
        userId: req.user.id,
        role: req.user.role,
        endpoint: req.originalUrl
      });
      next();
    } catch (error) {
      logger.error('Authorization error', {
        error: error.message,
        ip: req.ip,
        endpoint: req.originalUrl
      });
      res.status(500).json({
        success: false,
        message: 'Authorization check failed.'
      });
    }
  };
};

module.exports = { authenticate, authorize };