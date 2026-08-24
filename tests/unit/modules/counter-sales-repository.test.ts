import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, withTenantQueryMock } = vi.hoisted(() => {
  const queryMock = vi.fn();
  const withTenantQueryMock = vi.fn(
    async (_pool: unknown, fn: (client: { query: typeof queryMock }) => Promise<unknown>) =>
      fn({ query: queryMock })
  );
  return { queryMock, withTenantQueryMock };
});

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(() => ({ mocked: true }))
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: withTenantQueryMock
}));

import { NotFoundError } from '@cvg-his-v2/shared-errors';
import {
  DatabaseCounterSalesRepository,
  type CounterSaleItemRecord
} from '../../../packages/modules/counter-sales/src/repositories/database-counter-sales.repository.js';

const item: CounterSaleItemRecord = {
  id: 'item-1',
  counterSaleId: 'sale-1',
  accountId: 'account-1' as never,
  itemType: 'service',
  catalogItemId: null,
  nameSnapshot: 'Consulta',
  codeSnapshot: null,
  unitPrice: 100,
  quantity: 1,
  discountAmount: 0,
  lineTotal: 100,
  notes: null,
  createdAt: '2026-08-24T10:00:00.000Z',
  updatedAt: '2026-08-24T10:00:00.000Z'
};

describe('DatabaseCounterSalesRepository item tenant boundaries', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTenantQueryMock.mockClear();
  });

  it('scopes item updates by account and parent sale and rejects a missing row', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(new DatabaseCounterSalesRepository().updateItem(item)).rejects.toBeInstanceOf(
      NotFoundError
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE\s+id = \$1\s+AND account_id = \$2\s+AND counter_sale_id = \$3/),
      expect.arrayContaining(['item-1', 'account-1', 'sale-1'])
    );
  });

  it('scopes item selection by account and parent sale', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'item-1',
          counter_sale_id: 'sale-1',
          account_id: 'account-1',
          item_type: 'service',
          catalog_item_id: null,
          name_snapshot: 'Consulta',
          code_snapshot: null,
          unit_price: '100.00',
          quantity: 1,
          discount_amount: '0.00',
          line_total: '100.00',
          notes: null,
          created_at: '2026-08-24T10:00:00.000Z',
          updated_at: '2026-08-24T10:00:00.000Z'
        }
      ],
      rowCount: 1
    });

    const repository = new DatabaseCounterSalesRepository();
    const findItemsBySaleId = repository.findItemsBySaleId as unknown as (
      accountId: string,
      counterSaleId: string
    ) => Promise<readonly CounterSaleItemRecord[]>;
    const items = await findItemsBySaleId.call(repository, 'account-1', 'sale-1');

    expect(items).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE\s+account_id = \$1\s+AND counter_sale_id = \$2/),
      ['account-1', 'sale-1']
    );
  });

  it('scopes item deletion by account and parent sale and rejects a missing row', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const deleteItem = new DatabaseCounterSalesRepository().deleteItem as unknown as (
      itemId: string,
      accountId: string,
      counterSaleId: string
    ) => Promise<void>;
    await expect(deleteItem('item-1', 'account-1', 'sale-1')).rejects.toBeInstanceOf(NotFoundError);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE\s+id = \$1\s+AND account_id = \$2\s+AND counter_sale_id = \$3/),
      ['item-1', 'account-1', 'sale-1']
    );
  });
});
