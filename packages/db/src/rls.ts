import type { Pool, PoolClient } from 'pg';

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
  await client.query('SET LOCAL app.current_account_id = $1', [accountId]);
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
    await client.query('SET LOCAL app.current_account_id = $1', [accountId]);
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
