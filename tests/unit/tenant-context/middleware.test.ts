import { describe, expect, it } from 'vitest';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import {
  getOrResolveTenantContext,
  resolveTenantFromRequest
} from '../../../packages/tenant-context/src/middleware.js';

function createRequest(headers: Record<string, string | undefined>) {
  return {
    headers
  } as never;
}

describe('tenant-context middleware', () => {
  it('resolves tenant, account and optional headers from the request', () => {
    const context = resolveTenantFromRequest(
      createRequest({
        'x-correlation-id': 'corr-123',
        'x-tenant-id': 'tenant-123',
        'x-account-id': 'acc-123',
        'x-branch-id': 'branch-7',
        'x-user-id': 'usr-9'
      })
    );

    expect(context).toEqual({
      tenantId: 'tenant-123',
      accountId: 'acc-123',
      branchId: 'branch-7',
      userId: 'usr-9',
      correlationId: 'corr-123'
    });
  });

  it('uses fallback options and default correlation id when headers are missing', () => {
    const context = resolveTenantFromRequest(createRequest({}), {
      defaultTenantId: 'tenant-default',
      fallbackAccountId: 'acc-default',
      fallbackUserId: 'usr-default'
    });

    expect(context).toEqual({
      tenantId: 'tenant-default',
      accountId: 'acc-default',
      branchId: undefined,
      userId: 'usr-default',
      correlationId: 'unknown'
    });
  });

  it('throws explicit errors when tenant or account cannot be resolved', () => {
    expect(() =>
      resolveTenantFromRequest(
        createRequest({
          'x-account-id': 'acc-123'
        })
      )
    ).toThrow(/Tenant ID is required/);

    expect(() =>
      resolveTenantFromRequest(
        createRequest({
          'x-tenant-id': 'tenant-123'
        })
      )
    ).toThrow(/Account ID is required/);
  });

  it('returns existing tenant context instead of resolving headers again', () => {
    const request = createRequest({
      'x-correlation-id': 'corr-header',
      'x-tenant-id': 'tenant-header',
      'x-account-id': 'acc-header'
    });

    runWithTenantContext(
      {
        tenantId: 'tenant-existing',
        accountId: 'acc-existing',
        branchId: 'branch-existing',
        userId: 'usr-existing',
        correlationId: 'corr-existing'
      },
      () => {
        const context = getOrResolveTenantContext(request, {
          defaultTenantId: 'tenant-default',
          fallbackAccountId: 'acc-default'
        });

        expect(context).toEqual({
          tenantId: 'tenant-existing',
          accountId: 'acc-existing',
          branchId: 'branch-existing',
          userId: 'usr-existing',
          correlationId: 'corr-existing'
        });
      }
    );
  });

  it('resolves from request when no tenant context exists', () => {
    const context = getOrResolveTenantContext(
      createRequest({
        'x-correlation-id': 'corr-fallback',
        'x-tenant-id': 'tenant-fallback',
        'x-account-id': 'acc-fallback'
      })
    );

    expect(context.tenantId).toBe('tenant-fallback');
    expect(context.accountId).toBe('acc-fallback');
    expect(context.correlationId).toBe('corr-fallback');
  });
});
