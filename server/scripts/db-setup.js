/**
 * Database schema setup script
 * 
 * This script initializes the database schema for the application.
 * It drops existing tables and creates new ones according to the schema.
 */

const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Enable auto-commit for each statement
oracledb.autoCommit = true;

// Hash password function
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create a log file with timestamp
const logFile = path.join(logDir, `db-setup-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile);

// Improved logging function
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
  
  logStream.write(logMessage + '\n');
}

// Handle dropping database objects safely
async function dropObject(connection, type, name) {
  try {
    let sql;
    if (type === 'SEQUENCE') {
      sql = `DROP ${type} ${name}`;
    } else {
      sql = `DROP ${type} ${name} CASCADE CONSTRAINTS`;
    }
    
    const result = await connection.execute(sql);
    log(`Dropped ${type} ${name} successfully`);
    return true;
  } catch (err) {
    if (err.errorNum === 942) { // ORA-00942: table or view does not exist
      log(`Warning: ${type} ${name} does not exist`);
      return true; // Not an error, just a warning
    } else if (err.errorNum === 2289) { // ORA-02289: sequence does not exist
      log(`Warning: Sequence ${name} does not exist`);
      return true; // Not an error, just a warning
    } else {
      log(`Error dropping ${type} ${name}: ${err.message}`, true);
      throw err;
    }
  }
}

// Execute SQL statements from file
async function executeScript(connection, sqlFile) {
  try {
    log(`Reading SQL file: ${sqlFile}`);
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Parse SQL script into statements, handling PL/SQL blocks
    const statements = [];
    let currentStatement = '';
    let inPLSQLBlock = false;
    
    // Split by lines to process them
    const lines = sql.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('--')) {
        continue;
      }
      
      // Check for PL/SQL block beginning
      if (line.toUpperCase().includes('CREATE OR REPLACE TRIGGER') || 
          line.toUpperCase().includes('BEGIN')) {
        inPLSQLBlock = true;
      }
      
      // Add line to current statement
      currentStatement += line + '\n';
      
      // Check for PL/SQL block end
      if (inPLSQLBlock && line === '/') {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inPLSQLBlock = false;
        continue;
      }
      
      // Check for normal statement end
      if (!inPLSQLBlock && line.endsWith(';')) {
        // Remove the trailing semicolon before adding to statements
        statements.push(currentStatement.trim().replace(/;$/, ''));
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 80)}...`);
        await connection.execute(statement);
        log(`Statement ${i + 1} executed successfully`);
    } catch (err) {
        // Handle common Oracle error codes gracefully
        if (err.errorNum === 955) { // ORA-00955: name already used by an existing object
          log(`Warning: Object already exists - ${err.message}`);
        } else if (err.errorNum === 942) { // ORA-00942: table or view does not exist
          log(`Warning: Object does not exist - ${err.message}`);
        } else if (err.errorNum === 2289) { // ORA-02289: sequence does not exist
          log(`Warning: Sequence does not exist - ${err.message}`);
        } else if (err.errorNum === 1917) { // ORA-01917: user or role does not exist
          log(`Warning: User or role does not exist - ${err.message}`);
        } else if (err.errorNum === 1920) { // ORA-01920: user name conflicts with another user or role name
          log(`Warning: User already exists - ${err.message}`);
        } else if (err.errorNum === 1031) { // ORA-01031: insufficient privileges
          log(`Warning: Insufficient privileges - ${err.message}`);
        } else if (err.errorNum === 4080) { // ORA-04080: trigger does not exist
          log(`Warning: Trigger does not exist - ${err.message}`);
        } else if (err.errorNum === 1430) { // ORA-01430: column being added already exists in table
          log(`Warning: Column already exists - ${err.message}`);
        } else if (err.errorNum === 1440) { // ORA-01440: column to be modified must be empty
          log(`Warning: Column not empty for modification - ${err.message}`);
        } else if (err.errorNum === 2260) { // ORA-02260: table can have only one primary key
          log(`Warning: Primary key already exists - ${err.message}`);
        } else if (err.errorNum === 2275) { // ORA-02275: such a constraint already exists
          log(`Warning: Constraint already exists - ${err.message}`);
        } else if (err.errorNum === 2264) { // ORA-02264: name already used by an existing constraint
          log(`Warning: Constraint name already in use - ${err.message}`);
        } else {
          log(`Error executing statement ${i + 1}: ${err.message}`, true);
          log(`Full statement: ${statement}`, true);
        throw err;
        }
      }
    }
    
    log(`SQL script execution completed successfully`);
    return true;
  } catch (err) {
    log(`Error executing script: ${err.message}`, true);
    throw err;
  }
}

// Main database setup function
async function setupDatabase() {
  let connection;
  
  try {
    log('Starting database setup process');
    
    // Log connection details (without password)
    log(`Using database user: ${process.env.DB_USER}`);
    log(`Using connection string: ${process.env.DB_CONNECT_STRING}`);
    
    // Connect to the database
    log('Connecting to Oracle database...');
    
    connection = await oracledb.getConnection({
      user:'sys',
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      privilege: oracledb.SYSDBA
    });
    
    log('Connected to database successfully');
    
    // Drop existing objects
    log('Dropping existing database objects...');
    //await dropObject(connection, 'TABLE', 'SRRA.RECEIPT');
    //await dropObject(connection, 'TABLE', 'SRRA.STUDENT');
    //await dropObject(connection, 'TABLE', 'SRRA.DEPARTMENT');
    //await dropObject(connection, 'TABLE', 'SRRA.USERS');
    //await dropObject(connection, 'SEQUENCE', 'SRRA.DEPARTMENT_ID_SEQ');
    //await dropObject(connection, 'SEQUENCE', 'SRRA.RECEIPT_ID_SEQ');
    
    // Execute schema file
    log('Executing database schema script...');
    const schemaFilePath = path.join(__dirname, 'db-schema.sql');
    //await executeScript(connection, schemaFilePath);
    
    // Create admin user
    log('Creating admin user...');
    try {
      const hashedPassword = await hashPassword('admin1234');
      log('Password hashed successfully');
      
      const createAdminQuery = `
        INSERT INTO SRRA.USERS (USER_ID, USER_NAME, HASHED_PASSWORD, ROLE) 
        VALUES ('1', 'admin', :hashedPassword, 'A')
      `;
      
      await connection.execute(createAdminQuery, { hashedPassword });
      log('Admin user created successfully');
    } catch (err) {
      if (err.errorNum === 1) {
        log('Admin user already exists', true);
      } else {
        log(`Error creating admin user: ${err.message}`, true);
        throw err;
      }
    }
    
    log('Database setup completed successfully');
    return true;
  } catch (err) {
    log('Error during database setup:', true);
    log(`Error message: ${err.message}`, true);
    
    if (err.errorNum) {
      log(`Oracle error code: ${err.errorNum}`, true);
    }
    
    return false;
  } finally {
    // Close connection
    if (connection) {
      try {
        await connection.close();
        log('Database connection closed');
      } catch (err) {
        log(`Error closing connection: ${err.message}`, true);
      }
    }
    
    // Close log stream
    logStream.end();
  }
}

// Run the setup
log('Starting database setup script');

  setupDatabase()
  .then(success => {
    if (success) {
      log('Database setup completed successfully');
      process.exit(0);
    } else {
      log('Database setup failed', true);
      process.exit(1);
    }
    })
    .catch(err => {
    log(`Unhandled error in setupDatabase: ${err.message}`, true);
      process.exit(1);
    });

