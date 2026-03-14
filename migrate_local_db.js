// Quick schema migration for local.db — adds Phase 1 columns to users table
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../psau/packages/api/db/local.db');
const db = new Database(dbPath);

// Check current columns
const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
console.log('Current users columns:', cols.join(', '));

const toAdd = [
    { name: 'student_id', def: 'TEXT' },
    { name: 'display_name', def: 'TEXT' },
    { name: 'faculty_id', def: 'INTEGER' },
    { name: 'department_id', def: 'INTEGER' },
    { name: 'last_login_at', def: 'TEXT' },
    { name: 'login_count', def: 'INTEGER DEFAULT 0' },
    { name: 'failed_logins', def: 'INTEGER DEFAULT 0' },
    { name: 'locked_until', def: 'TEXT' },
];

for (const col of toAdd) {
    if (!cols.includes(col.name)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
        console.log(`  ✓ Added column: ${col.name}`);
    } else {
        console.log(`  · Already exists: ${col.name}`);
    }
}

// Create user_activity_log if not exists
db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_log (
        log_id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id        INTEGER NOT NULL REFERENCES users(user_id),
        action         TEXT NOT NULL,
        entity_type    TEXT,
        entity_id      TEXT,
        description    TEXT,
        ip_address     TEXT,
        user_agent     TEXT,
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);
console.log('  ✓ user_activity_log table ready');

db.close();
console.log('\nDone! local.db is up to date.');
