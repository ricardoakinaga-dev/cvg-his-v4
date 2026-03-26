import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas/index.js';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export function createDatabaseClient(connectionString: string) {
  pool = new Pool({ connectionString });
  db = drizzle(pool, { schema });
  return db;
}

export function getDatabaseClient() {
  if (!db) {
    throw new Error('Database client not initialized. Call createDatabaseClient first.');
  }
  return db;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createDatabaseClient first.');
  }
  return pool;
}

export async function closeDatabaseClient() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export async function checkDatabaseHealth(): Promise<{ healthy: boolean; detail: string }> {
  try {
    if (!pool) {
      return { healthy: false, detail: 'Database pool not initialized' };
    }
    const result = await pool.query('SELECT 1');
    return { healthy: true, detail: 'Database connection healthy' };
  } catch (error) {
    return {
      healthy: false,
      detail: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

export type DatabaseClient = ReturnType<typeof drizzle>;
export { schema };
