const session = require('express-session');
const { logger } = require('./logger');

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
};

// Session middleware
const sessionMiddleware = session(sessionConfig);

// Log session activity
const sessionLogger = (req, res, next) => {
  logger.info(`Session activity for user: ${req.session.userId || 'anonymous'}`);
  next();
};

module.exports = { sessionMiddleware, sessionLogger };