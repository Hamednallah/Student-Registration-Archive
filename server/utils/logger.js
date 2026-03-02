const winston = require('winston');
const { combine, timestamp, printf, format } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  // Handle error objects
  if (metadata.error instanceof Error) {
    msg += `\nError: ${metadata.error.message}`;
    if (metadata.error.stack) {
      msg += `\nStack: ${metadata.error.stack}`;
    }
  }
  
  // Handle other metadata
  const meta = Object.keys(metadata).filter(key => key !== 'error');
  if (meta.length > 0) {
    msg += `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
  }
  
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
};

// Add error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Error occurred', {
    error: err,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next(err);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
};