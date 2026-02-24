import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { dirname, resolve } from 'node:path';
import { Pool } from 'pg';
import { fileURLToPath } from 'node:url';

import * as schema from './schema/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to initialize @cvg-his/db');
}

export const pool = new Pool({
  connectionString: databaseUrl
});

export const db = drizzle(pool, { schema });

export async function closeDbConnection(): Promise<void> {
  await pool.end();
}
