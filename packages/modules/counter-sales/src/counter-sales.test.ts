import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { CounterSalesService } from './index.js';
import type {
  CounterSaleRecord,
  CounterSalesRepository
} from './repositories/database-counter-sales.repository.js';

function createService() {
  return new CounterSalesService();
}

const ACCOUNT_ID = 'acc_test_001' as AccountId;
const USER_ID = 'user_001' as UserId;

test('CounterSalesService open creates a sale with correct fields', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID, { notes: 'Test sale' });
  assert.equal(sale.accountId, ACCOUNT_ID);
  assert.equal(sale.openedByUserId, USER_ID);
  assert.equal(sale.status, 'open');
  assert.equal(sale.subtotal, 0);
  assert.equal(sale.total, 0);
  assert.equal(sale.paidAmount, 0);
  assert.equal(sale.balanceDue, 0);
  assert.ok(sale.id);
  assert.ok(sale.number);
  assert.ok(sale.number.startsWith('CS-'));
});

test('CounterSalesService addItem adds product item', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  const result = await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'Dipirona',
    codeSnapshot: 'MED-001',
    unitPrice: 12.5,
    quantity: 2
  });
  assert.equal(result.item.itemType, 'product');
  assert.equal(result.item.nameSnapshot, 'Dipirona');
  assert.equal(result.item.unitPrice, 12.5);
  assert.equal(result.item.quantity, 2);
  assert.equal(result.item.lineTotal, 25);
  assert.equal(result.sale.subtotal, 25);
  assert.equal(result.sale.total, 25);
});

test('CounterSalesService addItem adds service item', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  const result = await service.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 120
  });
  assert.equal(result.item.itemType, 'service');
  assert.equal(result.item.lineTotal, 120);
  assert.equal(result.sale.total, 120);
});

test('CounterSalesService rejects invalid item financial inputs', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);

  await assert.rejects(
    () => service.addItem(sale.id, { itemType: 'product', nameSnapshot: '', unitPrice: 10 }),
    ConflictError
  );
  await assert.rejects(
    () =>
      service.addItem(sale.id, {
        itemType: 'product',
        nameSnapshot: 'Item',
        unitPrice: -1
      }),
    ConflictError
  );
  await assert.rejects(
    () =>
      service.addItem(sale.id, {
        itemType: 'product',
        nameSnapshot: 'Item',
        unitPrice: 10,
        quantity: 0
      }),
    ConflictError
  );
  await assert.rejects(
    () =>
      service.addItem(sale.id, {
        itemType: 'product',
        nameSnapshot: 'Item',
        unitPrice: 10,
        discountAmount: -1
      }),
    ConflictError
  );
});

test('CounterSalesService updateItem updates quantity and discount', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  const { item } = await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'Item',
    unitPrice: 10,
    quantity: 1
  });
  const result = await service.updateItem(item.id, { quantity: 3, discountAmount: 5 });
  assert.equal(result.item.quantity, 3);
  assert.equal(result.item.discountAmount, 5);
  assert.equal(result.item.lineTotal, 25);
  assert.equal(result.sale.total, 25);
});

test('CounterSalesService rejects invalid item updates', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  const { item } = await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'Item',
    unitPrice: 10,
    quantity: 1
  });

  await assert.rejects(() => service.updateItem(item.id, { quantity: 0 }), ConflictError);
  await assert.rejects(() => service.updateItem(item.id, { discountAmount: -1 }), ConflictError);
});

test('CounterSalesService removeItem removes and recalculates', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'A', unitPrice: 10 });
  const { item } = await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'B',
    unitPrice: 20
  });
  const updated = await service.removeItem(item.id);
  assert.equal(updated.total, 10);
  assert.equal(service.getItems(sale.id).length, 1);
});

test('CounterSalesService addPayment registers payment', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 100 });
  const result = await service.addPayment(sale.id, { method: 'pix', amount: 100 });
  assert.equal(result.payment.method, 'pix');
  assert.equal(result.payment.amount, 100);
  assert.equal(result.sale.paidAmount, 100);
  assert.equal(result.sale.balanceDue, 0);
});

test('CounterSalesService persists recalculated totals after items and payments in database mode', async () => {
  const updatedSales: CounterSaleRecord[] = [];
  const repository: CounterSalesRepository = {
    async create() {},
    async update(sale) {
      updatedSales.push(sale);
    },
    async findById() {
      return null;
    },
    async findByAccountId() {
      return [];
    },
    async createItem() {},
    async updateItem() {},
    async deleteItem() {},
    async findItemsBySaleId() {
      return [];
    },
    async createPayment() {},
    async findPaymentsBySaleId() {
      return [];
    },
    async getOpenSalesCount() {
      return 0;
    },
    async getClosedTodayCount() {
      return 0;
    },
    async getRevenueToday() {
      return { gross: 0, net: 0 };
    },
    async getSalesByPaymentMethod() {
      return [];
    },
    async getTopProducts() {
      return [];
    },
    async getTopServices() {
      return [];
    },
    async getLowStockAlerts() {
      return [];
    }
  };

  const service = new CounterSalesService({ repository });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  const added = await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'Antipulgas',
    unitPrice: 80,
    quantity: 2,
    discountAmount: 10
  });
  await service.addPayment(sale.id, { method: 'pix', amount: 50 });
  await service.updateItem(added.item.id, { quantity: 1, discountAmount: 5 });
  await assert.rejects(() => service.removeItem(added.item.id), ConflictError);

  assert.equal(updatedSales.length, 3);
  assert.deepEqual(
    updatedSales.map((updated) => ({
      subtotal: updated.subtotal,
      discountAmount: updated.discountAmount,
      total: updated.total,
      paidAmount: updated.paidAmount,
      balanceDue: updated.balanceDue
    })),
    [
      { subtotal: 160, discountAmount: 10, total: 150, paidAmount: 0, balanceDue: 150 },
      { subtotal: 160, discountAmount: 10, total: 150, paidAmount: 50, balanceDue: 100 },
      { subtotal: 80, discountAmount: 5, total: 75, paidAmount: 50, balanceDue: 25 }
    ]
  );
});

test('CounterSalesService addPayment rejects overpayment', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 50 });
  await assert.rejects(
    () => service.addPayment(sale.id, { method: 'cash', amount: 100 }),
    ConflictError
  );
});

test('CounterSalesService rejects invalid payment inputs', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 50 });

  await assert.rejects(
    () => service.addPayment(sale.id, { method: 'cash', amount: 0 }),
    ConflictError
  );
  await assert.rejects(
    () => service.addPayment(sale.id, { method: 'cash', amount: -10 }),
    ConflictError
  );
  await assert.rejects(
    () => service.addPayment(sale.id, { method: 'cash', amount: 10, installments: 0 }),
    ConflictError
  );
});

test('CounterSalesService close requires full payment', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 100 });
  await assert.rejects(() => service.close(sale.id, USER_ID), ConflictError);
  await service.addPayment(sale.id, { method: 'pix', amount: 100 });
  const closed = await service.close(sale.id, USER_ID);
  assert.equal(closed.sale.status, 'closed');
  assert.ok(closed.sale.closedAt);
});

test('CounterSalesService cancel works on open sale', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  const cancelled = await service.cancel(sale.id);
  assert.equal(cancelled.status, 'cancelled');
});

test('CounterSalesService cancel rejects closed sale', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 10 });
  await service.addPayment(sale.id, { method: 'cash', amount: 10 });
  await service.close(sale.id, USER_ID);
  await assert.rejects(() => service.cancel(sale.id), ConflictError);
});

test('CounterSalesService reopen works on closed sale', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 10 });
  await service.addPayment(sale.id, { method: 'cash', amount: 10 });
  await service.close(sale.id, USER_ID);
  const reopened = await service.reopen(sale.id);
  assert.equal(reopened.status, 'open');
  assert.equal(reopened.closedByUserId, null);
  assert.equal(reopened.closedAt, null);
});

test('CounterSalesService list filters by status', async () => {
  const service = createService();
  await service.open(ACCOUNT_ID, USER_ID);
  const s2 = await service.open(ACCOUNT_ID, USER_ID);
  await service.cancel(s2.id);
  const open = service.list(ACCOUNT_ID, { status: 'open' });
  const cancelled = service.list(ACCOUNT_ID, { status: 'cancelled' });
  assert.equal(open.length, 1);
  assert.equal(cancelled.length, 1);
});

test('CounterSalesService list filters by search', async () => {
  const service = createService();
  await service.open(ACCOUNT_ID, USER_ID, { notes: 'Cliente Joao' });
  await service.open(ACCOUNT_ID, USER_ID, { notes: 'Cliente Maria' });
  const results = service.list(ACCOUNT_ID, { search: 'joao' });
  assert.equal(results.length, 1);
});

test('CounterSalesService getItems returns items for sale', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'A', unitPrice: 10 });
  await service.addItem(sale.id, { itemType: 'service', nameSnapshot: 'B', unitPrice: 20 });
  const items = service.getItems(sale.id);
  assert.equal(items.length, 2);
});

test('CounterSalesService getPayments returns payments for sale', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 50 });
  await service.addPayment(sale.id, { method: 'pix', amount: 30 });
  await service.addPayment(sale.id, { method: 'cash', amount: 20 });
  const payments = service.getPayments(sale.id);
  assert.equal(payments.length, 2);
});

test('CounterSalesService addItem rejects on non-open sale', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.cancel(sale.id);
  await assert.rejects(
    () => service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'X', unitPrice: 10 }),
    ConflictError
  );
});

test('CounterSalesService persistenceMode is in-memory without repository', () => {
  const service = createService();
  assert.equal(service.persistenceMode, 'in-memory');
});

test('CounterSalesService getCommercialDashboard returns data', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 100 });
  await service.addPayment(sale.id, { method: 'pix', amount: 100 });
  await service.close(sale.id, USER_ID);
  const dashboard = await service.getCommercialDashboard(ACCOUNT_ID);
  assert.equal(dashboard.openSales, 0);
  assert.equal(dashboard.closedToday, 1);
  assert.equal(dashboard.grossRevenueToday, 100);
  assert.equal(dashboard.netRevenueToday, 100);
  assert.equal(dashboard.avgTicket, 100);
  assert.equal(dashboard.salesByPaymentMethod.length, 1);
  assert.equal(dashboard.salesByPaymentMethod[0].method, 'pix');
  assert.equal(dashboard.salesByPaymentMethod[0].total, 100);
});

test('CounterSalesService close consumes inventory for product items', async () => {
  let consumedCode: string | null = null;
  let consumedQty = 0;
  let consumedByUserId: string | null = null;
  const service = new CounterSalesService({
    inventoryService: {
      async consumeForSale(_accountId, codeSnapshot, quantity, recordedByUserId) {
        consumedCode = codeSnapshot;
        consumedQty = quantity;
        consumedByUserId = recordedByUserId;
        return { id: 'cons-1', inventoryItemId: 'inv-1', quantity, unit: 'un', costAmount: 0 };
      }
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'Dipirona',
    codeSnapshot: 'MED-001',
    unitPrice: 12.5,
    quantity: 3
  });
  await service.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 120
  });
  await service.addPayment(sale.id, { method: 'cash', amount: 157.5 });
  const result = await service.close(sale.id, USER_ID);
  assert.equal(result.sale.status, 'closed');
  assert.ok(result.inventoryConsumptions);
  assert.equal(result.inventoryConsumptions.length, 1);
  assert.equal(consumedCode, 'MED-001');
  assert.equal(consumedQty, 3);
  assert.equal(consumedByUserId, USER_ID);
});

test('CounterSalesService close skips inventory for service-only sale', async () => {
  let consumed = false;
  const service = new CounterSalesService({
    inventoryService: {
      async consumeForSale() {
        consumed = true;
        throw new Error('Should not be called');
      }
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Banho',
    unitPrice: 50
  });
  await service.addPayment(sale.id, { method: 'pix', amount: 50 });
  const result = await service.close(sale.id, USER_ID);
  assert.equal(result.sale.status, 'closed');
  assert.equal(result.inventoryConsumptions, undefined);
  assert.equal(consumed, false);
});

test('CounterSalesService close fails when inventory consumption fails', async () => {
  const service = new CounterSalesService({
    inventoryService: {
      async consumeForSale() {
        throw new Error('Insufficient stock');
      }
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'Item X',
    codeSnapshot: 'SKU-001',
    unitPrice: 10,
    quantity: 1
  });
  await service.addPayment(sale.id, { method: 'cash', amount: 10 });
  await assert.rejects(
    () => service.close(sale.id, USER_ID),
    (err: Error) => {
      assert.ok(err instanceof ConflictError);
      assert.ok(err.message.includes('Insufficient stock'));
      return true;
    }
  );
  const saleAfter = service.findById(sale.id);
  assert.equal(saleAfter?.status, 'open');
});

test('CounterSalesService close records cash movements for cash/pix/debit payments', async () => {
  const movements: { method: string; amount: number }[] = [];
  const service = new CounterSalesService({
    cashService: {
      async getOpenRegister() {
        return { id: 'reg-1', runningBalance: 100 };
      },
      async recordMovement(_regId, _acct, _type, amount, _bal, _ref, notes) {
        const method = notes?.split('via ')[1] ?? 'unknown';
        movements.push({ method, amount });
        return {
          id: 'mov-1',
          cashRegisterId: 'reg-1',
          movementType: 'payment' as const,
          amount,
          runningBalance: _bal,
          reference: _ref,
          notes
        };
      }
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'A', unitPrice: 30 });
  await service.addPayment(sale.id, { method: 'cash', amount: 15 });
  await service.addPayment(sale.id, { method: 'pix', amount: 15 });
  const result = await service.close(sale.id, USER_ID);
  assert.equal(result.sale.status, 'closed');
  assert.ok(result.cashMovements);
  assert.equal(result.cashMovements.length, 2);
  assert.equal(movements.length, 2);
  assert.equal(movements[0].method, 'cash');
  assert.equal(movements[0].amount, 15);
  assert.equal(movements[1].method, 'pix');
  assert.equal(movements[1].amount, 15);
});

test('CounterSalesService close does not record credit_card in cash movements', async () => {
  let recorded = false;
  const service = new CounterSalesService({
    cashService: {
      async getOpenRegister() {
        return { id: 'reg-1', runningBalance: 0 };
      },
      async recordMovement() {
        recorded = true;
        throw new Error('Should not be called for credit_card');
      }
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'A', unitPrice: 100 });
  await service.addPayment(sale.id, { method: 'credit_card', amount: 100 });
  const result = await service.close(sale.id, USER_ID);
  assert.equal(result.sale.status, 'closed');
  assert.equal(recorded, false);
});

test('CounterSalesService preserves item state when recalculation would make totals invalid', async () => {
  const service = new CounterSalesService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await assert.rejects(
    () =>
      service.addItem(sale.id, {
        itemType: 'product',
        nameSnapshot: 'Desconto inválido',
        unitPrice: 10,
        discountAmount: 20
      }),
    /total cannot be negative/
  );
  assert.equal(service.getItems(sale.id).length, 0);

  const first = await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'Item principal',
    unitPrice: 10
  });
  const second = await service.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Complemento',
    unitPrice: 5
  });
  await service.addPayment(sale.id, { method: 'cash', amount: 15 });

  await assert.rejects(
    () => service.updateItem(first.item.id, { discountAmount: 20 }),
    /total cannot be negative|payments exceed recalculated total/
  );
  assert.equal(
    service.getItems(sale.id).find((item) => item.id === first.item.id)?.discountAmount,
    0
  );

  await assert.rejects(
    () => service.removeItem(second.item.id),
    /payments exceed recalculated total/
  );
  assert.equal(
    service.getItems(sale.id).some((item) => item.id === second.item.id),
    true
  );
});

test('CounterSalesService enforces missing resources and terminal sale states', async () => {
  const service = new CounterSalesService();
  assert.throws(() => service.getOrThrow('missing'), NotFoundError);
  await assert.rejects(() => service.updateItem('missing', {}), NotFoundError);
  await assert.rejects(() => service.removeItem('missing'), NotFoundError);
  await assert.rejects(
    () => service.addPayment('missing', { method: 'cash', amount: 1 }),
    NotFoundError
  );
  await assert.rejects(() => service.close('missing', USER_ID), NotFoundError);
  await assert.rejects(() => service.cancel('missing'), NotFoundError);
  await assert.rejects(() => service.reopen('missing'), NotFoundError);

  const cancelled = await service.open(ACCOUNT_ID, USER_ID);
  await service.cancel(cancelled.id);
  await assert.rejects(
    () => service.addPayment(cancelled.id, { method: 'cash', amount: 1 }),
    /non-open sale/
  );
  await assert.rejects(() => service.close(cancelled.id, USER_ID), /Sale is not open/);
  await assert.rejects(() => service.reopen(cancelled.id), /only reopen closed sales/i);

  const closed = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(closed.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 10
  });
  await service.addPayment(closed.id, { method: 'cash', amount: 10 });
  await service.close(closed.id, USER_ID);
  const item = service.getItems(closed.id)[0]!;
  await assert.rejects(() => service.updateItem(item.id, { quantity: 2 }), /non-open sale/);
  await assert.rejects(() => service.removeItem(item.id), /non-open sale/);
  await assert.rejects(() => service.close(closed.id, USER_ID), /Sale is not open/);
  await assert.rejects(() => service.cancel(closed.id), /Cannot cancel a closed sale/);
});

test('CounterSalesService closes safely without cash register and reports non-Error stock failures', async () => {
  const noRegister = new CounterSalesService({
    cashService: {
      async getOpenRegister() {
        return null;
      },
      async recordMovement() {
        throw new Error('must not record without register');
      }
    }
  });
  const sale = await noRegister.open(ACCOUNT_ID, USER_ID);
  await noRegister.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 20
  });
  await noRegister.addPayment(sale.id, {
    method: 'cash',
    amount: 20,
    reference: null,
    notes: null
  });
  const closed = await noRegister.close(sale.id, USER_ID);
  assert.equal(closed.cashMovements, undefined);

  const failingInventory = new CounterSalesService({
    inventoryService: {
      async consumeForSale() {
        throw 'estoque indisponível';
      }
    }
  });
  const inventorySale = await failingInventory.open(ACCOUNT_ID, USER_ID);
  await failingInventory.addItem(inventorySale.id, {
    itemType: 'product',
    nameSnapshot: 'Produto',
    codeSnapshot: 'SKU-STRING-ERROR',
    unitPrice: 5
  });
  await failingInventory.addPayment(inventorySale.id, { method: 'pix', amount: 5 });
  await assert.rejects(
    () => failingInventory.close(inventorySale.id, USER_ID),
    /estoque indisponível/
  );
});
