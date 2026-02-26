const oracledb = require('oracledb');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testConnection() {
  let connection;
  
  console.log('Starting connection test...');
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Connection string: ${process.env.DB_CONNECT_STRING}`);
  
  try {
    // Connect to the database
    console.log('Attempting to connect to database...');
    
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING
    });
    
    console.log('Connected to database successfully!');
    
    // Try a simple query
    console.log('Executing a simple query...');
    const result = await connection.execute('SELECT 1 FROM DUAL');
    console.log('Query result:', result.rows);
    
    console.log('Connection test passed!');
  } catch (err) {
    console.error('Error connecting to database:');
    console.error(`Error code: ${err.errorNum || 'N/A'}`);
    console.error(`Error message: ${err.message || 'N/A'}`);
    console.error(`Full error:`, err);
  } finally {
    // Close connection
    if (connection) {
      try {
        await connection.close();
        console.log('Database connection closed');
      } catch (err) {
        console.error('Error closing connection:', err.message);
      }
    }
  }
}

// Run the test
testConnection(); 