/**
 * SQLite Database Adapter
 *
 * Drop-in replacement for the Oracle database.js
 * Maintains the same API: { initialize, close, executeQuery }
 * Translates Oracle-specific SQL to SQLite-compatible SQL.
 *
 * To use: replace server/config/database.js with this file.
 * Run: npm install better-sqlite3
 * Then: node scripts/db-sqlite-setup.js
 */

const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

// ─── Lazy-load better-sqlite3 ────────────────────────────────────────────────
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  logger.error('better-sqlite3 not found. Run: npm install better-sqlite3');
  process.exit(1);
}

// ─── DB file location ─────────────────────────────────────────────────────────
const DB_PATH = process.env.SQLITE_PATH ||
  path.join(__dirname, '..', '..', 'data', 'psau_dev.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

/** @type {import('better-sqlite3').Database} */
let db = null;

// ─── SQL Translation Layer ────────────────────────────────────────────────────

/**
 * Detect whether a query is a sequence/DUAL query
 * e.g. SELECT SRRA.RECEIPT_ID_SEQ.NEXTVAL AS NEW_ID FROM DUAL
 */
function isSequenceQuery(sql) {
  return /NEXTVAL\s+AS\s+\w+\s+FROM\s+DUAL/i.test(sql) ||
    /FROM\s+DUAL/i.test(sql);
}

/**
 * Execute a sequence query and return the next value.
 * Sequence name is detected from the SQL.
 */
function executeSequenceQuery(sql) {
  // Extract sequence name: SRRA.DEPARTMENT_ID_SEQ → DEPARTMENT_ID_SEQ
  const seqMatch = sql.match(/SRRA\.(\w+SEQ)\./i) ||
    sql.match(/(\w+SEQ)\./i);
  const seqName = seqMatch ? seqMatch[1] : 'DEFAULT_SEQ';

  // Extract alias for the result column
  const aliasMatch = sql.match(/NEXTVAL\s+AS\s+(\w+)/i);
  const alias = aliasMatch ? aliasMatch[1] : 'NEW_ID';

  // Ensure sequences table exists
  db.exec(`CREATE TABLE IF NOT EXISTS _sequences (
    name TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0
  )`);

  // Atomically increment and return new value
  const upsert = db.prepare(`
    INSERT INTO _sequences (name, value) VALUES (?, 1)
    ON CONFLICT(name) DO UPDATE SET value = value + 1
    RETURNING value
  `);

  let result;
  try {
    result = upsert.get(seqName);
  } catch {
    // Older SQLite without RETURNING support
    db.prepare(`
      INSERT INTO _sequences (name, value) VALUES (?, 1)
      ON CONFLICT(name) DO UPDATE SET value = value + 1
    `).run(seqName);
    result = db.prepare('SELECT value FROM _sequences WHERE name = ?').get(seqName);
  }

  return { rows: [{ [alias]: result.value }] };
}

/**
 * Master SQL translator: Oracle → SQLite
 */
function translateSQL(sql) {
  // 1. Strip schema prefix
  sql = sql.replace(/\bSRRA\./gi, '');

  // 2. SYSDATE
  sql = sql.replace(/\bSYSDATE\b/gi, "datetime('now')");

  // 3. DATE filter: TRUNC(col) = TO_DATE(:param, 'YYYY-MM-DD')
  sql = sql.replace(
    /TRUNC\(([^)]+)\)\s*=\s*TO_DATE\(:(\w+),\s*'[^']+'\)/gi,
    "DATE($1) = @$2"
  );

  // 4. Handle Oracle ROWNUM pagination
  //    Pattern at the end: ) [alias] \n WHERE rn > :offset AND rn <= :offset + :limit
  if (/WHERE\s+rn\s*>\s*:offset\s+AND\s+rn\s*<=\s*:offset\s*\+\s*:limit/i.test(sql)) {
    sql = translateRownumPagination(sql);
  }

  // 5. Convert Oracle :param → SQLite @param  (only if not already done)
  //    Avoid converting @param that came from step 3
  //sql = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '@$1');
  return sql;
}

/**
 * Convert Oracle ROWNUM pagination to SQLite LIMIT/OFFSET.
 *
 * Handles two patterns found in this codebase:
 *
 * Pattern A — getAllStudents / getAllReceipts (single wrap):
 *   SELECT outer_cols FROM (
 *     SELECT inner_cols, ROWNUM AS rn
 *     FROM table JOIN ... [WHERE ...] ORDER BY ...
 *   ) alias
 *   WHERE rn > :offset AND rn <= :offset + :limit
 *
 * Pattern B — searchStudents (double wrap):
 *   SELECT * FROM (
 *     SELECT t.*, ROWNUM AS rn FROM (
 *       SELECT ... FROM ... WHERE ... ORDER BY ...
 *     ) t
 *   ) WHERE rn > :offset AND rn <= :offset + :limit
 */
function translateRownumPagination(sql) {
  // Remove the terminal ROWNUM filter (closes the outermost subquery)
  sql = sql.replace(
    /\)\s*(?:\w+)?\s*\n?\s*WHERE\s+rn\s*>\s*:offset\s+AND\s+rn\s*<=\s*:offset\s*\+\s*:limit\s*$/is,
    ')'
  );

  // Remove ROWNUM AS rn expressions
  sql = sql.replace(/,\s*ROWNUM\s+AS\s+rn\b/gi, '');

  // ── Pattern B: double-nest unwrap ──────────────────────────────────────────
  // SELECT * FROM ( SELECT t.* FROM ( <inner> ) t )
  const doubleNest = sql.match(
    /^\s*SELECT\s+\*\s+FROM\s*\(\s*SELECT\s+t\.\*\s+FROM\s*\(\s*([\s\S]+?)\s*\)\s*(?:AS\s+)?t\s*\)\s*$/is
  );
  if (doubleNest) {
    return doubleNest[1].trim() + '\nLIMIT @limit OFFSET @offset';
  }

  // ── Pattern A: single-nest ─────────────────────────────────────────────────
  // The outer ) closes the inner subquery; add LIMIT/OFFSET
  // The outer query is still valid SQLite: SELECT cols FROM (...) alias LIMIT x OFFSET y
  sql = sql.trimEnd();
  return sql + '\nLIMIT @limit OFFSET @offset';
}

/**
 * Normalise parameter object keys to @-prefixed names for better-sqlite3.
 * Converts { foo: 1, bar: 2 } → { '@foo': 1, '@bar': 2 } if needed.
 * better-sqlite3 named params already use @name.
 */
function normalizeParams(params) {
  /*if (!params || typeof params !== 'object' || Array.isArray(params)) return params;
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    // Accept both 'foo' and '@foo' as keys; always store as '@foo'
    const key = k.startsWith('@') ? k : `@${k}`;
    out[key] = v;
  }
  return out;*/
  return params || {};
}

/**
 * Normalise a row to have UPPERCASE column names
 * (Oracle returns uppercase; SQLite preserves original case).
 */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.toUpperCase()] = v;
  }
  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the SQLite connection.
 * Called once at startup (replaces Oracle pool creation).
 */
async function initialize() {
  try {
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development'
        ? (msg) => logger.debug('SQLite:', msg)
        : undefined
    });

    // Performance pragmas
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');

    logger.info(`SQLite database connected: ${DB_PATH}`);
    return true;
  } catch (err) {
    logger.error('Failed to open SQLite database:', err.message);
    throw err;
  }
}

/**
 * Close the database connection.
 */
async function close() {
  if (db) {
    db.close();
    db = null;
    logger.info('SQLite database closed');
  }
}

/**
 * Execute a SQL query.
 * Keeps the same signature as the Oracle executeQuery:
 *   executeQuery(sql, params?) → { rows: [...] }
 *
 * @param {string}  sql    - Oracle-style SQL
 * @param {object}  [params] - Named bind params { paramName: value }
 * @returns {Promise<{ rows: Array }>}
 */
async function executeQuery(sql, params = {}) {
  if (!db) {
    // Auto-connect if not initialised (dev convenience)
    await initialize();
  }

  try {
    const trimmed = sql.trim();

    // ── Sequence / DUAL queries ──────────────────────────────────────────────
    if (isSequenceQuery(trimmed)) {
      return executeSequenceQuery(trimmed);
    }

    // ── Translate to SQLite SQL ──────────────────────────────────────────────
    const translatedSQL = translateSQL(trimmed);
    const sqliteParams = normalizeParams(params);

    logger.debug('SQLite query:', { sql: translatedSQL, params: sqliteParams });

    const stmt = db.prepare(translatedSQL);
    const isSelect = /^\s*SELECT/i.test(translatedSQL);

    if (isSelect) {
      const rows = stmt.all(sqliteParams || {}).map(normalizeRow);
      return { rows };
    } else {
      // INSERT / UPDATE / DELETE
      const info = stmt.run(sqliteParams || {});
      return {
        rows: [],
        rowsAffected: info.changes,
        lastInsertRowid: info.lastInsertRowid
      };
    }
  } catch (err) {
    logger.error('SQLite query error:', {
      error: err.message,
      sql: sql.trim().substring(0, 200)
    });
    throw new Error(`Database error: ${err.message}`);
  }
}

/**
 * Get a connection object (compatibility shim — not needed for SQLite,
 * but keeps any code that calls db.getConnection() from breaking).
 */
async function getConnection() {
  if (!db) await initialize();
  return {
    execute: (sql, params) => executeQuery(sql, params),
    close: async () => { } // no-op; SQLite uses a single shared connection
  };
}

module.exports = {
  initialize,
  close,
  getConnection,
  executeQuery
};
