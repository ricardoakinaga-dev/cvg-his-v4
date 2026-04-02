import assert from 'node:assert/strict';
import test from 'node:test';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { CounterSalesService } from './index.js';

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

test('CounterSalesService addPayment rejects overpayment', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 50 });
  await assert.rejects(
    () => service.addPayment(sale.id, { method: 'cash', amount: 100 }),
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
  const s1 = await service.open(ACCOUNT_ID, USER_ID);
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
  const service = new CounterSalesService({
    inventoryService: {
      async consumeForSale(_accountId, codeSnapshot, quantity) {
        consumedCode = codeSnapshot;
        consumedQty = quantity;
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
