const { executeQuery } = require('../config/database');
const { logger } = require('./logger');

// Health check function
const healthCheck = async () => {
  try {
    // Check database connection
    await executeQuery('SELECT 1 FROM DUAL');
    
    // Check other services if needed
    // ...

    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      details: {
        database: 'OK'
      }
    };
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    return {
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      details: {
        database: 'ERROR',
        error: error.message
      }
    };
  }
};

// Health check endpoint middleware
const healthCheckMiddleware = async (req, res) => {
  const healthStatus = await healthCheck();
  res.status(healthStatus.status === 'UP' ? 200 : 503).json(healthStatus);
};

module.exports = { healthCheck, healthCheckMiddleware };