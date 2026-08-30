import { describe, expect, it } from 'vitest';

import { ConflictError } from '@cvg-his-v2/shared-errors';

import { CounterSalesService } from '../../../packages/modules/counter-sales/src/index.js';

const ACCOUNT_ID = 'acc_test_001' as never;
const USER_ID = 'user_001' as never;

describe('CounterSalesService coverage guard', () => {
  it('closes product sale consuming inventory and recording only cash-like payments', async () => {
    const inventoryCalls: Array<{ codeSnapshot: string; quantity: number }> = [];
    const cashMovements: Array<{
      methodRef: string | null;
      amount: number;
      runningBalance: number;
    }> = [];

    const service = new CounterSalesService({
      inventoryService: {
        async consumeForSale(_accountId, codeSnapshot, quantity) {
          inventoryCalls.push({ codeSnapshot, quantity });
          return {
            id: 'cons-1',
            inventoryItemId: 'inv-1',
            quantity,
            unit: 'un',
            costAmount: 15
          };
        }
      },
      cashService: {
        async getOpenRegister() {
          return { id: 'cash-1', runningBalance: 100 };
        },
        async recordMovement(
          _cashRegisterId,
          _accountId,
          _movementType,
          amount,
          runningBalance,
          reference
        ) {
          cashMovements.push({ methodRef: reference, amount, runningBalance });
          return {
            id: `cash-mv-${cashMovements.length}`,
            cashRegisterId: 'cash-1',
            movementType: 'payment',
            amount,
            runningBalance,
            reference,
            notes: null
          };
        }
      }
    });

    const sale = await service.open(ACCOUNT_ID, USER_ID, { ownerId: 'owner-1', notes: 'balcao' });
    await service.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Dipirona',
      codeSnapshot: 'MED-001',
      unitPrice: 12.5,
      quantity: 2
    });
    await service.addItem(sale.id, {
      itemType: 'service',
      nameSnapshot: 'Aplicacao',
      unitPrice: 30
    });
    await service.addPayment(sale.id, { method: 'cash', amount: 20, reference: 'CASH-1' });
    await service.addPayment(sale.id, { method: 'credit_card', amount: 35, reference: 'CC-1' });

    const result = await service.close(sale.id, USER_ID);

    expect(result.sale.status).toBe('closed');
    expect(result.inventoryConsumptions).toHaveLength(1);
    expect(inventoryCalls).toEqual([{ codeSnapshot: 'MED-001', quantity: 2 }]);
    expect(result.cashMovements).toHaveLength(1);
    expect(cashMovements).toEqual([{ methodRef: 'CASH-1', amount: 20, runningBalance: 120 }]);
  });

  it('rejects close when inventory consumption fails and keeps sale open', async () => {
    const service = new CounterSalesService({
      inventoryService: {
        async consumeForSale() {
          throw new Error('stock unavailable');
        }
      }
    });

    const sale = await service.open(ACCOUNT_ID, USER_ID);
    await service.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Dipirona',
      codeSnapshot: 'MED-001',
      unitPrice: 12.5,
      quantity: 1
    });
    await service.addPayment(sale.id, { method: 'pix', amount: 12.5 });

    await expect(service.close(sale.id, USER_ID)).rejects.toThrow(ConflictError);
    expect(service.getOrThrow(sale.id).status).toBe('open');
  });

  it('filters sales by owner, search text and date range', async () => {
    const service = new CounterSalesService();

    const first = await service.open(ACCOUNT_ID, USER_ID, {
      ownerId: 'owner-1',
      notes: 'cliente ana'
    });
    const second = await service.open(ACCOUNT_ID, USER_ID, {
      ownerId: 'owner-2',
      notes: 'cliente bruno'
    });

    const ownerFiltered = service.list(ACCOUNT_ID, { ownerId: 'owner-1' });
    const searchFiltered = service.list(ACCOUNT_ID, { search: 'bruno' });
    const date = new Date(first.createdAt).toISOString().slice(0, 10);
    const dateFiltered = service.list(ACCOUNT_ID, { dateFrom: date, dateTo: date });

    expect(ownerFiltered.map((sale) => sale.id)).toEqual([first.id]);
    expect(searchFiltered.map((sale) => sale.id)).toEqual([second.id]);
    expect(dateFiltered).toHaveLength(2);
  });

  it('hydrates persisted sales and exposes repository dashboard aggregates', async () => {
    const service = new CounterSalesService({
      repository: {
        async create() {},
        async update() {},
        async findByAccountId() {
          return [
            {
              id: 'sale_repo_1',
              accountId: ACCOUNT_ID,
              number: 'CS-900001',
              ownerId: 'owner-1',
              status: 'closed',
              subtotal: 120,
              discountAmount: 10,
              total: 110,
              paidAmount: 110,
              balanceDue: 0,
              notes: 'repositorio',
              openedByUserId: USER_ID,
              closedByUserId: USER_ID,
              closedAt: '2026-04-18T10:00:00.000Z',
              createdAt: '2026-04-18T09:00:00.000Z',
              updatedAt: '2026-04-18T10:00:00.000Z'
            }
          ];
        },
        async findItemsBySaleId() {
          return [
            {
              id: 'item_repo_1',
              counterSaleId: 'sale_repo_1',
              accountId: ACCOUNT_ID,
              itemType: 'product',
              catalogItemId: 'prod-1',
              nameSnapshot: 'Dipirona',
              codeSnapshot: 'MED-001',
              unitPrice: 55,
              quantity: 2,
              discountAmount: 0,
              lineTotal: 110,
              notes: null,
              createdAt: '2026-04-18T09:05:00.000Z',
              updatedAt: '2026-04-18T09:05:00.000Z'
            }
          ];
        },
        async findPaymentsBySaleId() {
          return [
            {
              id: 'payment_repo_1',
              counterSaleId: 'sale_repo_1',
              accountId: ACCOUNT_ID,
              method: 'pix',
              amount: 110,
              installments: 1,
              reference: 'PIX-1',
              notes: null,
              createdAt: '2026-04-18T10:00:00.000Z'
            }
          ];
        },
        async findReceipt() {
          return null;
        },
        async createItem() {},
        async updateItem() {},
        async deleteItem() {},
        async createPayment() {},
        async getOpenSalesCount() {
          return 2;
        },
        async getClosedTodayCount() {
          return 5;
        },
        async getRevenueToday() {
          return { gross: 560, net: 520 };
        },
        async getSalesByPaymentMethod() {
          return [{ method: 'pix', total: 520 }];
        },
        async getTopProducts() {
          return [{ name: 'Dipirona', quantity: 8, revenue: 220 }];
        },
        async getTopServices() {
          return [{ name: 'Consulta', quantity: 3, revenue: 300 }];
        },
        async getLowStockAlerts() {
          return [{ name: 'Dipirona', code: 'MED-001', onHand: 2, reorderLevel: 5 }];
        }
      } as never
    });

    expect(service.persistenceMode).toBe('database');

    await service.hydrateFromDatabase(ACCOUNT_ID);

    expect(service.getItems('sale_repo_1')).toHaveLength(1);
    expect(service.getPayments('sale_repo_1')).toHaveLength(1);
    expect(service.findById('sale_repo_1')?.number).toBe('CS-900001');

    const dashboard = await service.getCommercialDashboard(ACCOUNT_ID);
    expect(dashboard.openSales).toBe(2);
    expect(dashboard.closedToday).toBe(5);
    expect(dashboard.grossRevenueToday).toBe(560);
    expect(dashboard.netRevenueToday).toBe(520);
    expect(dashboard.avgTicket).toBe(112);
    expect(dashboard.lowStockAlerts).toHaveLength(1);
  });

  it('builds in-memory commercial reports for summary, products, services and payments', async () => {
    const service = new CounterSalesService();

    const sale = await service.open(ACCOUNT_ID, USER_ID, { notes: 'cliente premium' });
    await service.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Dipirona',
      codeSnapshot: 'MED-001',
      unitPrice: 20,
      quantity: 2
    });
    await service.addItem(sale.id, {
      itemType: 'service',
      nameSnapshot: 'Consulta',
      unitPrice: 80
    });
    await service.addPayment(sale.id, { method: 'cash', amount: 40 });
    await service.addPayment(sale.id, { method: 'pix', amount: 80 });
    await service.close(sale.id, USER_ID);

    const summary = await service.getCommercialReport(ACCOUNT_ID, 'summary');
    const sales = await service.getCommercialReport(ACCOUNT_ID, 'sales');
    const payments = await service.getCommercialReport(ACCOUNT_ID, 'payments');
    const products = await service.getCommercialReport(ACCOUNT_ID, 'products');
    const services = await service.getCommercialReport(ACCOUNT_ID, 'services');
    const quotes = await service.getCommercialReport(ACCOUNT_ID, 'quotes');

    expect(summary.type).toBe('summary');
    expect((summary.data as { grossRevenue: number }).grossRevenue).toBe(120);
    expect((sales.data as { closedSales: number }).closedSales).toBe(1);
    expect(
      (payments.data as { byMethod: Array<{ method: string; total: number }> }).byMethod
    ).toEqual([
      { method: 'pix', count: 1, total: 80 },
      { method: 'cash', count: 1, total: 40 }
    ]);
    expect(
      (products.data as { products: Array<{ name: string; revenue: number }> }).products[0]
    ).toEqual({
      name: 'Dipirona',
      quantity: 2,
      revenue: 40
    });
    expect(
      (services.data as { services: Array<{ name: string; revenue: number }> }).services[0]
    ).toEqual({
      name: 'Consulta',
      quantity: 1,
      revenue: 80
    });
    expect((quotes.data as { note: string }).note).toContain('quotes module');
  });

  it('updates and removes items while recalculating totals', async () => {
    const service = new CounterSalesService();

    const sale = await service.open(ACCOUNT_ID, USER_ID);
    const first = await service.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Dipirona',
      codeSnapshot: 'MED-001',
      unitPrice: 10,
      quantity: 1
    });
    const second = await service.addItem(sale.id, {
      itemType: 'service',
      nameSnapshot: 'Consulta',
      unitPrice: 50
    });

    const updated = await service.updateItem(first.item.id, {
      quantity: 3,
      discountAmount: 5
    });
    const recalculated = await service.removeItem(second.item.id);

    expect(updated.item.lineTotal).toBe(25);
    expect(updated.sale.total).toBe(75);
    expect(recalculated.total).toBe(25);
    expect(service.getItems(sale.id)).toHaveLength(1);
  });

  it('cancels open sales and blocks reopening after an immutable receipt', async () => {
    const service = new CounterSalesService();

    const cancelledSale = await service.open(ACCOUNT_ID, USER_ID, { notes: 'cancelavel' });
    const cancelled = await service.cancel(cancelledSale.id, {
      accountId: ACCOUNT_ID,
      cancelledByUserId: USER_ID,
      reason: 'Cliente desistiu',
      correlationId: 'counter-sale-unit-cancel'
    });

    expect(cancelled.status).toBe('cancelled');

    const sale = await service.open(ACCOUNT_ID, USER_ID);
    await service.addItem(sale.id, {
      itemType: 'product',
      nameSnapshot: 'Item',
      unitPrice: 10
    });
    await service.addPayment(sale.id, { method: 'cash', amount: 10 });
    await service.close(sale.id, USER_ID);

    await expect(service.reopen(sale.id)).rejects.toThrow(
      'Cannot reopen a sale after its financial receipt was issued'
    );
    expect(service.getOrThrow(sale.id).status).toBe('closed');
  });
});
