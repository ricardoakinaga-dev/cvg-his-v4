import assert from 'node:assert/strict';
import { test, vi } from 'vitest';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { CounterSalesService } from './index.js';
import type {
  CounterSaleItemRecord,
  CounterSalePaymentRecord,
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

test('CounterSalesService allocates unique numbers when replicas race in one account', async () => {
  const persisted: CounterSaleRecord[] = [];
  let nextNumber = 0;
  let allocationTail = Promise.resolve();
  const repository = {
    async create() {
      throw new Error('legacy explicit-number create path must not be used for opening sales');
    },
    async createWithNextNumber(draft: Omit<CounterSaleRecord, 'number'>) {
      const allocation = allocationTail.then(() => {
        const number = `CS-${String(++nextNumber).padStart(6, '0')}`;
        const sale = { ...draft, number } as CounterSaleRecord;
        persisted.push(sale);
        return sale;
      });
      allocationTail = allocation.then(
        () => undefined,
        () => undefined
      );
      return allocation;
    },
    async findByAccountId(accountId: AccountId) {
      return persisted.filter((sale) => sale.accountId === accountId);
    }
  } as unknown as CounterSalesRepository;

  const replicaA = new CounterSalesService({ repository });
  const replicaB = new CounterSalesService({ repository });
  const [saleA, saleB] = await Promise.all([
    replicaA.open(ACCOUNT_ID, USER_ID),
    replicaB.open(ACCOUNT_ID, USER_ID)
  ]);

  assert.deepEqual(new Set([saleA.number, saleB.number]).size, 2);
  assert.deepEqual([saleA.number, saleB.number].sort(), ['CS-000001', 'CS-000002']);
  assert.equal(persisted.length, 2);
});

test('CounterSalesService keeps generated number sequences scoped to each account', async () => {
  const accountB = 'acc_test_002' as AccountId;
  const service = createService();

  const [saleA, saleB] = await Promise.all([
    service.open(ACCOUNT_ID, USER_ID),
    service.open(accountB, USER_ID)
  ]);

  assert.equal(saleA.number, 'CS-000001');
  assert.equal(saleB.number, 'CS-000001');
});

test('CounterSalesService bounds sustained number-allocation contention', async () => {
  let allocationAttempts = 0;
  const repository = {
    async createWithNextNumber() {
      allocationAttempts += 1;
      throw new ConflictError('Counter sale number allocation is currently contended');
    },
    async create() {
      throw new Error('legacy explicit-number create path must not be used for opening sales');
    },
    async findByAccountId() {
      return [];
    }
  } as unknown as CounterSalesRepository;
  const service = new CounterSalesService({ repository });

  await assert.rejects(
    () => service.open(ACCOUNT_ID, USER_ID),
    (error: unknown) => error instanceof ConflictError && /allocation/i.test(error.message)
  );
  assert.equal(allocationAttempts, 1);
  assert.deepEqual(service.list(ACCOUNT_ID), []);
});

test('CounterSalesService open preserves the clinical context of the episode', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID, {
    ownerId: 'owner-1',
    patientId: 'patient-1',
    encounterId: 'encounter-1',
    queueEntryId: 'queue-1',
    billingRecordId: 'billing-1'
  } as never);

  assert.equal((sale as unknown as { patientId: string | null }).patientId, 'patient-1');
  assert.equal((sale as unknown as { encounterId: string | null }).encounterId, 'encounter-1');
  assert.equal((sale as unknown as { queueEntryId: string | null }).queueEntryId, 'queue-1');
  assert.equal(
    (sale as unknown as { billingRecordId: string | null }).billingRecordId,
    'billing-1'
  );
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

test('CounterSalesService forwards the payment idempotency key to the atomic repository', async () => {
  let capturedPayment: Record<string, unknown> | undefined;
  let openedSale: CounterSaleRecord | null = null;
  const repository: CounterSalesRepository = {
    async create() {},
    async createWithNextNumber(sale) {
      return { ...sale, number: 'CS-000001' };
    },
    async update() {},
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
    async recordPayment(payment) {
      if (!openedSale) {
        throw new Error('sale fixture was not initialized');
      }
      capturedPayment = payment as unknown as Record<string, unknown>;
      return {
        sale: {
          ...openedSale,
          total: 100,
          paidAmount: 100,
          balanceDue: 0,
          updatedAt: payment.createdAt
        },
        payment
      };
    },
    async findPaymentsBySaleId() {
      return [];
    },
    async createReceipt(receipt) {
      return receipt;
    },
    async findReceipt() {
      return null;
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
  openedSale = sale;
  await service.addItem(sale.id, { itemType: 'service', nameSnapshot: 'Consulta', unitPrice: 100 });
  const paymentInput = {
    method: 'pix',
    amount: 100,
    idempotencyKey: 'payment-retry-001'
  } as const;
  await service.addPayment(sale.id, paymentInput);

  assert.equal(capturedPayment?.idempotencyKey, 'payment-retry-001');
});

test('CounterSalesService persists recalculated totals after items and payments in database mode', async () => {
  const updatedSales: CounterSaleRecord[] = [];
  const repository: CounterSalesRepository = {
    async create() {},
    async createWithNextNumber(sale) {
      return { ...sale, number: 'CS-000001' };
    },
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
    async createReceipt(receipt) {
      return receipt;
    },
    async findReceipt() {
      return null;
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

test('CounterSalesService reloads the close snapshot inside the transaction boundary', async () => {
  const sales = new Map<string, CounterSaleRecord>();
  const items = new Map<string, CounterSaleItemRecord>();
  const payments = new Map<string, CounterSalePaymentRecord>();
  let inTransactionBoundary = false;
  let refreshedInsideTransaction = false;

  const repository = {
    async create(sale: CounterSaleRecord) {
      sales.set(sale.id, sale);
    },
    async createWithNextNumber(sale: Omit<CounterSaleRecord, 'number'>) {
      const record = { ...sale, number: 'CS-000001' } as CounterSaleRecord;
      sales.set(record.id, record);
      return record;
    },
    async update(sale: CounterSaleRecord) {
      sales.set(sale.id, sale);
    },
    async lockSaleForUpdate(saleId: string) {
      if (inTransactionBoundary) refreshedInsideTransaction = true;
      return sales.get(saleId) ?? null;
    },
    async findByAccountId(accountId: AccountId) {
      return Array.from(sales.values()).filter((sale) => sale.accountId === accountId);
    },
    async createItem(item: CounterSaleItemRecord) {
      items.set(item.id, item);
    },
    async findItemsBySaleId(saleId: string) {
      return Array.from(items.values()).filter((item) => item.counterSaleId === saleId);
    },
    async createPayment(payment: CounterSalePaymentRecord) {
      payments.set(payment.id, payment);
    },
    async findPaymentsBySaleId(saleId: string) {
      return Array.from(payments.values()).filter((payment) => payment.counterSaleId === saleId);
    },
    async findReceipt() {
      return null;
    },
    async createReceipt(receipt: never) {
      return receipt;
    }
  } as unknown as CounterSalesRepository;

  const service = new CounterSalesService({
    repository,
    closeTransaction: async (_input, execute) => {
      inTransactionBoundary = true;
      try {
        return await execute();
      } finally {
        inTransactionBoundary = false;
      }
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'service', nameSnapshot: 'Consulta', unitPrice: 100 });
  await service.addPayment(sale.id, { method: 'pix', amount: 100 });

  await service.close(sale.id, USER_ID);
  assert.equal(refreshedInsideTransaction, true);
});

test('CounterSalesService settle atomically applies the final payment and close', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'service', nameSnapshot: 'Consulta', unitPrice: 100 });

  const settled = await service.settle(sale.id, USER_ID, {
    payments: [{ method: 'pix', amount: 100 }]
  });

  assert.equal(settled.sale.status, 'closed');
  assert.equal(settled.sale.paidAmount, 100);
  assert.equal(settled.receipt.amount, 100);
  assert.equal(service.getPayments(sale.id).length, 1);
});

test('CounterSalesService settle restores its projection when the close boundary rolls back', async () => {
  const service = new CounterSalesService({
    closeTransaction: async () => {
      throw new Error('settlement rollback');
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'service', nameSnapshot: 'Consulta', unitPrice: 100 });

  await assert.rejects(
    () =>
      service.settle(sale.id, USER_ID, {
        payments: [{ method: 'pix', amount: 100, idempotencyKey: 'settle-retry-001' }]
      }),
    /settlement rollback/
  );
  assert.equal(service.findById(sale.id)?.status, 'open');
  assert.equal(service.findById(sale.id)?.paidAmount, 0);
  assert.equal(service.getPayments(sale.id).length, 0);

  const retried = await service.addPayment(sale.id, {
    method: 'pix',
    amount: 100,
    idempotencyKey: 'settle-retry-001'
  });
  assert.equal(retried.payment.amount, 100);
  assert.equal(service.getPayments(sale.id).length, 1);
});

test('CounterSalesService close creates one immutable receipt in the same boundary', async () => {
  const receipts: unknown[] = [];
  const repository = {
    async create() {},
    async createWithNextNumber(sale: Omit<CounterSaleRecord, 'number'>) {
      return { ...sale, number: 'CS-000001' } as CounterSaleRecord;
    },
    async update() {},
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
    async createReceipt(receipt: unknown) {
      receipts.push(receipt);
      return receipt;
    },
    async findReceipt() {
      return null;
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
  const service = new CounterSalesService({
    repository: repository as never,
    closeTransaction: async (_input, execute) => execute()
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'service', nameSnapshot: 'Consulta', unitPrice: 100 });
  await service.addPayment(sale.id, { method: 'pix', amount: 100 });

  const closed = await service.close(sale.id, USER_ID);
  const receipt = (
    closed as unknown as {
      receipt?: {
        counterSaleId: string;
        amount: number;
        currency: string;
      };
    }
  ).receipt;

  assert.ok(receipt);
  assert.equal(receipt.counterSaleId, sale.id);
  assert.equal(receipt.amount, 100);
  assert.equal(receipt.currency, 'BRL');
  assert.equal(receipts.length, 1);
});

test('CounterSalesService invokes close effects before returning the closed sale', async () => {
  const callbacks: Array<{ saleId: string; total: number; paymentCount: number }> = [];
  const service = new CounterSalesService({
    onClose: async (input, result) => {
      callbacks.push({
        saleId: input.sale.id,
        total: result.sale.total,
        paymentCount: input.payments.length
      });
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'service', nameSnapshot: 'Consulta', unitPrice: 120 });
  await service.addPayment(sale.id, { method: 'pix', amount: 120 });

  await service.close(sale.id, USER_ID);

  assert.deepEqual(callbacks, [{ saleId: sale.id, total: 120, paymentCount: 1 }]);
});

test('CounterSalesService cancel works on open sale', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  const cancelled = await service.cancel(sale.id, {
    accountId: ACCOUNT_ID,
    cancelledByUserId: USER_ID,
    reason: 'Teste de cancelamento',
    correlationId: 'counter-sale-test-cancel'
  });
  assert.equal(cancelled.status, 'cancelled');
});

test('CounterSalesService cancel rejects closed sale', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 10 });
  await service.addPayment(sale.id, { method: 'cash', amount: 10 });
  await service.close(sale.id, USER_ID);
  await assert.rejects(
    () =>
      service.cancel(sale.id, {
        accountId: ACCOUNT_ID,
        cancelledByUserId: USER_ID,
        reason: 'Teste de cancelamento fechado',
        correlationId: 'counter-sale-test-cancel-closed'
      }),
    ConflictError
  );
});

test('CounterSalesService does not reopen a sale after its immutable receipt exists', async () => {
  const service = createService();
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'product', nameSnapshot: 'Item', unitPrice: 10 });
  await service.addPayment(sale.id, { method: 'cash', amount: 10 });
  await service.close(sale.id, USER_ID);
  await assert.rejects(() => service.reopen(sale.id), ConflictError);
});

test('CounterSalesService list filters by status', async () => {
  const service = createService();
  const s1 = await service.open(ACCOUNT_ID, USER_ID);
  const s2 = await service.open(ACCOUNT_ID, USER_ID);
  await service.cancel(s2.id, {
    accountId: ACCOUNT_ID,
    cancelledByUserId: USER_ID,
    reason: 'Filtro de status',
    correlationId: 'counter-sale-test-cancel-filter'
  });
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

test('CounterSalesService lists report sales from the fresh persisted repository source', async () => {
  const persistedSale = {
    id: 'sale-persisted-1',
    accountId: ACCOUNT_ID,
    number: 'CS-000901',
    ownerId: 'owner-1',
    patientId: null,
    encounterId: null,
    queueEntryId: null,
    billingRecordId: null,
    status: 'cancelled' as const,
    subtotal: 250,
    discountAmount: 25,
    total: 225,
    paidAmount: 0,
    balanceDue: 225,
    notes: 'Cancelada',
    openedByUserId: USER_ID,
    closedByUserId: null,
    closedAt: null,
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T10:30:00.000Z'
  } satisfies CounterSaleRecord;
  const outsidePeriodSale = {
    ...persistedSale,
    id: 'sale-persisted-2',
    number: 'CS-000902',
    createdAt: '2026-06-10T10:00:00.000Z'
  } satisfies CounterSaleRecord;
  const calls: Array<{ accountId: AccountId; filters: Record<string, string | number> }> = [];
  const service = new CounterSalesService({
    repository: {
      async findByAccountId(
        accountId: AccountId,
        filters?: {
          status?: string;
          search?: string;
          ownerId?: string;
          dateFrom?: string;
          dateTo?: string;
          limit?: number;
        }
      ) {
        calls.push({ accountId, filters: (filters ?? {}) as Record<string, string | number> });
        return [persistedSale, outsidePeriodSale];
      }
    } as never
  });

  const result = await service.listPersisted(ACCOUNT_ID, {
    status: 'cancelled',
    search: 'CS-000901',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(result, [persistedSale]);
  assert.deepEqual(calls, [
    {
      accountId: ACCOUNT_ID,
      filters: {
        status: 'cancelled',
        search: 'CS-000901',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        limit: 10_001
      }
    }
  ]);
});

test('CounterSalesService lists persisted check-payment report facts by account', async () => {
  const service = createService();
  const accountB = 'acc_test_002' as AccountId;
  const saleA = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(saleA.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 110
  });
  await service.addPayment(saleA.id, {
    method: 'check',
    amount: 100,
    reference: 'CHK-A',
    notes: 'Texto que não deve virar vencimento'
  });
  await service.addPayment(saleA.id, { method: 'credit_card', amount: 10, reference: 'CARD-A' });

  const saleB = await service.open(accountB, USER_ID);
  await service.addItem(saleB.id, { itemType: 'service', nameSnapshot: 'Consulta', unitPrice: 80 });
  await service.addPayment(saleB.id, { method: 'check', amount: 80, reference: 'CHK-B' });

  const rows = await service.listChequePayments(ACCOUNT_ID);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    id: rows[0]?.id,
    accountId: ACCOUNT_ID,
    counterSaleId: saleA.id,
    saleNumber: saleA.number,
    saleStatus: 'open',
    method: 'check',
    amount: 100,
    installments: 1,
    reference: 'CHK-A',
    notes: 'Texto que não deve virar vencimento',
    createdAt: rows[0]?.createdAt
  });
});

test('CounterSalesService includes the final millisecond of a cheque payment date range', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-31T23:59:59.999Z'));
  try {
    const service = createService();
    const sale = await service.open(ACCOUNT_ID, USER_ID);
    await service.addItem(sale.id, {
      itemType: 'service',
      nameSnapshot: 'Consulta',
      unitPrice: 25
    });
    await service.addPayment(sale.id, { method: 'check', amount: 25, reference: 'CHK-END' });

    const rows = await service.listChequePayments(ACCOUNT_ID, {
      dateFrom: '2026-05-31',
      dateTo: '2026-05-31'
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.reference, 'CHK-END');
  } finally {
    vi.useRealTimers();
  }
});

test('CounterSalesService rejects an oversized cheque report before snapshotting it', async () => {
  const rows = Array.from({ length: 10_001 }, (_, index) => ({
    id: `payment-${index}`,
    accountId: ACCOUNT_ID,
    counterSaleId: `sale-${index}`,
    saleNumber: `CS-${index}`,
    saleStatus: 'open' as const,
    method: 'check' as const,
    amount: 1,
    installments: 1,
    reference: `CHK-${index}`,
    notes: null,
    createdAt: '2026-05-01T00:00:00.000Z'
  }));
  const service = new CounterSalesService({
    repository: {
      listChequePayments: async () => rows
    } as never
  });

  await assert.rejects(() => service.listChequePayments(ACCOUNT_ID), /maximum supported row count/);
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
  await service.cancel(sale.id, {
    accountId: ACCOUNT_ID,
    cancelledByUserId: USER_ID,
    reason: 'Teste de venda cancelada',
    correlationId: 'counter-sale-test-cancel-open'
  });
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

test('CounterSalesService delegates close effects to one transaction boundary and keeps sale open on rollback', async () => {
  let transactionCalls = 0;
  const service = new CounterSalesService({
    closeTransaction: async (_input, _execute) => {
      transactionCalls += 1;
      throw new Error('injected transaction failure');
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, { itemType: 'service', nameSnapshot: 'Consulta', unitPrice: 100 });
  await service.addPayment(sale.id, { method: 'pix', amount: 100 });

  await assert.rejects(() => service.close(sale.id, USER_ID), /injected transaction failure/);
  assert.equal(transactionCalls, 1);
  assert.equal(service.findById(sale.id)?.status, 'open');
});

test('CounterSalesService closes a sale only once under concurrent requests', async () => {
  let inventoryCalls = 0;
  let releaseInventory!: () => void;
  const inventoryReleased = new Promise<void>((resolve) => {
    releaseInventory = resolve;
  });
  const service = new CounterSalesService({
    inventoryService: {
      async consumeForSale() {
        inventoryCalls += 1;
        await inventoryReleased;
        return {
          id: 'cons-concurrent',
          inventoryItemId: 'inv-1',
          quantity: 1,
          unit: 'un',
          costAmount: 0
        };
      }
    }
  });
  const sale = await service.open(ACCOUNT_ID, USER_ID);
  await service.addItem(sale.id, {
    itemType: 'product',
    nameSnapshot: 'Item',
    codeSnapshot: 'SKU-001',
    unitPrice: 100,
    quantity: 1
  });
  await service.addPayment(sale.id, { method: 'pix', amount: 100 });

  const first = service.close(sale.id, USER_ID);
  const second = service.close(sale.id, USER_ID);
  await new Promise<void>((resolve) => setImmediate(resolve));
  releaseInventory();
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(firstResult.sale.status, 'closed');
  assert.equal(secondResult.sale.status, 'closed');
  assert.equal(inventoryCalls, 1);
});
