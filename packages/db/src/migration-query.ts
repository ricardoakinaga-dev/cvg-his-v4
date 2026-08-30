export const MIGRATIONS_TABLE = 'drizzle_migrations';

export const APPLIED_MIGRATIONS_QUERY = `SELECT migration_name AS "migrationName", hash
       FROM ${MIGRATIONS_TABLE}
      ORDER BY id ASC`;
