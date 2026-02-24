import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDbConnection, pool } from './connection.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../migrations');
const MIGRATION_LOCK_ID = 817110001;
async function hasPublicTable(client, tableName) {
    const result = await client.query(`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = $1
      ) as present
    `, [tableName]);
    return Boolean(result.rows[0]?.present);
}
async function getDrizzleMigrationCount(client) {
    try {
        const result = await client.query('select count(*)::int as count from drizzle.__drizzle_migrations');
        return Number(result.rows[0]?.count ?? 0);
    }
    catch {
        return 0;
    }
}
export async function runMigrations() {
    const client = await pool.connect();
    const migrationDb = drizzle(client);
    try {
        await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
        const hasAccountsBefore = await hasPublicTable(client, 'accounts');
        const migrationCount = await getDrizzleMigrationCount(client);
        // Local safety net: if public schema was reset but drizzle history remained,
        // clear migration history so Drizzle can replay the SQL files.
        if (!hasAccountsBefore && migrationCount > 0 && process.env.NODE_ENV !== 'production') {
            console.warn(`[db:migrate] Detected empty public schema with stale drizzle migration history (${migrationCount} rows). Resetting drizzle.__drizzle_migrations in non-production mode.`);
            await client.query('truncate table drizzle.__drizzle_migrations');
        }
        await migrate(migrationDb, { migrationsFolder });
        const hasAccountsAfter = await hasPublicTable(client, 'accounts');
        if (!hasAccountsAfter) {
            throw new Error('Migrations finished but public.accounts is missing. Check drizzle.__drizzle_migrations state and rerun migrations.');
        }
        console.info('Migrations applied successfully.');
    }
    finally {
        try {
            await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
        }
        finally {
            client.release();
        }
        await closeDbConnection();
    }
}
const invokedAsScript = /(?:^|[\\/])migrate\.(?:ts|js)$/.test(process.argv[1] ?? '');
if (invokedAsScript) {
    runMigrations().catch((error) => {
        console.error('Migration failed.', error);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map