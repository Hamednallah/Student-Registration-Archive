import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { env } from './env';
import { logger } from './logger';

export interface IDatabaseAdapter {
    query(sql: string, params?: any[]): Promise<any[]>;
    transaction<T>(callback: (client: IDatabaseAdapter) => Promise<T>): Promise<T>;
}

// ------------------------------------------------------------------
// PostgreSQL Adapter (Production / Test)
// ------------------------------------------------------------------
class PostgresAdapter implements IDatabaseAdapter {
    private pool: Pool;

    constructor(connectionString: string) {
        this.pool = new Pool({
            connectionString,
            max: env.NODE_ENV === 'production' ? 50 : 10,
            idleTimeoutMillis: 30000,
        });

        this.pool.on('error', (err) => {
            logger.error('Unexpected error on idle pg client', err);
            process.exit(-1);
        });
    }

    async query(sql: string, params: any[] = []): Promise<any[]> {
        const { rows } = await this.pool.query(sql, params);
        return rows;
    }

    async transaction<T>(callback: (client: IDatabaseAdapter) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const adapter: IDatabaseAdapter = {
                query: async (sql: string, params: any[] = []) => {
                    const { rows } = await client.query(sql, params);
                    return rows;
                },
                transaction: async () => { throw new Error('Nested transactions not supported'); }
            };

            const result = await callback(adapter);
            await client.query('COMMIT');
            return result;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

// ------------------------------------------------------------------
// SQLite Adapter (Local Development)
// ------------------------------------------------------------------
class SqliteAdapter implements IDatabaseAdapter {
    private db: Database.Database;

    constructor(filename: string) {
        this.db = new Database(filename.replace('sqlite:', ''), { verbose: console.log });
        this.db.pragma('journal_mode = WAL');
    }

    async query(sql: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            try {
                const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
                const stmt = this.db.prepare(sql);

                if (isSelect) {
                    resolve(stmt.all(...params));
                } else {
                    const info = stmt.run(...params);
                    resolve([info]);
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    async transaction<T>(callback: (client: IDatabaseAdapter) => Promise<T>): Promise<T> {
        // In SQLite Better-Sqlite3, transactions are synchronous blocks, but we wrap async for interface parity
        const transactionFn = this.db.transaction((cb: any) => cb());
        let result: T;

        try {
            this.db.exec('BEGIN IMMEDIATE');
            result = await callback(this);
            this.db.exec('COMMIT');
            return result;
        } catch (err) {
            this.db.exec('ROLLBACK');
            throw err;
        }
    }
}

// ------------------------------------------------------------------
// Database Initialization
// ------------------------------------------------------------------
export let db: IDatabaseAdapter;

export function initializeDatabase() {
    if (env.DATABASE_URL.startsWith('sqlite:')) {
        logger.info('Initializing SQLite database adapter for local development');
        db = new SqliteAdapter(env.DATABASE_URL);
    } else if (env.DATABASE_URL.startsWith('postgresql:') || env.DATABASE_URL.startsWith('postgres:')) {
        logger.info('Initializing PostgreSQL database adapter');
        db = new PostgresAdapter(env.DATABASE_URL);
    } else {
        throw new Error('Unsupported DATABASE_URL protocol. Must be sqlite: or postgresql:');
    }
}
