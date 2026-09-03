import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('../api', () => ({ apiRequest: mocks.apiRequest }));

describe('financeOperationalCatalogService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists one validated catalog type with encoded server-side filters', async () => {
    mocks.apiRequest.mockResolvedValueOnce({ items: [], totalItems: 0 });
    const { financeOperationalCatalogService } = await import('../financeOperationalCatalog');

    await financeOperationalCatalogService.list('payment-methods', {
      search: 'cartão',
      status: 'active',
      page: 2,
      pageSize: 25
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      '/finance/catalogs/payment-methods?search=cart%C3%A3o&status=active&page=2&pageSize=25'
    );
  });

  it('sends versioned writes and encodes item identifiers', async () => {
    mocks.apiRequest.mockResolvedValue({});
    const { financeOperationalCatalogService } = await import('../financeOperationalCatalog');
    const input = {
      code: 'SPLIT_CLINIC',
      name: 'Clínica',
      status: 'active' as const,
      configuration: {
        recipient: 'Centro Veterinário',
        percentage: 85,
        appliesTo: 'card',
        priority: 1
      }
    };

    await financeOperationalCatalogService.create('split-rules', input);
    await financeOperationalCatalogService.update('split-rules', 'item/1', 4, input);
    await financeOperationalCatalogService.remove('split-rules', 'item/1');

    expect(mocks.apiRequest).toHaveBeenNthCalledWith(1, '/finance/catalogs/split-rules', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    expect(mocks.apiRequest).toHaveBeenNthCalledWith(2, '/finance/catalogs/split-rules/item%2F1', {
      method: 'PATCH',
      body: JSON.stringify({ ...input, version: 4 })
    });
    expect(mocks.apiRequest).toHaveBeenNthCalledWith(3, '/finance/catalogs/split-rules/item%2F1', {
      method: 'DELETE'
    });
  });
});
