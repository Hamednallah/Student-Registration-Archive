const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testTables() {
  let connection;
  
  try {
    console.log('Testing database tables...');
    console.log('Current directory:', __dirname);
    console.log('Env file path:', path.join(__dirname, '..', '.env'));
    
    // Log environment variables (without password)
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_CONNECT_STRING:', process.env.DB_CONNECT_STRING);
    
    // Connect to database
    console.log(`Connecting to database as ${process.env.DB_USER}...`);
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING
    });
    console.log('Database connection successful');
    
    // Format output as a table
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    
    // Check tables
    console.log('\nChecking tables:');
    const tables = await connection.execute(`
      SELECT table_name 
      FROM all_tables 
      WHERE owner = 'SRRA'
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('No tables found in SRRA schema');
    } else {
      console.log('Tables in SRRA schema:');
      tables.rows.forEach(row => {
        console.log(`- ${row.TABLE_NAME}`);
      });
    }
    
    // Check sequences
    console.log('\nChecking sequences:');
    const sequences = await connection.execute(`
      SELECT sequence_name 
      FROM all_sequences 
      WHERE sequence_owner = 'SRRA'
      ORDER BY sequence_name
    `);
    
    if (sequences.rows.length === 0) {
      console.log('No sequences found in SRRA schema');
    } else {
      console.log('Sequences in SRRA schema:');
      sequences.rows.forEach(row => {
        console.log(`- ${row.SEQUENCE_NAME}`);
      });
    }
    
    // Check constraints
    console.log('\nChecking constraints:');
    const constraints = await connection.execute(`
      SELECT constraint_name, constraint_type, table_name
      FROM all_constraints
      WHERE owner = 'SRRA'
      ORDER BY table_name, constraint_type
    `);
    
    if (constraints.rows.length === 0) {
      console.log('No constraints found in SRRA schema');
    } else {
      console.log('Constraints in SRRA schema:');
      constraints.rows.forEach(row => {
        const type = row.CONSTRAINT_TYPE === 'P' ? 'Primary Key' :
                     row.CONSTRAINT_TYPE === 'R' ? 'Foreign Key' :
                     row.CONSTRAINT_TYPE === 'U' ? 'Unique' :
                     row.CONSTRAINT_TYPE === 'C' ? 'Check' : row.CONSTRAINT_TYPE;
        console.log(`- ${row.TABLE_NAME}: ${row.CONSTRAINT_NAME} (${type})`);
      });
    }
    
    // Check triggers
    console.log('\nChecking triggers:');
    const triggers = await connection.execute(`
      SELECT trigger_name, table_name
      FROM all_triggers
      WHERE owner = 'SRRA'
      ORDER BY table_name
    `);
    
    if (triggers.rows.length === 0) {
      console.log('No triggers found in SRRA schema');
    } else {
      console.log('Triggers in SRRA schema:');
      triggers.rows.forEach(row => {
        console.log(`- ${row.TABLE_NAME}: ${row.TRIGGER_NAME}`);
      });
    }
    
    console.log('\nDatabase verification completed successfully');
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Error stack:', err.stack);
    if (err.errorNum) {
      console.error(`Oracle Error ${err.errorNum}: ${err.message}`);
    }
  } finally {
    // Release connection
    if (connection) {
      try {
        await connection.close();
        console.log('Database connection closed');
      } catch (err) {
        console.error(`Error closing connection: ${err.message}`);
      }
    }
  }
}

// Run the test
console.log('Starting test script...');
testTables().then(() => {
  console.log('Test completed');
}).catch(err => {
  console.error('Unhandled error:', err);
}); 