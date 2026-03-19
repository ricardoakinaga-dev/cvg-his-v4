import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import type { ServiceRecord } from './types.js';
import { createServicesService } from './service.js';

const fakeDb = {} as typeof import('@cvg-his/db').db;

function makeService(overrides: Partial<ServiceRecord> = {}): ServiceRecord {
  return {
    id: 'service-1',
    accountId: 'account-1',
    name: 'Consulta clínica',
    code: 'CONSULTA',
    description: 'Consulta básica',
    basePrice: 120,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  };
}

function createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'req-1',
    actor: {
      accountId: 'account-1',
      userId: 'user-1',
      role: 'admin',
      roles: ['admin'],
      permissions: []
    },
    ...overrides
  };
}

describe('services service', () => {
  const repo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    updateById: vi.fn(),
    list: vi.fn()
  };
  const appendAudit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates service and appends audit', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(makeService());

    const service = createServicesService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.create({
      name: 'Consulta clínica',
      code: 'CONSULTA',
      description: 'Consulta básica',
      basePrice: 120
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        name: 'Consulta clínica',
        code: 'CONSULTA'
      })
    );
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'service.create',
        entityType: 'service',
        entityId: 'service-1'
      })
    );
    expect(result.id).toBe('service-1');
  });

  it('rejects duplicate code within same account', async () => {
    repo.findByCode.mockResolvedValue(makeService());

    const service = createServicesService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    await expect(
      service.create({
        name: 'Consulta clínica',
        code: 'CONSULTA',
        description: 'Consulta básica',
        basePrice: 120
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(repo.create).not.toHaveBeenCalled();
  });

  it('updates service and appends audit', async () => {
    const before = makeService();
    const after = makeService({ name: 'Consulta retorno', updatedAt: new Date('2026-01-01T02:00:00.000Z') });
    repo.findById.mockResolvedValue(before);
    repo.updateById.mockResolvedValue(after);
    repo.findByCode.mockResolvedValue(null);

    const service = createServicesService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.update('service-1', { name: 'Consulta retorno' });

    expect(repo.updateById).toHaveBeenCalledWith('account-1', 'service-1', { name: 'Consulta retorno' });
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'service.update',
        beforeJson: before,
        afterJson: after
      })
    );
    expect(result?.name).toBe('Consulta retorno');
  });

  it('lists services scoped by actor account', async () => {
    repo.list.mockResolvedValue({ data: [makeService()], page: 1, pageSize: 20, total: 1 });

    const service = createServicesService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.list({ page: 1, pageSize: 20, q: 'cons', active: true });

    expect(repo.list).toHaveBeenCalledWith({
      accountId: 'account-1',
      page: 1,
      pageSize: 20,
      q: 'cons',
      active: true
    });
    expect(result.total).toBe(1);
  });
});
