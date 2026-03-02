/**
 * SQLite Schema Setup Script
 * Port Sudan Ahlia University — Student Registration Receipts Archive
 *
 * Creates all tables, indexes, and seeds an initial admin user.
 *
 * Usage:
 *   node scripts/db-sqlite-setup.js
 *
 * Prerequisites:
 *   npm install better-sqlite3 bcrypt
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.error('❌  better-sqlite3 not installed. Run:  npm install better-sqlite3');
  process.exit(1);
}

// ─── DB path ──────────────────────────────────────────────────────────────────
const DB_PATH = process.env.SQLITE_PATH ||
  path.join(__dirname, '..', '..', 'data', 'psau_dev.db');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`📁  Created data directory: ${dataDir}`);
}

console.log(`\n🛠   PSAU SQLite Setup`);
console.log(`    DB path: ${DB_PATH}\n`);

// ─── Open DB ──────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);

// Performance and integrity pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// ─── Schema ───────────────────────────────────────────────────────────────────
const setupSchema = db.transaction(() => {

  // -- Sequences table (simulates Oracle SEQUENCE) ---------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS _sequences (
      name  TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    )
  `);
  console.log('✅  _sequences table ready');

  // -- DEPARTMENT ------------------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS DEPARTMENT (
      DEPARTMENT_ID   TEXT    PRIMARY KEY NOT NULL,
      DEPARTMENT_NAME TEXT    NOT NULL UNIQUE,
      SEMESTERS_NO    INTEGER NOT NULL,
      CHECK (SEMESTERS_NO > 0)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS IDX_DEPARTMENT_NAME
    ON DEPARTMENT (DEPARTMENT_NAME)
  `);
  console.log('✅  DEPARTMENT table ready');

  // -- USERS -----------------------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS USERS (
      USER_ID         TEXT PRIMARY KEY NOT NULL,
      USER_NAME       TEXT NOT NULL UNIQUE,
      HASHED_PASSWORD TEXT NOT NULL,
      ROLE            TEXT NOT NULL DEFAULT 'U',
      CHECK (ROLE IN ('A', 'U'))
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS IDX_USER_NAME
    ON USERS (USER_NAME)
  `);
  console.log('✅  USERS table ready');

  // -- STUDENT ---------------------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS STUDENT (
      STUDENT_ID          TEXT    PRIMARY KEY NOT NULL,
      FULL_NAME           TEXT    NOT NULL,
      SEMESTER_NO         INTEGER,
      DEPARTMENT_ID       TEXT,
      REGISTRATION_STATUS TEXT    DEFAULT 'P',
      CHECK (SEMESTER_NO > 0),
      FOREIGN KEY (DEPARTMENT_ID) REFERENCES DEPARTMENT (DEPARTMENT_ID)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS IDX_STUDENT_NAME
    ON STUDENT (FULL_NAME)
  `);
  console.log('✅  STUDENT table ready');

  // -- RECEIPT ---------------------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS RECEIPT (
      RECEIPT_ID      TEXT    PRIMARY KEY NOT NULL,
      STUDENT_ID      TEXT    NOT NULL,
      BANK_RECEIPT_NO TEXT,
      ENTERED_BY      TEXT    NOT NULL,
      ENTRY_DATE      TEXT    NOT NULL DEFAULT (datetime('now')),
      AMOUNT_NUMBER   REAL    NOT NULL,
      AMOUNT_LETTERS  TEXT    NOT NULL,
      PAID_ITEMS      TEXT    NOT NULL,
      SEMESTER_NO     INTEGER NOT NULL,
      COMMENTS        TEXT,
      CHECK (SEMESTER_NO > 0),
      FOREIGN KEY (STUDENT_ID)  REFERENCES STUDENT (STUDENT_ID),
      FOREIGN KEY (ENTERED_BY)  REFERENCES USERS   (USER_ID)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS IDX_RECEIPT_STUDENT_ID
    ON RECEIPT (STUDENT_ID)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS IDX_RECEIPT_ENTRY_DATE
    ON RECEIPT (ENTRY_DATE)
  `);
  console.log('✅  RECEIPT table ready');

});

// Run schema creation
try {
  setupSchema();
} catch (err) {
  console.error('❌  Schema setup failed:', err.message);
  db.close();
  process.exit(1);
}

// ─── Seed admin user ──────────────────────────────────────────────────────────
async function seedAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const adminId       = process.env.ADMIN_ID || 'ADMIN1';

  const existing = db.prepare('SELECT USER_ID FROM USERS WHERE USER_NAME = ?').get(adminUsername);
  if (existing) {
    console.log(`ℹ️   Admin user '${adminUsername}' already exists — skipping seed`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  db.prepare(`
    INSERT INTO USERS (USER_ID, USER_NAME, HASHED_PASSWORD, ROLE)
    VALUES (?, ?, ?, 'A')
  `).run(adminId, adminUsername, hashedPassword);

  console.log(`\n👤  Admin user seeded:`);
  console.log(`    Username : ${adminUsername}`);
  console.log(`    Password : ${adminPassword}  ← change this immediately!`);
  console.log(`    User ID  : ${adminId}`);
}

// ─── Seed sample departments (optional dev data) ──────────────────────────────
function seedSampleData() {
  const deptCount = db.prepare('SELECT COUNT(*) AS n FROM DEPARTMENT').get().n;
  if (deptCount > 0) {
    console.log('\nℹ️   Sample data already present — skipping');
    return;
  }

  // Initialise sequences
  const upsertSeq = db.prepare(`
    INSERT INTO _sequences (name, value) VALUES (?, 0)
    ON CONFLICT(name) DO NOTHING
  `);
  upsertSeq.run('DEPARTMENT_ID_SEQ');
  upsertSeq.run('RECEIPT_ID_SEQ');

  // Sample departments
  const insertDept = db.prepare(`
    INSERT INTO DEPARTMENT (DEPARTMENT_ID, DEPARTMENT_NAME, SEMESTERS_NO)
    VALUES (?, ?, ?)
  `);

  const departments = [
    ['D000001', 'Computer Science & Information Technology', 8],
    ['D000002', 'Business Administration',                  8],
    ['D000003', 'Accounting & Finance',                     8],
    ['D000004', 'Law',                                      10],
    ['D000005', 'English Language',                         8],
  ];

  const seedDepts = db.transaction(() => {
    for (const d of departments) insertDept.run(...d);
    // Advance the sequence past existing IDs
    db.prepare(`UPDATE _sequences SET value = ? WHERE name = 'DEPARTMENT_ID_SEQ'`)
      .run(departments.length);
  });

  seedDepts();
  console.log(`\n📚  Seeded ${departments.length} sample departments`);
}

// ─── Run async seeds ──────────────────────────────────────────────────────────
(async () => {
  try {
    await seedAdminUser();
    seedSampleData();

    console.log('\n✨  Database setup complete.\n');
    console.log('Next steps:');
    console.log('  1. Replace  server/config/database.js  with  database.sqlite.js');
    console.log('  2. Run:     npm install better-sqlite3  (inside /server)');
    console.log('  3. Start:   npm run dev\n');
  } catch (err) {
    console.error('❌  Seed error:', err.message);
  } finally {
    db.close();
  }
})();
