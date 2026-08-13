import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';

import {
  getOrResolveTenantContext,
  getTenantContext,
  requireAccountId,
  requireTenantId,
  resolveTenantFromRequest,
  runWithTenantContext,
  withTenantQueryExplicit
} from './index.js';

function createRequest(headers: Record<string, string> = {}): IncomingMessage {
  return { headers } as IncomingMessage;
}

describe('tenant context', () => {
  it('propagates tenant and account data through async local storage', async () => {
    await runWithTenantContext(
      {
        tenantId: 'tenant-1',
        accountId: 'account-1',
        branchId: 'branch-1',
        userId: 'user-1',
        correlationId: 'corr-1'
      },
      async () => {
        await Promise.resolve();

        expect(getTenantContext()).toMatchObject({
          tenantId: 'tenant-1',
          accountId: 'account-1',
          branchId: 'branch-1',
          userId: 'user-1'
        });
        expect(requireTenantId()).toBe('tenant-1');
        expect(requireAccountId()).toBe('account-1');
      }
    );
  });

  it('resolves tenant context from request headers and auth fallbacks', () => {
    const ctx = resolveTenantFromRequest(
      createRequest({
        'x-tenant-id': 'tenant-2',
        'x-branch-id': 'branch-2',
        'x-correlation-id': 'corr-2'
      }),
      {
        fallbackAccountId: 'account-2',
        fallbackUserId: 'user-2'
      }
    );

    expect(ctx).toEqual({
      tenantId: 'tenant-2',
      accountId: 'account-2',
      branchId: 'branch-2',
      userId: 'user-2',
      correlationId: 'corr-2'
    });
  });

  it('prefers the current async tenant context when one is already active', () => {
    const existing = {
      tenantId: 'tenant-existing',
      accountId: 'account-existing',
      correlationId: 'corr-existing'
    };

    const ctx = runWithTenantContext(existing, () =>
      getOrResolveTenantContext(createRequest({ 'x-tenant-id': 'tenant-request' }))
    );

    expect(ctx).toEqual(existing);
  });

  it('throws when account context is missing from both headers and auth fallback', () => {
    expect(() =>
      resolveTenantFromRequest(
        createRequest({
          'x-tenant-id': 'tenant-3'
        })
      )
    ).toThrow('Account ID is required');
  });

  it('rejects a non-UUID database tenant context before acquiring a connection', async () => {
    let connectCalled = false;
    const pool = {
      connect: async () => {
        connectCalled = true;
        throw new Error('must not connect');
      }
    };

    await expect(
      withTenantQueryExplicit(pool as never, 'acc_legacy', async () => undefined)
    ).rejects.toThrow(/valid UUID/i);
    expect(connectCalled).toBe(false);
  });

  it('releases the client and reports rollback failure without hiding the original error', async () => {
    const queries: string[] = [];
    let released = false;
    const client = {
      query: async (statement: string) => {
        queries.push(statement);
        if (statement === 'ROLLBACK') {
          throw new Error('rollback failed');
        }
        return { rows: [] };
      },
      release: () => {
        released = true;
      }
    };
    const pool = { connect: async () => client };

    await expect(
      withTenantQueryExplicit(
        pool as never,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        async () => {
          throw new Error('business failed');
        }
      )
    ).rejects.toThrow(/business failed.*rollback also failed.*rollback failed/i);

    expect(queries).toEqual([
      'BEGIN',
      "SELECT set_config('app.current_account_id', $1, true)",
      'ROLLBACK'
    ]);
    expect(released).toBe(true);
  });

  it('reuses the active request transaction and rejects a nested tenant switch', async () => {
    const queries: string[] = [];
    let connectCount = 0;
    const client = {
      query: async (statement: string) => {
        queries.push(statement);
        return { rows: [] };
      },
      release: () => undefined
    };
    const pool = {
      connect: async () => {
        connectCount += 1;
        return client;
      }
    };
    const accountA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const accountB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await withTenantQueryExplicit(pool as never, accountA, async () => {
      await withTenantQueryExplicit(pool as never, accountA, async (activeClient) => {
        expect(activeClient).toBe(client);
      });
      await expect(
        withTenantQueryExplicit(pool as never, accountB, async () => undefined)
      ).rejects.toThrow(/cannot switch.*tenant/i);
    });

    expect(connectCount).toBe(1);
    expect(queries).toEqual([
      'BEGIN',
      "SELECT set_config('app.current_account_id', $1, true)",
      'COMMIT'
    ]);
  });
});
