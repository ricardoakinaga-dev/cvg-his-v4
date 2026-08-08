import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';

import {
  getOrResolveTenantContext,
  getTenantContext,
  requireAccountId,
  requireTenantId,
  resolveTenantFromRequest,
  runWithTenantContext
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

  it('does not let request headers override authenticated identity fallbacks', () => {
    const ctx = resolveTenantFromRequest(
      createRequest({
        'x-tenant-id': 'spoofed-tenant',
        'x-account-id': 'spoofed-account',
        'x-user-id': 'spoofed-user'
      }),
      {
        defaultTenantId: 'trusted-tenant',
        fallbackAccountId: 'trusted-account',
        fallbackUserId: 'trusted-user'
      }
    );

    expect(ctx).toMatchObject({
      tenantId: 'trusted-tenant',
      accountId: 'trusted-account',
      userId: 'trusted-user'
    });
  });
});
