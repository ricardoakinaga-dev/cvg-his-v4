import { getPool } from '@cvg-his-v2/shared-database';

const DATABASE_POOL_NOT_INITIALIZED =
  'Database pool not initialized. Call createDatabaseClient first.';

export function getInitializedDatabasePool(): ReturnType<typeof getPool> | undefined {
  try {
    return getPool();
  } catch (error) {
    if (error instanceof Error && error.message === DATABASE_POOL_NOT_INITIALIZED) {
      return undefined;
    }
    throw error;
  }
}
