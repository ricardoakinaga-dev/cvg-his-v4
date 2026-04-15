import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { dirname, resolve } from 'node:path';
import { Pool } from 'pg';
import { fileURLToPath } from 'node:url';

import * as schema from './schema/index.js';

export type { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, '../../../.env') });
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to initialize @cvg-his/db');
}

const poolMaxConnections = parseInt(process.env.POSTGRES_MAX_CONNECTIONS ?? '20', 10);
const poolMinConnections = parseInt(process.env.POSTGRES_POOL_MIN ?? '2', 10);
const poolIdleTimeoutMs = parseInt(process.env.POSTGRES_IDLE_TIMEOUT_MS ?? '30000', 10);
const poolConnectionTimeoutMs = parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT_MS ?? '5000', 10);

export const pool = new Pool({
  connectionString: databaseUrl,
  max: poolMaxConnections,
  min: poolMinConnections,
  idleTimeoutMillis: poolIdleTimeoutMs,
  connectionTimeoutMillis: poolConnectionTimeoutMs
});

export const db = drizzle(pool, { schema });

export async function closeDbConnection(): Promise<void> {
  await pool.end();
}
