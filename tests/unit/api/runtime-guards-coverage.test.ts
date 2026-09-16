import type { IncomingMessage } from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPool: vi.fn(),
  createDatabaseWorkflowTaskService: vi.fn(),
  checkWorkflowTaskSchemaReadiness: vi.fn(),
  getDatabaseTransactionScope: vi.fn(),
  acquireTenantAuthorizationMutationLock: vi.fn(),
  acquireTenantAuthorizationSharedLock: vi.fn()
}));

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: mocks.getPool,
  getDatabaseTransactionScope: mocks.getDatabaseTransactionScope,
  acquireTenantAuthorizationMutationLock: mocks.acquireTenantAuthorizationMutationLock,
  acquireTenantAuthorizationSharedLock: mocks.acquireTenantAuthorizationSharedLock
}));

vi.mock('@cvg-his-v2/module-workflows', () => ({
  checkWorkflowTaskSchemaReadiness: mocks.checkWorkflowTaskSchemaReadiness,
  createDatabaseWorkflowTaskService: mocks.createDatabaseWorkflowTaskService,
  WorkflowTaskService: class FakeWorkflowTaskService {
    readonly kind = 'in-memory';
  }
}));

import {
  createApiWorkflowTaskService,
  createWorkflowTaskSchemaReadinessGuard
} from '../../../apps/api/src/helpers/workflow-task-runtime.js';
import { acquireAuthorizationTransactionLock } from '../../../apps/api/src/helpers/authorization-transaction-lock.js';

function request(method?: string, url?: string): IncomingMessage {
  return { method, url } as IncomingMessage;
}

describe('workflow persistence runtime guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_REQUIRE_SCHEMA;
    delete process.env.DATABASE_REQUIRE_RLS_ROLE;
  });

  it('uses database persistence when available and falls back only outside production', () => {
    const databaseService = { kind: 'database' };
    mocks.getPool.mockReturnValue({});
    mocks.createDatabaseWorkflowTaskService.mockReturnValue(databaseService);

    expect(createApiWorkflowTaskService('development')).toBe(databaseService);
    expect(mocks.createDatabaseWorkflowTaskService).toHaveBeenCalledOnce();

    mocks.getPool.mockImplementation(() => {
      throw new Error('database unavailable');
    });
    expect(createApiWorkflowTaskService('test')).toMatchObject({ kind: 'in-memory' });
    expect(() => createApiWorkflowTaskService('production')).toThrow(
      'Clinical workflow persistence is required in production-like environments'
    );
  });

  it('returns a no-op readiness guard when persistence is not required', async () => {
    const guard = createWorkflowTaskSchemaReadinessGuard('development');
    await expect(guard()).resolves.toBeUndefined();
    expect(mocks.checkWorkflowTaskSchemaReadiness).not.toHaveBeenCalled();
  });

  it('memoizes readiness, retries after a failed readiness check and fails closed', async () => {
    mocks.checkWorkflowTaskSchemaReadiness
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const guard = createWorkflowTaskSchemaReadinessGuard('production');

    await expect(guard()).resolves.toBeUndefined();
    await expect(guard()).resolves.toBeUndefined();
    expect(mocks.checkWorkflowTaskSchemaReadiness).toHaveBeenCalledOnce();

    const failingGuard = createWorkflowTaskSchemaReadinessGuard('production');
    await expect(failingGuard()).rejects.toThrow('Clinical workflow persistence schema is not ready');
    await expect(failingGuard()).resolves.toBeUndefined();
    expect(mocks.checkWorkflowTaskSchemaReadiness).toHaveBeenCalledTimes(3);
  });

  it('requires schema readiness when either explicit database flag is enabled', async () => {
    mocks.checkWorkflowTaskSchemaReadiness.mockResolvedValue(true);
    process.env.DATABASE_REQUIRE_SCHEMA = '1';
    await expect(createWorkflowTaskSchemaReadinessGuard('development')()).resolves.toBeUndefined();
    delete process.env.DATABASE_REQUIRE_SCHEMA;
    process.env.DATABASE_REQUIRE_RLS_ROLE = '1';
    await expect(createWorkflowTaskSchemaReadinessGuard('development')()).resolves.toBeUndefined();
    expect(mocks.checkWorkflowTaskSchemaReadiness).toHaveBeenCalledTimes(2);
  });
});

describe('authorization transaction lock guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not acquire a lock outside a database transaction', async () => {
    mocks.getDatabaseTransactionScope.mockReturnValue(undefined);
    await expect(acquireAuthorizationTransactionLock(request('POST', '/access-control/roles'), 'account-1')).resolves.toBeUndefined();
    expect(mocks.acquireTenantAuthorizationMutationLock).not.toHaveBeenCalled();
    expect(mocks.acquireTenantAuthorizationSharedLock).not.toHaveBeenCalled();
  });

  it('uses the mutation lock only for access-control mutations', async () => {
    mocks.getDatabaseTransactionScope.mockReturnValue({});
    await acquireAuthorizationTransactionLock(request('POST', '/access-control/roles'), 'account-1');
    await acquireAuthorizationTransactionLock(request('PUT', '/api/access-control/policies'), 'account-1');
    await acquireAuthorizationTransactionLock(request('DELETE', '/patients/1'), 'account-1');
    await acquireAuthorizationTransactionLock(request('GET', '/access-control/roles'), 'account-1');
    await acquireAuthorizationTransactionLock(request(undefined, undefined), 'account-1');

    expect(mocks.acquireTenantAuthorizationMutationLock).toHaveBeenCalledTimes(2);
    expect(mocks.acquireTenantAuthorizationSharedLock).toHaveBeenCalledTimes(3);
    expect(mocks.acquireTenantAuthorizationMutationLock).toHaveBeenNthCalledWith(1, 'account-1');
  });
});
