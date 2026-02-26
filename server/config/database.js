const oracledb = require('oracledb');
const dotenv = require('dotenv');
const { logger } = require('../utils/logger');

// Load environment variables directly in this file to ensure they're available
dotenv.config({ path: '../.env' });

// Configuration with default values for development
const dbConfig = {
  user: process.env.DB_USER || 'SRRA',
  password: process.env.DB_PASSWORD || 'ORCL',
  connectString: process.env.DB_CONNECTION_STRING || process.env.DB_CONNECT_STRING || 'localhost:1521/orcl',
  poolMin: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN) : 1,
  poolMax: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 5,
  poolIncrement: process.env.DB_POOL_INCREMENT ? parseInt(process.env.DB_POOL_INCREMENT) : 1
};

// Initialize connection pool
async function initialize() {
  try {
    // Check if config has valid values
    if (!dbConfig.user || !dbConfig.password || !dbConfig.connectString) {
      logger.warn('Missing database configuration:', { 
        user: dbConfig.user ? 'SET' : 'MISSING',
        password: dbConfig.password ? 'SET' : 'MISSING',
        connectString: dbConfig.connectString ? 'SET' : 'MISSING'
      });
      
      // For development, we'll create a mock pool to allow the app to start
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.info('Running in development/test mode - using mock database');
        return true;
      } else {
        throw new Error('Database configuration is incomplete. Check environment variables.');
      }
    }
    
    // Only create real pool if config is valid
    await oracledb.createPool(dbConfig);
    logger.info('Oracle Database connection pool created successfully');
    return true;
  } catch (err) {
    logger.error('Error creating Oracle connection pool:', { error: err.message, stack: err.stack });
    
    // For development/test, don't crash the app
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      logger.info('Running in development/test mode - continuing without database');
      return false;
    }
    
    throw new Error(`Failed to create connection pool: ${err.message}`);
  }
}

// Close connection pool
async function close() {
  try {
    // Check if pool exists before trying to close
    if (oracledb.getPool()) {
      await oracledb.getPool().close(10);
      logger.info('Oracle Database connection pool closed');
    } else {
      logger.info('No active connection pool to close');
    }
    return true;
  } catch (err) {
    logger.error('Error closing Oracle connection pool:', { error: err.message, stack: err.stack });
    // Don't throw in shutdown path
    return false;
  }
}

// Get a connection from the pool
async function getConnection() {
  try {
    // In development without DB, return mock connection
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && 
        (!dbConfig.user || !dbConfig.password || !dbConfig.connectString)) {
      throw new Error('DB_MOCK_ENABLED');
    }
    
    const connection = await oracledb.getPool().getConnection();
    return connection;
  } catch (err) {
    // Handle special case for mock DB in development
    if (err.message === 'DB_MOCK_ENABLED') {
      logger.debug('Using mock database connection');
      return createMockConnection();
    }
    
    logger.error('Error getting database connection:', { error: err.message, stack: err.stack });
    
    // Check if pool exists, if not, try to initialize
    if (err.message.includes('NJS-047') || err.message.includes('Pool was not initialized')) {
      logger.info('Attempting to reinitialize the connection pool');
      try {
        await initialize();
        return await oracledb.getPool().getConnection();
      } catch (initErr) {
        logger.error('Failed to reinitialize connection pool:', { error: initErr.message, stack: initErr.stack });
        
        // In development or test, use mock connection
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          logger.warn('Using mock connection after failed pool initialization');
          return createMockConnection();
        }
        
        throw new Error(`Failed to get connection after reinitialization: ${initErr.message}`);
      }
    }
    
    // In development, use mock connection for any error
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      logger.warn('Using mock connection after connection error');
      return createMockConnection();
    }
    
    throw new Error(`Failed to get connection: ${err.message}`);
  }
}

// Create a mock connection object for development
function createMockConnection() {
  return {
    execute: async (sql, binds = {}, options = {}) => {
      logger.debug('MOCK DB QUERY:', { sql: sql.substring(0, 200) });
      
      // Return empty result sets based on query type
      if (sql.toUpperCase().includes('SELECT')) {
        return { 
          rows: [],
          metaData: []
        };
      } else {
        return { 
          rowsAffected: 0,
          outBinds: null
        };
      }
    },
    close: async () => {
      logger.debug('MOCK DB: Connection closed');
    }
  };
}

// Execute a SQL query
async function executeQuery(sql, binds = {}, options = {}) {
  let connection;
  
  // Default options
  const defaultOptions = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    autoCommit: true
  };
  
  const queryOptions = { ...defaultOptions, ...options };
  
  try {
    // Get connection
    connection = await getConnection();
    
    // Execute query
    const startTime = Date.now();
    const result = await connection.execute(sql, binds, queryOptions);
    const duration = Date.now() - startTime;
    
    // Log query execution time if it exceeds threshold (100ms)
    if (duration > 100) {
      logger.debug('Slow query execution', { 
        sql: sql.substring(0, 300), // Trim long queries 
        duration,
        binds: JSON.stringify(binds).substring(0, 200) // Trim large bind variables
      });
    }
    
    return result;
  } catch (err) {
    logger.error('Database query error:', { 
      error: err.message, 
      sql: sql.substring(0, 300), 
      binds: JSON.stringify(binds).substring(0, 200),
      errorCode: err.errorNum || 'N/A'
    });
    
    // Add Oracle-specific error handling
    if (err.errorNum) {
      // Handle specific Oracle errors
      switch (err.errorNum) {
        case 1017: // Invalid username/password
          throw new Error('Database authentication failed');
        case 12154: // TNS connection error
          throw new Error('Database connection error: service not found');
        case 12505: // Service not found
          throw new Error('Database connection error: service not running');
        case 1: // Unique constraint violation
          throw new Error('Record already exists with this ID');
        case 2291: // Parent key not found
          throw new Error('Referenced record does not exist');
        default:
          throw new Error(`Database error (${err.errorNum}): ${err.message}`);
      }
    }
    
    throw new Error(`Database error: ${err.message}`);
  } finally {
    if (connection) {
      try {
        // Release connection back to the pool
        await connection.close();
      } catch (err) {
        logger.error('Error closing database connection:', { error: err.message });
      }
    }
  }
}

module.exports = {
  initialize,
  close,
  getConnection,
  executeQuery
};
