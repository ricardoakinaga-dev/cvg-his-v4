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

async function withDatabaseSpan<T>(args: readonly unknown[], fn: () => Promise<T>): Promise<T> {
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
      const originalClientPromiseQuery = originalClientQuery as (
        ...args: Parameters<PoolClient['query']>
      ) => Promise<unknown>;
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
        throw new Error(
          'Callback-style pool queries are not supported inside a tenant unit of work'
        );
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
            releaseError =
              rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
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

export function configureDatabaseTenantAccountResolver(resolver: () => string | undefined): void {
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
  operation: (client: DatabaseClient) => Promise<T>,
  metadata?: {
    readonly actorUserId: string;
    readonly correlationId: string;
  }
): Promise<T> {
  const { runInTenantTransaction, runInTenantTransactionContext } =
    await import('./tenant-unit-of-work.js');
  if (metadata) {
    return runInTenantTransactionContext(
      getPool(),
      { accountId, actorUserId: metadata.actorUserId, correlationId: metadata.correlationId },
      (transaction) => operation(transaction.database)
    );
  }
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

type DatabaseMutationPrivilege = 'INSERT' | 'UPDATE' | 'DELETE';
type DatabaseRuntimeCapability = readonly [name: string, detail: string];

function immutableCapability<const Detail extends string>(
  name: string,
  detail: Detail
): readonly [string, Detail] {
  return Object.freeze([name, detail] as const);
}

export const DATABASE_RUNTIME_INSTALLER_MUTATIONS: readonly DatabaseRuntimeCapability[] =
  Object.freeze([
    immutableCapability('roles', 'INSERT'),
    immutableCapability('permissions', 'INSERT'),
    immutableCapability('role_permissions', 'INSERT'),
    immutableCapability('role_permissions', 'DELETE'),
    immutableCapability('user_roles', 'INSERT'),
    immutableCapability('user_roles', 'DELETE'),
    immutableCapability('cfop_entries', 'INSERT'),
    immutableCapability('cfop_entries', 'UPDATE'),
    immutableCapability('icms_tables', 'INSERT'),
    immutableCapability('icms_tables', 'UPDATE'),
    immutableCapability('ipi_tables', 'INSERT'),
    immutableCapability('ipi_tables', 'UPDATE'),
    immutableCapability('pis_tables', 'INSERT'),
    immutableCapability('pis_tables', 'UPDATE'),
    immutableCapability('cofins_tables', 'INSERT'),
    immutableCapability('cofins_tables', 'UPDATE'),
    immutableCapability('ibs_cbs_tables', 'INSERT'),
    immutableCapability('ibs_cbs_tables', 'UPDATE'),
    immutableCapability('icms_rules', 'INSERT'),
    immutableCapability('nfse_layouts', 'INSERT'),
    immutableCapability('nfse_layouts', 'UPDATE')
  ] satisfies readonly (readonly [string, DatabaseMutationPrivilege])[]);

export const DATABASE_RUNTIME_INSTALLER_FUNCTIONS: readonly DatabaseRuntimeCapability[] =
  Object.freeze([
    immutableCapability('is_initial_setup_required', ''),
    immutableCapability(
      'provision_initial_installation',
      'text, text, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, text'
    )
  ]);

/** API-only SECURITY DEFINER entrypoints allowed during API role inspection. */
export const DATABASE_RUNTIME_API_FUNCTIONS: readonly DatabaseRuntimeCapability[] = Object.freeze([
  immutableCapability('resolve_active_api_key', 'text, text'),
  immutableCapability('is_pix_transaction_owned_by', 'text, uuid')
]);

const DATABASE_RUNTIME_API_ROLE = process.env.POSTGRES_API_USER ?? 'cvg_api';

export interface DatabaseRuntimeRoleInspection {
  readonly current_user: string;
  readonly rolsuper: boolean;
  readonly rolbypassrls: boolean;
  readonly rolcreatedb: boolean;
  readonly rolcreaterole: boolean;
  readonly rolreplication: boolean;
  readonly privileged_memberships: number;
  readonly owned_rls_tables: number;
  readonly forbidden_table_privileges: number;
  readonly executable_security_definer_functions: number;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function renderSqlValues(capabilities: readonly DatabaseRuntimeCapability[]): string {
  return capabilities
    .map(([name, detail]) => `(${sqlLiteral(name)}, ${sqlLiteral(detail)})`)
    .join(',\n         ');
}

export const DATABASE_RUNTIME_ROLE_CHECK_SQL = `WITH RECURSIVE inherited_roles(role_id) AS (
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
   ), installer_role(role_id) AS (
     SELECT installer.oid
       FROM pg_roles installer
       JOIN pg_auth_members membership ON membership.roleid = installer.oid
       JOIN pg_roles runtime_role ON runtime_role.oid = membership.member
      WHERE installer.rolname = 'cvg_installer'
        AND runtime_role.rolname = current_user
        AND runtime_role.rolinherit
        AND NOT membership.admin_option
        AND membership.inherit_option
        AND NOT installer.rolcanlogin
        AND NOT installer.rolsuper
        AND NOT installer.rolbypassrls
        AND NOT installer.rolcreatedb
        AND NOT installer.rolcreaterole
        AND NOT installer.rolreplication
   ), allowed_installer_functions(function_name, identity_arguments) AS (
     VALUES ${renderSqlValues(DATABASE_RUNTIME_INSTALLER_FUNCTIONS)}
   ), allowed_api_functions(function_name, identity_arguments) AS (
     VALUES ${renderSqlValues(DATABASE_RUNTIME_API_FUNCTIONS)}
   ), allowed_installer_mutations(table_name, privilege_type) AS (
     VALUES ${renderSqlValues(DATABASE_RUNTIME_INSTALLER_MUTATIONS)}
   ), effective_mutation_privileges(
     table_id,
     table_name,
     table_owner,
     table_acl,
     row_security,
     runtime_role_id,
     privilege_type
   ) AS (
     SELECT class.oid,
            class.relname,
            class.relowner,
            class.relacl,
            class.relrowsecurity,
            (SELECT oid FROM pg_roles WHERE rolname = current_user),
            privilege.privilege_type
       FROM pg_class class
       JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
       CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) privilege(privilege_type)
      WHERE namespace.nspname = 'public'
        AND class.relkind IN ('r', 'p')
        AND has_table_privilege(current_user, class.oid, privilege.privilege_type)
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
             FROM effective_mutation_privileges mutation
            WHERE NOT (
              (
                mutation.row_security
                AND mutation.table_name <> 'audit_events'
                AND mutation.privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
                AND NOT EXISTS (
                  SELECT 1
                    FROM allowed_installer_mutations allowed_table
                   WHERE allowed_table.table_name = mutation.table_name
                )
              )
              OR (
                mutation.row_security
                AND mutation.table_name = 'audit_events'
                AND mutation.privilege_type = 'INSERT'
              )
              OR (
                EXISTS (SELECT 1 FROM installer_role)
                AND EXISTS (
                  SELECT 1
                    FROM allowed_installer_mutations allowed_mutation
                   WHERE allowed_mutation.table_name = mutation.table_name
                     AND allowed_mutation.privilege_type = mutation.privilege_type
                )
                AND EXISTS (
                  SELECT 1
                    FROM aclexplode(
                      COALESCE(mutation.table_acl, acldefault('r', mutation.table_owner))
                    ) table_acl
                   WHERE table_acl.grantee = mutation.runtime_role_id
                     AND table_acl.privilege_type = mutation.privilege_type
                     AND NOT table_acl.is_grantable
                )
                AND NOT EXISTS (
                  SELECT 1
                    FROM aclexplode(
                      COALESCE(mutation.table_acl, acldefault('r', mutation.table_owner))
                    ) table_acl
                   WHERE table_acl.privilege_type = mutation.privilege_type
                     AND (
                       table_acl.grantee = 0
                       OR (
                         table_acl.grantee IN (SELECT role_id FROM effective_roles)
                         AND (
                           table_acl.grantee <> mutation.runtime_role_id
                           OR table_acl.is_grantable
                         )
                       )
                     )
                )
              )
            )
          ) AS forbidden_table_privileges,
          (SELECT count(*)::int
             FROM pg_proc procedure
             JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
            WHERE namespace.nspname = 'app'
              AND procedure.prosecdef
              AND NOT (
                procedure.proname IN ('current_account_id', 'has_account_context')
                AND pg_catalog.oidvectortypes(procedure.proargtypes) = ''
              )
              AND has_function_privilege(current_user, procedure.oid, 'EXECUTE')
              AND NOT EXISTS (
                SELECT 1
                  FROM allowed_api_functions allowed_function
                 WHERE current_user = ${sqlLiteral(DATABASE_RUNTIME_API_ROLE)}
                   AND allowed_function.function_name = procedure.proname
                   AND allowed_function.identity_arguments =
                       pg_catalog.oidvectortypes(procedure.proargtypes)
                   AND procedure.proowner NOT IN (SELECT role_id FROM effective_roles)
                   AND procedure.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
                   AND NOT has_schema_privilege(current_user, namespace.oid, 'CREATE')
                   AND NOT EXISTS (
                     SELECT 1
                       FROM aclexplode(
                         COALESCE(procedure.proacl, acldefault('f', procedure.proowner))
                       ) acl
                      WHERE acl.privilege_type = 'EXECUTE'
                        AND (acl.grantee = 0 OR acl.is_grantable)
                   )
              )
              AND NOT EXISTS (
                SELECT 1
                  FROM installer_role installer
                  JOIN allowed_installer_functions allowed_function
                    ON allowed_function.function_name = procedure.proname
                   AND allowed_function.identity_arguments =
                       pg_catalog.oidvectortypes(procedure.proargtypes)
                 WHERE procedure.proowner NOT IN (SELECT role_id FROM effective_roles)
                   AND procedure.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
                   AND NOT has_schema_privilege(current_user, namespace.oid, 'CREATE')
                   AND has_schema_privilege(installer.role_id, namespace.oid, 'USAGE')
                   AND has_function_privilege(installer.role_id, procedure.oid, 'EXECUTE')
                   AND NOT EXISTS (
                     SELECT 1
                       FROM aclexplode(
                         COALESCE(procedure.proacl, acldefault('f', procedure.proowner))
                       ) acl
                      WHERE acl.privilege_type = 'EXECUTE'
                        AND (
                          acl.grantee = 0
                          OR (
                            acl.grantee IN (SELECT role_id FROM effective_roles)
                            AND (
                              acl.grantee <> installer.role_id
                              OR acl.is_grantable
                            )
                          )
                        )
                   )
              )
          ) AS executable_security_definer_functions
     FROM pg_roles role
    WHERE role.rolname = current_user`;

export function isDatabaseRuntimeRoleInspectionSafe(
  role: DatabaseRuntimeRoleInspection | undefined
): boolean {
  return Boolean(
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
}

export async function checkDatabaseRuntimeRole(): Promise<{
  safe: boolean;
  detail: string;
}> {
  if (!pool) return { safe: false, detail: 'Database pool not initialized' };
  const result = await pool.query<DatabaseRuntimeRoleInspection>(DATABASE_RUNTIME_ROLE_CHECK_SQL);
  const role = result.rows[0];
  const safe = isDatabaseRuntimeRoleInspectionSafe(role);
  return {
    safe,
    detail: role
      ? `role=${role.current_user}, superuser=${role.rolsuper}, bypassrls=${role.rolbypassrls}, createdb=${role.rolcreatedb}, createrole=${role.rolcreaterole}, replication=${role.rolreplication}, privilegedMemberships=${role.privileged_memberships}, ownedRlsTables=${role.owned_rls_tables}, forbiddenTablePrivileges=${role.forbidden_table_privileges}, executableSecurityDefinerFunctions=${role.executable_security_definer_functions}`
      : 'Current database role not found'
  };
}

export type DatabaseClient = NodePgDatabase<Record<string, unknown>> & { $client: NodePgClient };
export { schema };
