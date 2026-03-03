"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initializeDatabase = initializeDatabase;
const pg_1 = require("pg");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const env_1 = require("./env");
const logger_1 = require("./logger");
// ------------------------------------------------------------------
// PostgreSQL Adapter (Production / Test)
// ------------------------------------------------------------------
class PostgresAdapter {
    pool;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({
            connectionString,
            max: env_1.env.NODE_ENV === 'production' ? 50 : 10,
            idleTimeoutMillis: 30000,
        });
        this.pool.on('error', (err) => {
            logger_1.logger.error('Unexpected error on idle pg client', err);
            process.exit(-1);
        });
    }
    async query(sql, params = []) {
        const { rows } = await this.pool.query(sql, params);
        return rows;
    }
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const adapter = {
                query: async (sql, params = []) => {
                    const { rows } = await client.query(sql, params);
                    return rows;
                },
                transaction: async () => { throw new Error('Nested transactions not supported'); }
            };
            const result = await callback(adapter);
            await client.query('COMMIT');
            return result;
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
}
// ------------------------------------------------------------------
// SQLite Adapter (Local Development)
// ------------------------------------------------------------------
class SqliteAdapter {
    db;
    constructor(filename) {
        this.db = new better_sqlite3_1.default(filename.replace('sqlite:', ''), { verbose: console.log });
        this.db.pragma('journal_mode = WAL');
    }
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
                const stmt = this.db.prepare(sql);
                if (isSelect) {
                    resolve(stmt.all(...params));
                }
                else {
                    const info = stmt.run(...params);
                    resolve([info]);
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
    async transaction(callback) {
        // In SQLite Better-Sqlite3, transactions are synchronous blocks, but we wrap async for interface parity
        const transactionFn = this.db.transaction((cb) => cb());
        let result;
        try {
            this.db.exec('BEGIN IMMEDIATE');
            result = await callback(this);
            this.db.exec('COMMIT');
            return result;
        }
        catch (err) {
            this.db.exec('ROLLBACK');
            throw err;
        }
    }
}
function initializeDatabase() {
    if (env_1.env.DATABASE_URL.startsWith('sqlite:')) {
        logger_1.logger.info('Initializing SQLite database adapter for local development');
        exports.db = new SqliteAdapter(env_1.env.DATABASE_URL);
    }
    else if (env_1.env.DATABASE_URL.startsWith('postgresql:') || env_1.env.DATABASE_URL.startsWith('postgres:')) {
        logger_1.logger.info('Initializing PostgreSQL database adapter');
        exports.db = new PostgresAdapter(env_1.env.DATABASE_URL);
    }
    else {
        throw new Error('Unsupported DATABASE_URL protocol. Must be sqlite: or postgresql:');
    }
}
