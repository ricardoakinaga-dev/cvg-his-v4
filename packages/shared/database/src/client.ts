import { SpanStatusCode, trace } from '@opentelemetry/api';
import { drizzle, type NodePgDatabase, type NodePgClient } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import * as schema from './schemas/index.js';
import { getDatabaseTransactionScope } from './transaction-scope.js';

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let tenantAccountResolver: (() => string | undefined) | undefined;

type QueryArgs = Parameters<Pool['query']>;
type QueryResult = Awaited<ReturnType<Pool['query']>>;

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

function scopePoolQueries(targetPool: Pool): Pool {
  const originalQuery = targetPool.query.bind(targetPool);
  targetPool.query = ((...args: QueryArgs) => {
    const transactionScope = getDatabaseTransactionScope();
    if (transactionScope) {
      if (!transactionScope.isActive()) {
        throw new Error('Tenant transaction scope is no longer active');
      }
      if (transactionScope.pool !== targetPool) {
        throw new Error('Tenant transaction scope cannot be used with a different database pool');
      }
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        throw new Error('Callback-style pool queries are not supported inside a tenant unit of work');
      }
      return (transactionScope.client.query as (...queryArgs: QueryArgs) => Promise<QueryResult>)(
        ...args
      );
    }
    const accountId = tenantAccountResolver?.();
    const callback = args[args.length - 1];
    if (!accountId || typeof callback === 'function') {
      return originalQuery(...args);
    }

    return (async () => {
      const client = await targetPool.connect();
      let transactionStarted = false;
      let commitAttempted = false;
      let releaseError: Error | undefined;
      try {
        await client.query('BEGIN');
        transactionStarted = true;
        await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
        const result = await (client.query as (...queryArgs: QueryArgs) => Promise<QueryResult>)(
          ...args
        );
        commitAttempted = true;
        await client.query('COMMIT');
        return result;
      } catch (error) {
        if (commitAttempted) {
          releaseError = error instanceof Error ? error : new Error(String(error));
        }
        if (transactionStarted) {
          await client.query('ROLLBACK').catch((rollbackError: unknown) => {
            releaseError = rollbackError instanceof Error
              ? rollbackError
              : new Error(String(rollbackError));
          });
        }
        throw error;
      } finally {
        client.release(releaseError);
      }
    })();
  }) as Pool['query'];
  return targetPool;
}

export function configureDatabaseTenantAccountResolver(
  resolver: () => string | undefined
): void {
  tenantAccountResolver = resolver;
}

export function createDatabaseClient(connectionString: string) {
  if (pool && db) {
    return db;
  }

  const basePool = scopePoolQueries(new Pool({ connectionString }));
  const otelEnabled = process.env.OTEL_ENABLED === 'true' || process.env.OTEL_ENABLED === '1';
  pool = otelEnabled ? instrumentPool(basePool) : basePool;
  db = drizzle(pool, { schema });
  return db;
}

export function createScopedDatabaseClient(client: PoolClient): DatabaseClient {
  return drizzle(client, { schema }) as unknown as DatabaseClient;
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

export async function withTenantTransaction<T>(
  accountId: string,
  operation: (client: DatabaseClient) => Promise<T>
): Promise<T> {
  const { runInTenantTransaction } = await import('./tenant-unit-of-work.js');
  return runInTenantTransaction(getPool(), accountId, (client) =>
    operation(createScopedDatabaseClient(client))
  );
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

export async function checkDatabaseRuntimeRole(): Promise<{
  safe: boolean;
  detail: string;
}> {
  if (!pool) return { safe: false, detail: 'Database pool not initialized' };
  const result = await pool.query<{
    current_user: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
    rolcreatedb: boolean;
    rolcreaterole: boolean;
    rolreplication: boolean;
    privileged_memberships: number;
    owned_rls_tables: number;
    forbidden_table_privileges: number;
    executable_security_definer_functions: number;
  }>(
    `WITH RECURSIVE inherited_roles(role_id) AS (
       SELECT membership.roleid
         FROM pg_auth_members membership
        WHERE membership.member = (SELECT oid FROM pg_roles WHERE rolname = current_user)
       UNION
       SELECT membership.roleid
         FROM pg_auth_members membership
         JOIN inherited_roles inherited ON inherited.role_id = membership.member
     ), effective_roles(role_id) AS (
       SELECT oid FROM pg_roles WHERE rolname = current_user
       UNION
       SELECT role_id FROM inherited_roles
     )
     SELECT role.rolname AS current_user,
            role.rolsuper,
            role.rolbypassrls,
            role.rolcreatedb,
            role.rolcreaterole,
            role.rolreplication,
            (SELECT count(*)::int
               FROM inherited_roles membership
               JOIN pg_roles inherited ON inherited.oid = membership.role_id
              WHERE inherited.rolsuper
                 OR inherited.rolbypassrls
                 OR inherited.rolcreaterole
                 OR inherited.rolcreatedb
                 OR inherited.rolreplication
            ) AS privileged_memberships,
            (SELECT count(*)::int
               FROM pg_class class
              WHERE class.relrowsecurity
                AND class.relowner IN (SELECT role_id FROM effective_roles)
            ) AS owned_rls_tables,
            (SELECT count(*)::int
               FROM pg_class class
               JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
              WHERE namespace.nspname = 'public'
                AND class.relkind IN ('r', 'p')
                AND (
                  (NOT class.relrowsecurity AND (
                    has_table_privilege(current_user, class.oid, 'INSERT') OR
                    has_table_privilege(current_user, class.oid, 'UPDATE') OR
                    has_table_privilege(current_user, class.oid, 'DELETE') OR
                    has_table_privilege(current_user, class.oid, 'TRUNCATE')
                  )) OR (
                    class.relname = 'audit_events' AND (
                      has_table_privilege(current_user, class.oid, 'UPDATE') OR
                      has_table_privilege(current_user, class.oid, 'DELETE') OR
                      has_table_privilege(current_user, class.oid, 'TRUNCATE')
                    )
                  )
                )
            ) AS forbidden_table_privileges,
            (SELECT count(*)::int
               FROM pg_proc procedure
               JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
              WHERE namespace.nspname = 'app'
                AND procedure.prosecdef
                AND procedure.proname NOT IN ('current_account_id', 'has_account_context')
                AND has_function_privilege(current_user, procedure.oid, 'EXECUTE')
            ) AS executable_security_definer_functions
       FROM pg_roles role
      WHERE role.rolname = current_user`
  );
  const role = result.rows[0];
  const safe = Boolean(
    role &&
      !role.rolsuper &&
      !role.rolbypassrls &&
      !role.rolcreatedb &&
      !role.rolcreaterole &&
      !role.rolreplication &&
      role.privileged_memberships === 0 &&
      role.owned_rls_tables === 0 &&
      role.forbidden_table_privileges === 0 &&
      role.executable_security_definer_functions === 0
  );
  return {
    safe,
    detail: role
      ? `role=${role.current_user}, superuser=${role.rolsuper}, bypassrls=${role.rolbypassrls}, createdb=${role.rolcreatedb}, createrole=${role.rolcreaterole}, replication=${role.rolreplication}, privilegedMemberships=${role.privileged_memberships}, ownedRlsTables=${role.owned_rls_tables}, forbiddenTablePrivileges=${role.forbidden_table_privileges}, executableSecurityDefinerFunctions=${role.executable_security_definer_functions}`
      : 'Current database role not found'
  };
}

export type DatabaseClient = NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient };
export { schema };
