import { describe, expect, it, vi } from 'vitest';

import {
  acquireTenantAuthorizationLock,
  acquireTenantAuthorizationMutationLock,
  acquireTenantAuthorizationSharedLock,
  getDatabaseTransactionScope,
  runWithDatabaseTransactionScope,
  runWithoutDatabaseTransactionScope
} from '../../../packages/shared/database/src/transaction-scope.ts';

function makeScope(accountId: string, active = true) {
  const query = vi.fn(async () => ({ rows: [] }));
  return {
    accountId,
    pool: {} as never,
    client: { query } as never,
    isActive: () => active,
    query
  };
}

describe('database transaction scope', () => {
  it('exposes and clears the ambient scope', async () => {
    expect(getDatabaseTransactionScope()).toBeUndefined();
    const scope = makeScope('acct-1');
    await runWithDatabaseTransactionScope(
      scope as never,
      async () => {
        expect(getDatabaseTransactionScope()?.accountId).toBe('acct-1');
      }
    );
    expect(getDatabaseTransactionScope()).toBeUndefined();
  });

  it('exits the ambient scope for recovery work', async () => {
    const scope = makeScope('acct-1');
    await runWithDatabaseTransactionScope(scope as never, async () => {
      const value = runWithoutDatabaseTransactionScope(() => getDatabaseTransactionScope());
      expect(value).toBeUndefined();
    });
  });

  it('acquires exclusive and shared authorization locks', async () => {
    const scope = makeScope('acct-1');
    await runWithDatabaseTransactionScope(scope as never, async () => {
      await acquireTenantAuthorizationLock('acct-1');
      await acquireTenantAuthorizationMutationLock('acct-1');
      await acquireTenantAuthorizationSharedLock('acct-1');
    });
    expect(scope.query).toHaveBeenCalledTimes(3);
    const statements = scope.query.mock.calls.map((call) => String(call[0]));
    expect(statements[1]).toContain('pg_advisory_xact_lock(');
    expect(statements[2]).toContain('pg_advisory_xact_lock_shared');
  });

  it('rejects locks without an active matching scope', async () => {
    await expect(acquireTenantAuthorizationLock('acct-1')).rejects.toThrow(
      /active database transaction/
    );
    const inactive = makeScope('acct-1', false);
    await runWithDatabaseTransactionScope(inactive as never, async () => {
      await expect(acquireTenantAuthorizationLock('acct-1')).rejects.toThrow(
        /active database transaction/
      );
    });
    const other = makeScope('acct-2');
    await runWithDatabaseTransactionScope(other as never, async () => {
      await expect(acquireTenantAuthorizationLock('acct-1')).rejects.toThrow(/account mismatch/);
    });
  });
});
