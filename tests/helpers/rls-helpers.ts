import type { PoolClient } from 'pg';

export const RLS_TEST_ROLE = 'cvg_test_rls';

export async function activateRlsRole(client: PoolClient): Promise<void> {
  await client.query(`SET LOCAL ROLE ${RLS_TEST_ROLE}`);
}

export async function setAccountContext(
  client: PoolClient,
  accountId: string | null
): Promise<void> {
  if (accountId) {
    await client.query("SELECT set_config('app.current_account_id', $1, false)", [accountId]);
    return;
  }

  await client.query("SELECT set_config('app.current_account_id', '', false)");
}
