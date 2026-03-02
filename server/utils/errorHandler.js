const { logger } = require('./logger');
const { errorResponse } = require('./responseHandler');

/**
 * Global error handler middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  try {
    // Ensure we have a proper error object
    const error = err instanceof Error ? err : new Error(err || 'Unknown error');
    
    // Extract useful information from request
    const timestamp = new Date().toISOString();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';
    
    // Log the error with context
    logger.error('Request error', {
      message: error.message,
      code: error.code || error.statusCode,
      stack: error.stack,
      timestamp,
      method,
      url: originalUrl,
      ip,
      userAgent
    });
    
    // Determine appropriate status code
    let statusCode = error.statusCode || error.status || 500;
    let errorMsg = error.message || 'An unexpected error occurred';
    
    // Classify error types for better client feedback
    if (error.name === 'ValidationError' || error.name === 'ValidatorError') {
      statusCode = 400;
    } else if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
      statusCode = 401;
    } else if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
      statusCode = 403;
    } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.name === 'ConflictError' || error.message.includes('conflict')) {
      statusCode = 409;
    } else if (error.name === 'RateLimitError' || error.message.includes('rate limit')) {
      statusCode = 429;
    }
    
    // Handle database-specific errors
    if (error.message.includes('Database error')) {
      if (error.message.includes('already exists')) {
        statusCode = 409;
        errorMsg = 'A record with this identifier already exists';
      } else if (error.message.includes('not exist')) {
        statusCode = 404;
        errorMsg = 'Referenced record does not exist';
      }
    }
    
    // Extract validation errors if available
    const validationErrors = error.validationErrors || error.errors || null;
    
    // Safe error response that doesn't expose sensitive details in production
    const errorDetail = process.env.NODE_ENV === 'production'
      ? null
      : {
          name: error.name,
          stack: error.stack,
          code: error.code
        };
    
    // Send error response
    return errorResponse(
      res,
      errorMsg,
      statusCode,
      validationErrors,
      errorDetail
    );
  } catch (handlerError) {
    // If error handler itself fails, log it and send a basic response
    logger.error('Error handler failed:', handlerError);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = errorHandler;