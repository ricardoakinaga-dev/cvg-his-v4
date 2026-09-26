export const MIGRATIONS_TABLE = 'drizzle_migrations';

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function createAppliedMigrationsQuery(schema?: string): string {
  const table = schema
    ? `${quoteIdentifier(schema)}.${quoteIdentifier(MIGRATIONS_TABLE)}`
    : MIGRATIONS_TABLE;

  return `SELECT migration_name AS "migrationName", hash
       FROM ${table}
      ORDER BY id ASC`;
}

export const APPLIED_MIGRATIONS_QUERY = createAppliedMigrationsQuery();
