import { SpanStatusCode, trace } from '@opentelemetry/api';
import { drizzle, type NodePgDatabase, type NodePgClient } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as schema from './schemas/index.js';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;
const activeDatabaseContext = new AsyncLocalStorage<DatabaseExecutionContext>();

export interface DatabaseExecutionContext {
  readonly client: PoolClient;
  readonly accountId?: string;
}

interface DatabaseRuntimeRoleRow {
  readonly role_name: string;
  readonly rolsuper: boolean;
  readonly rolbypassrls: boolean;
  readonly rolcreatedb: boolean;
  readonly rolcreaterole: boolean;
  readonly rolcanlogin: boolean;
  readonly rolreplication: boolean;
  readonly owned_tenant_tables: string | number;
  readonly role_memberships: string | number;
}

export interface DatabaseRoleQueryable {
  query(queryText: string): Promise<{ rows: readonly DatabaseRuntimeRoleRow[] }>;
}

export interface DatabaseRuntimeRoleInspection {
  readonly roleName: string;
  readonly canLogin: boolean;
  readonly isSuperuser: boolean;
  readonly bypassesRls: boolean;
  readonly canCreateDatabase: boolean;
  readonly canCreateRole: boolean;
  readonly canReplicate: boolean;
  readonly ownedTenantTables: number;
  readonly roleMemberships: number;
}

type QueryArgs = Parameters<Pool['query']>;
type QueryResult = Awaited<ReturnType<Pool['query']>>;

export function getActiveDatabaseContext(): DatabaseExecutionContext | undefined {
  return activeDatabaseContext.getStore();
}

export function runWithDatabaseClient<T>(
  client: PoolClient,
  scope: { readonly accountId?: string },
  fn: () => T
): T {
  return activeDatabaseContext.run(
    Object.freeze({ client, accountId: scope.accountId }),
    fn
  );
}

function routePoolQueriesThroughActiveClient(targetPool: Pool): Pool {
  const originalQuery = targetPool.query.bind(targetPool);
  targetPool.query = ((...args: QueryArgs) => {
    const active = getActiveDatabaseContext();
    if (active) {
      return (active.client.query as (...queryArgs: QueryArgs) => unknown)(...args);
    }
    return originalQuery(...args);
  }) as Pool['query'];
  return targetPool;
}

function extractQueryText(args: readonly unknown[]): string {
  const firstArg = args[0];
  if (typeof firstArg === 'string') {
    return firstArg;
  }

  if (typeof firstArg === 'object' && firstArg !== null && 'text' in firstArg) {
    const text = (firstArg as { text?: unknown }).text;
    return typeof text === 'string' ? text : 'unknown';
  }

  return 'unknown';
}

function summarizeQuery(text: string): { operation: string; statement: string } {
  const compact = text.replace(/\s+/g, ' ').trim();
  const statement = compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
  const match = /^([a-zA-Z]+)/.exec(compact);
  return {
    operation: match?.[1]?.toUpperCase() ?? 'UNKNOWN',
    statement
  };
}

async function withDatabaseSpan<T>(
  args: readonly unknown[],
  fn: () => Promise<T>
): Promise<T> {
  const text = extractQueryText(args);
  const { operation, statement } = summarizeQuery(text);
  const tracer = trace.getTracer('cvg-his-v2.database');

  return await tracer.startActiveSpan(
    `db.query ${operation}`,
    {
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.statement': statement
      }
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

function instrumentPool(targetPool: Pool): Pool {
  const originalQuery = targetPool.query.bind(targetPool);
  const originalPromiseQuery = originalQuery as (...args: QueryArgs) => Promise<QueryResult>;
  targetPool.query = ((...args: QueryArgs) => {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      return originalQuery(...args);
    }

    return withDatabaseSpan(args, () => originalPromiseQuery(...args));
  }) as Pool['query'];

  const originalConnect = targetPool.connect.bind(targetPool);
  targetPool.connect = (async (): Promise<PoolClient> => {
    const client = await originalConnect();
    const instrumentedClient = client as PoolClient & { __otelInstrumented?: boolean };

    if (!instrumentedClient.__otelInstrumented) {
      const originalClientQuery = client.query.bind(client);
      const originalClientPromiseQuery =
        originalClientQuery as (...args: Parameters<PoolClient['query']>) => Promise<unknown>;
      instrumentedClient.query = ((...args: Parameters<PoolClient['query']>) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          return originalClientQuery(...args);
        }

        return withDatabaseSpan(args, () => originalClientPromiseQuery(...args));
      }) as PoolClient['query'];
      instrumentedClient.__otelInstrumented = true;
    }

    return client;
  }) as Pool['connect'];

  return targetPool;
}

export function createDatabaseClient(connectionString: string) {
  if (pool && db) {
    return db;
  }

  const basePool = routePoolQueriesThroughActiveClient(new Pool({ connectionString }));
  const otelEnabled = process.env.OTEL_ENABLED === 'true' || process.env.OTEL_ENABLED === '1';
  pool = otelEnabled ? instrumentPool(basePool) : basePool;
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

export async function inspectDatabaseRuntimeRole(
  queryable: DatabaseRoleQueryable
): Promise<DatabaseRuntimeRoleInspection> {
  const result = await queryable.query(`
    SELECT
      current_user AS role_name,
      role.rolsuper,
      role.rolbypassrls,
      role.rolcreatedb,
      role.rolcreaterole,
      role.rolcanlogin,
      role.rolreplication,
      (
        SELECT COUNT(*)::int
        FROM pg_class tenant_table
        JOIN pg_namespace namespace ON namespace.oid = tenant_table.relnamespace
        JOIN information_schema.columns tenant_column
          ON tenant_column.table_schema = namespace.nspname
         AND tenant_column.table_name = tenant_table.relname
         AND tenant_column.column_name = 'account_id'
        WHERE namespace.nspname = 'public'
          AND tenant_table.relkind IN ('r', 'p')
          AND tenant_table.relowner = role.oid
      ) AS owned_tenant_tables,
      (
        SELECT COUNT(*)::int
        FROM pg_auth_members membership
        WHERE membership.member = role.oid
      ) AS role_memberships
    FROM pg_roles role
    WHERE role.rolname = current_user
  `);
  const row = result.rows[0];

  if (!row) {
    throw new Error('Unable to inspect the active PostgreSQL role');
  }

  const ownedTenantTables = Number(row.owned_tenant_tables);
  if (!Number.isSafeInteger(ownedTenantTables) || ownedTenantTables < 0) {
    throw new Error('PostgreSQL returned an invalid tenant table ownership count');
  }
  const roleMemberships = Number(row.role_memberships);
  if (!Number.isSafeInteger(roleMemberships) || roleMemberships < 0) {
    throw new Error('PostgreSQL returned an invalid role membership count');
  }

  return Object.freeze({
    roleName: row.role_name,
    canLogin: row.rolcanlogin,
    isSuperuser: row.rolsuper,
    bypassesRls: row.rolbypassrls,
    canCreateDatabase: row.rolcreatedb,
    canCreateRole: row.rolcreaterole,
    canReplicate: row.rolreplication,
    ownedTenantTables,
    roleMemberships
  });
}

export async function assertDatabaseRuntimeRoleIsRestricted(
  queryable: DatabaseRoleQueryable
): Promise<DatabaseRuntimeRoleInspection> {
  const inspection = await inspectDatabaseRuntimeRole(queryable);
  const violations = [
    inspection.canLogin ? null : 'LOGIN is disabled',
    inspection.isSuperuser ? 'has SUPERUSER' : null,
    inspection.bypassesRls ? 'has BYPASSRLS' : null,
    inspection.canCreateDatabase ? 'has CREATEDB' : null,
    inspection.canCreateRole ? 'has CREATEROLE' : null,
    inspection.canReplicate ? 'has REPLICATION' : null,
    inspection.ownedTenantTables > 0
      ? `owns ${inspection.ownedTenantTables} tenant table(s)`
      : null,
    inspection.roleMemberships > 0
      ? `can assume ${inspection.roleMemberships} role(s)`
      : null
  ].filter((violation): violation is string => violation !== null);

  if (violations.length > 0) {
    throw new Error(
      `PostgreSQL runtime role "${inspection.roleName}" violates least privilege: ${violations.join(', ')}`
    );
  }

  return inspection;
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

export type DatabaseClient = NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient };
export { schema };
