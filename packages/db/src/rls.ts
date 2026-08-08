import type { Pool, PoolClient } from 'pg';

export interface RlsMigrationFile {
  readonly name: string;
  readonly sql: string;
}

export interface RlsMigrationCoverageTable {
  readonly tableName: string;
  readonly sourceFiles: readonly string[];
  readonly hasAccountId: boolean;
  readonly rlsEnabled: boolean;
  readonly hasTenantPolicy: boolean;
  readonly policyUsesCurrentAccountId: boolean;
  readonly status:
    | 'protected'
    | 'missing_account_scope'
    | 'missing_rls'
    | 'missing_policy'
    | 'documented_exception';
  readonly missing: readonly string[];
}

export interface RlsMigrationCoverageReport {
  readonly generatedAt: string;
  readonly totalTenantTables: number;
  readonly protectedTables: number;
  readonly exceptionTables: number;
  readonly failingTables: number;
  readonly tables: readonly RlsMigrationCoverageTable[];
}

const DEFAULT_RLS_EXCEPTION_TABLES = new Set<string>(['accounts', 'tenants', 'drizzle_migrations']);

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--.*$/gm, ' ');
}

function normalizeIdentifier(identifier: string): string {
  const cleaned = identifier
    .trim()
    .replace(/^ONLY\s+/i, '')
    .replace(/^IF\s+EXISTS\s+/i, '')
    .replace(/^public\./i, '')
    .replace(/"/g, '');
  const parts = cleaned.split('.');
  return (parts[parts.length - 1] ?? cleaned).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface CollectedMigrationTable {
  readonly sourceFiles: Set<string>;
  hasAccountId: boolean;
}

function collectCreatedTables(
  files: readonly RlsMigrationFile[]
): Map<string, CollectedMigrationTable> {
  const tables = new Map<string, CollectedMigrationTable>();
  const createTablePattern =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"?public"?\.)?"?[a-zA-Z0-9_]+"?)\s*\(([\s\S]*?)\)\s*;/gi;
  const addAccountIdPattern =
    /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?((?:"?public"?\.)?"?[a-zA-Z0-9_]+"?)\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?account_id"?\s+(uuid|text|varchar|character\s+varying|char|bigint|integer)\b/gi;

  for (const file of files) {
    const sql = stripSqlComments(file.sql);
    for (const match of sql.matchAll(createTablePattern)) {
      const tableName = normalizeIdentifier(match[1] ?? '');
      const body = match[2] ?? '';
      if (!tableName) continue;

      const table = tables.get(tableName) ?? {
        sourceFiles: new Set<string>(),
        hasAccountId: false
      };
      table.sourceFiles.add(file.name);
      table.hasAccountId ||=
        /"?account_id"?\s+(uuid|text|varchar|character varying|char|bigint|integer)/i.test(body);
      tables.set(tableName, table);
    }

    for (const match of sql.matchAll(addAccountIdPattern)) {
      const tableName = normalizeIdentifier(match[1] ?? '');
      if (!tableName) continue;

      const table = tables.get(tableName) ?? {
        sourceFiles: new Set<string>(),
        hasAccountId: false
      };
      table.sourceFiles.add(file.name);
      table.hasAccountId = true;
      tables.set(tableName, table);
    }
  }

  return tables;
}

function hasRlsEnabled(combinedSql: string, tableName: string): boolean {
  const table = escapeRegExp(tableName);
  return new RegExp(
    `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:(?:"?public"?)\\.)?"?${table}"?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    'i'
  ).test(combinedSql);
}

function hasTenantPolicy(combinedSql: string, tableName: string): boolean {
  const table = escapeRegExp(tableName);
  return new RegExp(
    `CREATE\\s+POLICY\\s+[\\s\\S]*?\\s+ON\\s+(?:(?:"?public"?)\\.)?"?${table}"?[\\s\\S]*?(USING|WITH\\s+CHECK)`,
    'i'
  ).test(combinedSql);
}

function policyUsesCurrentAccountId(combinedSql: string, tableName: string): boolean {
  const table = escapeRegExp(tableName);
  const policyMatch = combinedSql.match(
    new RegExp(
      `CREATE\\s+POLICY\\s+[\\s\\S]*?\\s+ON\\s+(?:(?:"?public"?)\\.)?"?${table}"?[\\s\\S]*?(?=CREATE\\s+POLICY|ALTER\\s+TABLE|CREATE\\s+TABLE|$)`,
      'i'
    )
  );
  const policySql = policyMatch?.[0] ?? '';
  return /app\.current_account_id\(\)|current_setting\('app\.current_account_id'/i.test(policySql);
}

export function analyzeRlsMigrationCoverage(
  files: readonly RlsMigrationFile[],
  options?: {
    readonly exceptionTables?: readonly string[];
    readonly requiredTenantTables?: readonly string[];
    readonly generatedAt?: string;
  }
): RlsMigrationCoverageReport {
  const exceptionTables = new Set([
    ...DEFAULT_RLS_EXCEPTION_TABLES,
    ...(options?.exceptionTables ?? []).map((table) => table.toLowerCase())
  ]);
  const createdTables = collectCreatedTables(files);
  const requiredTenantTables = new Set(
    (options?.requiredTenantTables ?? []).map((table) => table.toLowerCase())
  );
  const tenantTables = new Map(
    [...createdTables].filter(
      ([tableName, table]) => table.hasAccountId || requiredTenantTables.has(tableName)
    )
  );
  for (const tableName of requiredTenantTables) {
    if (!tenantTables.has(tableName)) {
      tenantTables.set(tableName, { sourceFiles: new Set(), hasAccountId: false });
    }
  }
  const combinedSql = stripSqlComments(files.map((file) => file.sql).join('\n\n'));
  const tables: RlsMigrationCoverageTable[] = [];

  for (const [tableName, table] of tenantTables.entries()) {
    const rlsEnabled = hasRlsEnabled(combinedSql, tableName);
    const tenantPolicy = hasTenantPolicy(combinedSql, tableName);
    const usesCurrentAccount = policyUsesCurrentAccountId(combinedSql, tableName);
    const missing = [
      ...(table.hasAccountId ? [] : ['account_id']),
      ...(rlsEnabled ? [] : ['ENABLE ROW LEVEL SECURITY']),
      ...(tenantPolicy ? [] : ['CREATE POLICY']),
      ...(usesCurrentAccount ? [] : ['app.current_account_id policy predicate'])
    ];
    const isException = exceptionTables.has(tableName);

    tables.push({
      tableName,
      sourceFiles: [...table.sourceFiles].sort(),
      hasAccountId: table.hasAccountId,
      rlsEnabled,
      hasTenantPolicy: tenantPolicy,
      policyUsesCurrentAccountId: usesCurrentAccount,
      status:
        missing.length === 0
          ? 'protected'
          : isException
            ? 'documented_exception'
            : !table.hasAccountId
              ? 'missing_account_scope'
              : rlsEnabled
                ? 'missing_policy'
                : 'missing_rls',
      missing
    });
  }

  const sortedTables = tables.sort((a, b) => a.tableName.localeCompare(b.tableName));
  return {
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
    totalTenantTables: sortedTables.length,
    protectedTables: sortedTables.filter((table) => table.status === 'protected').length,
    exceptionTables: sortedTables.filter((table) => table.status === 'documented_exception').length,
    failingTables: sortedTables.filter(
      (table) =>
        table.status === 'missing_account_scope' ||
        table.status === 'missing_policy' ||
        table.status === 'missing_rls'
    ).length,
    tables: sortedTables
  };
}

/**
 * Configura o contexto de tenant na sessao PostgreSQL atual.
 * Deve ser chamado no inicio de cada transacao antes de qualquer query.
 *
 * Uso:
 *   const client = await pool.connect();
 *   await setSessionAccountId(client, 'uuid-do-account');
 *   // ... queries com RLS ativo ...
 *   client.release();
 */
export async function setSessionAccountId(client: PoolClient, accountId: string): Promise<void> {
  await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
}

/**
 * Wrapper que executa uma funcao com contexto de tenant configurado.
 * Usa PoolClient com transacao para garantir isolamento.
 *
 * Uso:
 *   await withTenantContext(pool, accountId, async (client) => {
 *     const owners = await client.query('SELECT * FROM owners');
 *     // RLS filtra automaticamente por account_id
 *   });
 */
export async function withTenantContext<T>(
  pool: Pool,
  accountId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verifica se o RLS esta habilitado para uma tabela especifica.
 * Util para testes de validacao.
 */
export async function checkRlsEnabled(client: PoolClient, tableName: string): Promise<boolean> {
  const result = await client.query(
    "SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = $1",
    [tableName]
  );
  if (result.rows.length === 0) return false;
  return result.rows[0].rowsecurity === true;
}

/**
 * Retorna resumo do status de RLS no banco.
 */
export async function getRlsSummary(client: PoolClient): Promise<{
  totalTables: number;
  rlsEnabled: number;
  rlsDisabled: number;
  tablesWithPolicies: number;
}> {
  const result = await client.query(`
    SELECT
      COUNT(*) AS total_tables,
      COUNT(*) FILTER (WHERE rowsecurity = true) AS rls_enabled,
      COUNT(*) FILTER (WHERE rowsecurity = false) AS rls_disabled
    FROM pg_tables
    WHERE schemaname = 'public'
  `);

  const policies = await client.query(`
    SELECT COUNT(DISTINCT tablename) AS tables_with_policies
    FROM pg_policies
    WHERE schemaname = 'public'
  `);

  return {
    totalTables: parseInt(result.rows[0].total_tables, 10),
    rlsEnabled: parseInt(result.rows[0].rls_enabled, 10),
    rlsDisabled: parseInt(result.rows[0].rls_disabled, 10),
    tablesWithPolicies: parseInt(policies.rows[0].tables_with_policies, 10)
  };
}

/**
 * Testa isolamento cross-tenant: tenta ler dados de outro account
 * e verifica que o resultado e vazio.
 */
export async function verifyCrossTenantIsolation(
  pool: Pool,
  tableName: string,
  accountA: string,
  accountB: string
): Promise<{ accountASeesB: boolean; accountBSeesA: boolean }> {
  let accountASeesB = false;
  let accountBSeesA = false;

  // Account A tenta ver dados de Account B
  await withTenantContext(pool, accountA, async (client) => {
    const result = await client.query(`SELECT COUNT(*) FROM ${tableName} WHERE account_id = $1`, [
      accountB
    ]);
    accountASeesB = parseInt(result.rows[0].count, 10) > 0;
  });

  // Account B tenta ver dados de Account A
  await withTenantContext(pool, accountB, async (client) => {
    const result = await client.query(`SELECT COUNT(*) FROM ${tableName} WHERE account_id = $1`, [
      accountA
    ]);
    accountBSeesA = parseInt(result.rows[0].count, 10) > 0;
  });

  return { accountASeesB, accountBSeesA };
}
