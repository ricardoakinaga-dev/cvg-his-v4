import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import type { ProductRecord } from './types.js';
import { createProductsService } from './service.js';

const fakeDb = {} as typeof import('@cvg-his/db').db;

function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: 'product-1',
    accountId: 'account-1',
    name: 'Dipirona 500mg',
    code: 'DIP500',
    description: 'Analgésico',
    basePrice: 35,
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

describe('products service', () => {
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

  it('creates product and appends audit', async () => {
    repo.findByCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(makeProduct());

    const service = createProductsService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.create({
      name: 'Dipirona 500mg',
      code: 'DIP500',
      description: 'Analgésico',
      basePrice: 35
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        name: 'Dipirona 500mg',
        code: 'DIP500'
      })
    );
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'product.create',
        entityType: 'product',
        entityId: 'product-1'
      })
    );
    expect(result.id).toBe('product-1');
  });

  it('rejects duplicate code within same account', async () => {
    repo.findByCode.mockResolvedValue(makeProduct());

    const service = createProductsService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    await expect(
      service.create({
        name: 'Dipirona 500mg',
        code: 'DIP500',
        description: 'Analgésico',
        basePrice: 35
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(repo.create).not.toHaveBeenCalled();
  });

  it('updates product and appends audit', async () => {
    const before = makeProduct();
    const after = makeProduct({ name: 'Dipirona 1g', updatedAt: new Date('2026-01-01T02:00:00.000Z') });
    repo.findById.mockResolvedValue(before);
    repo.updateById.mockResolvedValue(after);
    repo.findByCode.mockResolvedValue(null);

    const service = createProductsService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.update('product-1', { name: 'Dipirona 1g' });

    expect(repo.updateById).toHaveBeenCalledWith('account-1', 'product-1', { name: 'Dipirona 1g' });
    expect(appendAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'product.update',
        beforeJson: before,
        afterJson: after
      })
    );
    expect(result?.name).toBe('Dipirona 1g');
  });

  it('lists products scoped by actor account', async () => {
    repo.list.mockResolvedValue({ data: [makeProduct()], page: 1, pageSize: 20, total: 1 });

    const service = createProductsService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.list({ page: 1, pageSize: 20, q: 'dip', active: true });

    expect(repo.list).toHaveBeenCalledWith({
      accountId: 'account-1',
      page: 1,
      pageSize: 20,
      q: 'dip',
      active: true
    });
    expect(result.total).toBe(1);
  });
});
