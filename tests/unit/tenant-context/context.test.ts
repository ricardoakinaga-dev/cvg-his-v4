import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTenantContext,
  requireTenantContext,
  requireTenantId,
  requireAccountId,
  runWithTenantContext,
  type TenantContext
} from '@cvg-his-v2/tenant-context';

describe('TenantContext', () => {
  const sampleContext: TenantContext = {
    tenantId: 'tenant-001',
    accountId: 'acc-001',
    branchId: 'branch-001',
    userId: 'user-001',
    correlationId: 'corr-001'
  };

  beforeEach(() => {
    // Context is automatically cleared after each runWithTenantContext
  });

  describe('getTenantContext', () => {
    it('returns undefined outside of tenant context', () => {
      expect(getTenantContext()).toBeUndefined();
    });

    it('returns context inside runWithTenantContext', () => {
      runWithTenantContext(sampleContext, () => {
        const ctx = getTenantContext();
        expect(ctx).toEqual(sampleContext);
      });
    });
  });

  describe('requireTenantContext', () => {
    it('throws outside of tenant context', () => {
      expect(() => requireTenantContext()).toThrow('Tenant context is not available');
    });

    it('returns context inside runWithTenantContext', () => {
      runWithTenantContext(sampleContext, () => {
        const ctx = requireTenantContext();
        expect(ctx).toEqual(sampleContext);
      });
    });
  });

  describe('requireTenantId', () => {
    it('throws outside of tenant context', () => {
      expect(() => requireTenantId()).toThrow();
    });

    it('returns tenantId inside context', () => {
      runWithTenantContext(sampleContext, () => {
        expect(requireTenantId()).toBe('tenant-001');
      });
    });
  });

  describe('requireAccountId', () => {
    it('throws outside of tenant context', () => {
      expect(() => requireAccountId()).toThrow();
    });

    it('returns accountId inside context', () => {
      runWithTenantContext(sampleContext, () => {
        expect(requireAccountId()).toBe('acc-001');
      });
    });
  });

  describe('isolation', () => {
    it('isolates contexts between concurrent runs', () => {
      const ctxA: TenantContext = {
        tenantId: 'tenant-A',
        accountId: 'acc-A',
        correlationId: 'corr-A'
      };
      const ctxB: TenantContext = {
        tenantId: 'tenant-B',
        accountId: 'acc-B',
        correlationId: 'corr-B'
      };

      let resultA: string | undefined;
      let resultB: string | undefined;

      const promiseA = new Promise<void>((resolve) => {
        runWithTenantContext(ctxA, () => {
          resultA = requireTenantId();
          setTimeout(() => {
            resultA = requireTenantId();
            resolve();
          }, 10);
        });
      });

      const promiseB = new Promise<void>((resolve) => {
        runWithTenantContext(ctxB, () => {
          resultB = requireTenantId();
          setTimeout(() => {
            resultB = requireTenantId();
            resolve();
          }, 5);
        });
      });

      return Promise.all([promiseA, promiseB]).then(() => {
        expect(resultA).toBe('tenant-A');
        expect(resultB).toBe('tenant-B');
      });
    });
  });

  describe('nested contexts', () => {
    it('overrides parent context in nested run', () => {
      const parentCtx: TenantContext = {
        tenantId: 'parent',
        accountId: 'acc-parent',
        correlationId: 'corr-parent'
      };
      const childCtx: TenantContext = {
        tenantId: 'child',
        accountId: 'acc-child',
        correlationId: 'corr-child'
      };

      runWithTenantContext(parentCtx, () => {
        expect(requireTenantId()).toBe('parent');

        runWithTenantContext(childCtx, () => {
          expect(requireTenantId()).toBe('child');
        });

        expect(requireTenantId()).toBe('parent');
      });
    });
  });
});
