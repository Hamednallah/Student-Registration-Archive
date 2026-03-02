/**
 * Database migration script
 * 
 * This script updates the database schema to use auto-generated IDs for departments and receipts.
 */

const oracledb = require('oracledb');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Execute SQL migration file
 * @param {oracledb.Connection} connection - Database connection
 * @param {string} filename - SQL file to execute
 */
async function executeMigration(connection, filename) {
  try {
    console.info(`Executing migration file: ${filename}`);
    const schemaFile = path.join(__dirname, filename);
    const schema = fs.readFileSync(schemaFile, 'utf8');
    
    // First try to drop the sequences if they exist
    try {
      await connection.execute('DROP SEQUENCE SRRA.DEPARTMENT_ID_SEQ');
      console.info('- Dropped existing DEPARTMENT_ID_SEQ sequence');
    } catch (err) {
      if (err.errorNum === 2289) { // ORA-02289: sequence does not exist
        console.info('- DEPARTMENT_ID_SEQ sequence does not exist, will create it');
      } else {
        console.error('- Error dropping DEPARTMENT_ID_SEQ:', err.message);
      }
    }
    
    try {
      await connection.execute('DROP SEQUENCE SRRA.RECEIPT_ID_SEQ');
      console.info('- Dropped existing RECEIPT_ID_SEQ sequence');
    } catch (err) {
      if (err.errorNum === 2289) { // ORA-02289: sequence does not exist
        console.info('- RECEIPT_ID_SEQ sequence does not exist, will create it');
      } else {
        console.error('- Error dropping RECEIPT_ID_SEQ:', err.message);
      }
    }
    
    // Create the sequences
    try {
      await connection.execute('CREATE SEQUENCE SRRA.DEPARTMENT_ID_SEQ START WITH 1 INCREMENT BY 1');
      console.info('- Created DEPARTMENT_ID_SEQ sequence');
    } catch (err) {
      if (err.errorNum === 955) { // ORA-00955: name is already used by an existing object
        console.info('- DEPARTMENT_ID_SEQ sequence already exists');
      } else {
        console.error('- Error creating DEPARTMENT_ID_SEQ:', err.message);
        throw err;
      }
    }
    
    try {
      await connection.execute('CREATE SEQUENCE SRRA.RECEIPT_ID_SEQ START WITH 1 INCREMENT BY 1');
      console.info('- Created RECEIPT_ID_SEQ sequence');
    } catch (err) {
      if (err.errorNum === 955) { // ORA-00955: name is already used by an existing object
        console.info('- RECEIPT_ID_SEQ sequence already exists');
      } else {
        console.error('- Error creating RECEIPT_ID_SEQ:', err.message);
        throw err;
      }
    }
    
    // Now let's modify the tables to use auto-generated IDs
    
    // 1. Create temporary tables to hold the existing data
    try {
      await connection.execute('CREATE TABLE SRRA.DEPARTMENT_TEMP AS SELECT * FROM SRRA.DEPARTMENT');
      console.info('- Created DEPARTMENT_TEMP table');
    } catch (err) {
      if (err.errorNum === 955) { // ORA-00955: name is already used by an existing object
        console.info('- DEPARTMENT_TEMP table already exists');
      } else {
        console.error('- Error creating DEPARTMENT_TEMP:', err.message);
        throw err;
      }
    }
    
    try {
      await connection.execute('CREATE TABLE SRRA.RECEIPT_TEMP AS SELECT * FROM SRRA.RECEIPT');
      console.info('- Created RECEIPT_TEMP table');
    } catch (err) {
      if (err.errorNum === 955) { // ORA-00955: name is already used by an existing object
        console.info('- RECEIPT_TEMP table already exists');
      } else {
        console.error('- Error creating RECEIPT_TEMP:', err.message);
        throw err;
      }
    }
    
    // 2. Drop the existing constraints
    try {
      await connection.execute('ALTER TABLE SRRA.STUDENT DROP CONSTRAINT FK_DEPARTMENT');
      console.info('- Dropped FK_DEPARTMENT constraint');
    } catch (err) {
      console.warn('- Error dropping FK_DEPARTMENT constraint:', err.message);
    }
    
    try {
      await connection.execute('ALTER TABLE SRRA.RECEIPT DROP CONSTRAINT FK_STUDENT');
      console.info('- Dropped FK_STUDENT constraint');
    } catch (err) {
      console.warn('- Error dropping FK_STUDENT constraint:', err.message);
    }
    
    try {
      await connection.execute('ALTER TABLE SRRA.RECEIPT DROP CONSTRAINT FK_ENTERED_BY');
      console.info('- Dropped FK_ENTERED_BY constraint');
    } catch (err) {
      console.warn('- Error dropping FK_ENTERED_BY constraint:', err.message);
    }
    
    // 3. Drop the existing tables
    try {
      await connection.execute('DROP TABLE SRRA.RECEIPT');
      console.info('- Dropped RECEIPT table');
    } catch (err) {
      console.warn('- Error dropping RECEIPT table:', err.message);
    }
    
    try {
      await connection.execute('DROP TABLE SRRA.DEPARTMENT');
      console.info('- Dropped DEPARTMENT table');
    } catch (err) {
      console.warn('- Error dropping DEPARTMENT table:', err.message);
    }
    
    // 4. Create new tables with auto-generated IDs
    try {
      await connection.execute(`
        CREATE TABLE SRRA.DEPARTMENT (
          DEPARTMENT_ID VARCHAR2(15) DEFAULT 'D' || TO_CHAR(SRRA.DEPARTMENT_ID_SEQ.NEXTVAL, 'FM000000') PRIMARY KEY NOT NULL,
          DEPARTMENT_NAME VARCHAR2(150) NOT NULL,
          SEMESTERS_NO NUMBER(2) NOT NULL
        )
      `);
      console.info('- Created DEPARTMENT table with auto-generated ID');
    } catch (err) {
      console.error('- Error creating DEPARTMENT table:', err.message);
      throw err;
    }
    
    try {
      await connection.execute(`
        CREATE TABLE SRRA.RECEIPT (
          RECEIPT_ID VARCHAR2(15) DEFAULT 'R' || TO_CHAR(SRRA.RECEIPT_ID_SEQ.NEXTVAL, 'FM000000') PRIMARY KEY NOT NULL,
          STUDENT_ID VARCHAR2(15) NOT NULL,
          BANK_RECEIPT_NO VARCHAR2(50),
          ENTERED_BY VARCHAR2(15) NOT NULL,
          ENTRY_DATE DATE DEFAULT SYSDATE NOT NULL,
          AMOUNT_NUMBER NUMBER(10, 2) NOT NULL,
          AMOUNT_LETTERS VARCHAR2(200) NOT NULL,
          PAID_ITEMS VARCHAR2(3) NOT NULL,
          SEMESTER_NO NUMBER(2) NOT NULL,
          COMMENTS VARCHAR2(250)
        )
      `);
      console.info('- Created RECEIPT table with auto-generated ID');
    } catch (err) {
      console.error('- Error creating RECEIPT table:', err.message);
      throw err;
    }
    
    // 5. Restore the data from temporary tables
    try {
      await connection.execute(`
        INSERT INTO SRRA.DEPARTMENT (DEPARTMENT_ID, DEPARTMENT_NAME, SEMESTERS_NO)
        SELECT DEPARTMENT_ID, DEPARTMENT_NAME, SEMESTERS_NO FROM SRRA.DEPARTMENT_TEMP
      `);
      console.info('- Restored data to DEPARTMENT table');
    } catch (err) {
      console.error('- Error restoring DEPARTMENT data:', err.message);
    }
    
    try {
      await connection.execute(`
        INSERT INTO SRRA.RECEIPT (RECEIPT_ID, STUDENT_ID, BANK_RECEIPT_NO, ENTERED_BY, ENTRY_DATE, AMOUNT_NUMBER, AMOUNT_LETTERS, PAID_ITEMS, SEMESTER_NO, COMMENTS)
        SELECT RECEIPT_ID, STUDENT_ID, BANK_RECEIPT_NO, ENTERED_BY, ENTRY_DATE, AMOUNT_NUMBER, AMOUNT_LETTERS, PAID_ITEMS, SEMESTER_NO, COMMENTS FROM SRRA.RECEIPT_TEMP
      `);
      console.info('- Restored data to RECEIPT table');
    } catch (err) {
      console.error('- Error restoring RECEIPT data:', err.message);
    }
    
    // 6. Drop the temporary tables
    try {
      await connection.execute('DROP TABLE SRRA.DEPARTMENT_TEMP');
      console.info('- Dropped DEPARTMENT_TEMP table');
    } catch (err) {
      console.warn('- Error dropping DEPARTMENT_TEMP table:', err.message);
    }
    
    try {
      await connection.execute('DROP TABLE SRRA.RECEIPT_TEMP');
      console.info('- Dropped RECEIPT_TEMP table');
    } catch (err) {
      console.warn('- Error dropping RECEIPT_TEMP table:', err.message);
    }
    
    // 7. Add constraints back
    try {
      await connection.execute(`
        ALTER TABLE SRRA.STUDENT
        ADD CONSTRAINT FK_DEPARTMENT FOREIGN KEY (DEPARTMENT_ID) REFERENCES SRRA.DEPARTMENT (DEPARTMENT_ID)
      `);
      console.info('- Added FK_DEPARTMENT constraint');
    } catch (err) {
      console.warn('- Error adding FK_DEPARTMENT constraint:', err.message);
    }
    
    try {
      await connection.execute(`
        ALTER TABLE SRRA.RECEIPT
        ADD CONSTRAINT FK_STUDENT FOREIGN KEY (STUDENT_ID) REFERENCES SRRA.STUDENT (STUDENT_ID)
      `);
      console.info('- Added FK_STUDENT constraint');
    } catch (err) {
      console.warn('- Error adding FK_STUDENT constraint:', err.message);
    }
    
    try {
      await connection.execute(`
        ALTER TABLE SRRA.RECEIPT
        ADD CONSTRAINT FK_ENTERED_BY FOREIGN KEY (ENTERED_BY) REFERENCES SRRA.USERS (USER_ID)
      `);
      console.info('- Added FK_ENTERED_BY constraint');
    } catch (err) {
      console.warn('- Error adding FK_ENTERED_BY constraint:', err.message);
    }
    
    // 8. Add indexes
    try {
      await connection.execute('CREATE INDEX IDX_STUDENT_ID ON SRRA.RECEIPT (STUDENT_ID)');
      console.info('- Created IDX_STUDENT_ID index');
    } catch (err) {
      if (err.errorNum === 955) { // ORA-00955: name is already used by an existing object
        console.info('- IDX_STUDENT_ID index already exists');
      } else {
        console.warn('- Error creating IDX_STUDENT_ID index:', err.message);
      }
    }
    
    try {
      await connection.execute('ALTER TABLE SRRA.DEPARTMENT ADD CONSTRAINT UQ_DEPARTMENT_NAME UNIQUE (DEPARTMENT_NAME)');
      console.info('- Added UQ_DEPARTMENT_NAME constraint');
    } catch (err) {
      if (err.errorNum === 955) { // ORA-00955: name is already used by an existing object
        console.info('- UQ_DEPARTMENT_NAME constraint already exists');
      } else {
        console.warn('- Error adding UQ_DEPARTMENT_NAME constraint:', err.message);
      }
    }
    
    console.info('Migration completed.');
  } catch (err) {
    console.error('Error executing migration:', err);
    throw err;
  }
}

/**
 * Main function to migrate the database
 */
async function migrateDatabase() {
  let connection;
  
  try {
    console.info('Starting database migration...');
    
    // Create connection
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING
    });
    
    console.info('Connected to database');
    
    // Execute the migration steps directly
    await executeMigration(connection, 'db-migrate.sql');
    
    console.info('Database migration completed successfully');
    
    // Commit changes
    await connection.commit();
    
  } catch (err) {
    console.error('Error migrating database:', err);
    if (connection) {
      try {
        await connection.rollback();
        console.info('Changes rolled back due to error');
      } catch (rollbackErr) {
        console.error('Error rolling back changes:', rollbackErr);
      }
    }
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.info('Database connection closed');
      } catch (err) {
        console.error('Error closing database connection:', err);
      }
    }
  }
}

// Run the script if it's executed directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.info('Database migration script completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Database migration script failed:', err);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = { migrateDatabase };
} 