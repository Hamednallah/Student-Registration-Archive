#!/usr/bin/env node
/**
 * Database Migration Runner
 * Applies all SQL migrations in order from db/migrations/
 * Tracks applied migrations in a `_migrations` table.
 *
 * Usage: pnpm db:migrate
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { env } from '../src/config/env';

function getDbPath(databaseUrl: string): string {
    return databaseUrl.replace('sqlite:', '');
}

async function runMigrations() {
    if (!env.DATABASE_URL.startsWith('sqlite:')) {
        console.error('Migration runner currently supports SQLite only. Use Flyway or Atlas for PostgreSQL.');
        process.exit(1);
    }

    const dbPath = getDbPath(env.DATABASE_URL);
    const migrationsDir = path.join(__dirname, '../../db/migrations');

    console.log(`Running migrations on: ${dbPath}`);

    // Ensure data dir exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Create migrations tracking table
    db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const appliedMigrations = db.prepare('SELECT filename FROM _migrations').all() as { filename: string }[];
    const appliedSet = new Set(appliedMigrations.map(m => m.filename));

    let applied = 0;
    for (const file of migrationFiles) {
        if (appliedSet.has(file)) {
            console.log(`  ✓ ${file} (already applied)`);
            continue;
        }

        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        console.log(`  ↑ Applying ${file}...`);

        try {
            db.exec(sql);
            db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
            console.log(`  ✓ ${file} done`);
            applied++;
        } catch (err) {
            console.error(`  ✗ ${file} FAILED:`, err);
            process.exit(1);
        }
    }

    console.log(`\nMigrations complete. Applied ${applied} new migration(s).`);
    db.close();
}

runMigrations().catch(console.error);
