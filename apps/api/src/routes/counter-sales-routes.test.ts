import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import {
  AuthenticationError,
  ConflictError,
  ValidationError
} from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleCounterSalesRoutes } from './counter-sales-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(
    chunk?: string | Buffer | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;

    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    finalCallback?.();
    return this;
  }

  setHeader(): this {
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc-1' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['counter_sale.read', 'counter_sale.write'],
      capabilities: []
    }
  };
}

function createPrincipalFor(accountId: string, userId: string): AuthenticatedPrincipal {
  const principal = createPrincipal();
  return {
    ...principal,
    user: { ...principal.user, id: userId as never, accountId: accountId as never },
    session: { ...principal.session, userId: userId as never, accountId: accountId as never }
  };
}

function createAudit() {
  return {
    write: () => {}
  };
}

test('handleCounterSalesRoutes ignores unrelated routes', async () => {
  const response = new MockResponse();
  const handled = await handleCounterSalesRoutes(
    '/owners',
    { method: 'GET' } as never,
    response as never,
    'corr-cs-0',
    {
      counterSales: new CounterSalesService(),
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, false);
});

test('handleCounterSalesRoutes opens and lists counter sales', async () => {
  const counterSales = new CounterSalesService();

  const createResponse = new MockResponse();
  const created = await handleCounterSalesRoutes(
    '/counter-sales',
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            ownerId: 'owner-1',
            patientId: 'patient-1',
            encounterId: 'encounter-1',
            queueEntryId: 'queue-1',
            billingRecordId: 'billing-1',
            notes: 'Fluxo balcão'
          })
        );
      }
    } as never,
    createResponse as never,
    'corr-cs-1',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(created, true);
  assert.equal(createResponse.statusCode, 201);
  const sale = createResponse.bodyJson<{
    id: string;
    ownerId: string;
    patientId: string;
    encounterId: string;
    queueEntryId: string;
    billingRecordId: string;
    notes: string;
  }>();
  assert.equal(sale.ownerId, 'owner-1');
  assert.equal(sale.patientId, 'patient-1');
  assert.equal(sale.encounterId, 'encounter-1');
  assert.equal(sale.queueEntryId, 'queue-1');
  assert.equal(sale.billingRecordId, 'billing-1');
  assert.equal(sale.notes, 'Fluxo balcão');

  const listResponse = new MockResponse();
  const listed = await handleCounterSalesRoutes(
    '/counter-sales',
    {
      method: 'GET',
      url: '/counter-sales?status=open&ownerId=owner-1&dateFrom=2026-01-01&dateTo=2026-12-31'
    } as never,
    listResponse as never,
    'corr-cs-2',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(listed, true);
  assert.equal(listResponse.statusCode, 200);
  const payload = listResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0]?.id, sale.id);
});

test('handleCounterSalesRoutes exposes the commercial dashboard', async () => {
  const counterSales = new CounterSalesService();
  const sale = await counterSales.open('acc-1' as never, 'user-1' as never, {
    ownerId: 'owner-1'
  });
  await counterSales.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta premium',
    unitPrice: 220,
    quantity: 1
  });
  await counterSales.addPayment(sale.id, {
    method: 'pix',
    amount: 220,
    installments: 1
  });
  await counterSales.close(sale.id, 'user-1' as never);

  const response = new MockResponse();
  const handled = await handleCounterSalesRoutes(
    '/admin/commercial-dashboard',
    {
      method: 'GET',
      url: '/admin/commercial-dashboard?dateFrom=2026-04-01&dateTo=2026-04-30'
    } as never,
    response as never,
    'corr-cs-dashboard',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    closedToday: number;
    salesByPaymentMethod: Array<{ method: string; total: number }>;
    topServices: Array<{ name: string; revenue: number }>;
  }>();
  assert.equal(payload.closedToday, 1);
  assert.equal(payload.salesByPaymentMethod[0]?.method, 'pix');
  assert.equal(payload.topServices[0]?.name, 'Consulta premium');
});

test('handleCounterSalesRoutes returns detail with items and payments and allows close flow', async () => {
  const counterSales = new CounterSalesService();
  const sale = await counterSales.open('acc-1' as never, 'user-1' as never, {
    ownerId: 'owner-1'
  });
  const addedItem = await counterSales.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta de retorno',
    unitPrice: 120,
    quantity: 1
  });

  const itemResponse = new MockResponse();
  const itemHandled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/items`,
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            itemType: 'product',
            nameSnapshot: 'Antibiótico',
            codeSnapshot: 'SKU-1',
            unitPrice: 30,
            quantity: 2
          })
        );
      }
    } as never,
    itemResponse as never,
    'corr-cs-3',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(itemHandled, true);
  assert.equal(itemResponse.statusCode, 201);

  const detailResponse = new MockResponse();
  const detailHandled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}`,
    { method: 'GET', url: `/counter-sales/${sale.id}` } as never,
    detailResponse as never,
    'corr-cs-5',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(detailHandled, true);
  assert.equal(detailResponse.statusCode, 200);
  const detail = detailResponse.bodyJson<{
    id: string;
    items: Array<{ id: string }>;
    payments: Array<{ reference: string | null }>;
  }>();
  assert.equal(detail.id, sale.id);
  assert.equal(detail.items.length, 2);
  assert.equal(detail.payments.length, 0);

  const updateResponse = new MockResponse();
  const updated = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/items/${addedItem.item.id}`,
    {
      method: 'PATCH',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ quantity: 1, discountAmount: 10 }));
      }
    } as never,
    updateResponse as never,
    'corr-cs-6',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(updated, true);
  assert.equal(updateResponse.statusCode, 200);
  const updatedItem = updateResponse.bodyJson<{ quantity: number; discountAmount: number }>();
  assert.equal(updatedItem.quantity, 1);
  assert.equal(updatedItem.discountAmount, 10);

  const paymentResponse = new MockResponse();
  const paymentHandled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/payments`,
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            method: 'pix',
            amount: 170,
            installments: 1,
            reference: 'PIX-001'
          })
        );
      }
    } as never,
    paymentResponse as never,
    'corr-cs-4',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(paymentHandled, true);
  assert.equal(paymentResponse.statusCode, 201);

  const closeResponse = new MockResponse();
  const closed = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/close`,
    { method: 'POST', url: `/counter-sales/${sale.id}/close` } as never,
    closeResponse as never,
    'corr-cs-7',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(closed, true);
  assert.equal(closeResponse.statusCode, 200);
  const closedSale = closeResponse.bodyJson<{
    status: string;
    receipt: { counterSaleId: string; amount: number; currency: string };
  }>();
  assert.equal(closedSale.status, 'closed');
  assert.equal(closedSale.receipt.counterSaleId, sale.id);
  assert.equal(closedSale.receipt.amount, 170);
  assert.equal(closedSale.receipt.currency, 'BRL');
});

test('handleCounterSalesRoutes blocks invalid financial edits after payments and closure', async () => {
  const counterSales = new CounterSalesService();
  const sale = await counterSales.open('acc-1' as never, 'user-1' as never, {
    ownerId: 'owner-1'
  });
  const serviceItem = await counterSales.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta clínica',
    unitPrice: 100,
    quantity: 1
  });

  const productResponse = new MockResponse();
  const productHandled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/items`,
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            itemType: 'product',
            nameSnapshot: 'Antipulgas',
            codeSnapshot: 'SKU-ANT',
            unitPrice: 50,
            quantity: 1
          })
        );
      }
    } as never,
    productResponse as never,
    'corr-cs-block-1',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.equal(productHandled, true);
  assert.equal(productResponse.statusCode, 201);

  const partialPaymentResponse = new MockResponse();
  const partialPaymentHandled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/payments`,
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            method: 'pix',
            amount: 100,
            installments: 1,
            reference: 'PIX-PARCIAL'
          })
        );
      }
    } as never,
    partialPaymentResponse as never,
    'corr-cs-block-2',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.equal(partialPaymentHandled, true);
  assert.equal(partialPaymentResponse.statusCode, 201);

  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/items/${serviceItem.item.id}`,
        {
          method: 'PATCH',
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(JSON.stringify({ discountAmount: 100 }));
          }
        } as never,
        new MockResponse() as never,
        'corr-cs-block-3',
        {
          counterSales,
          audit: createAudit() as never,
          requirePrincipal: () => createPrincipal()
        }
      ),
    ConflictError
  );

  const detailAfterRejectedEdit = counterSales.getOrThrow(sale.id);
  assert.equal(detailAfterRejectedEdit.total, 150);
  assert.equal(detailAfterRejectedEdit.paidAmount, 100);
  assert.equal(detailAfterRejectedEdit.balanceDue, 50);

  const finalPaymentResponse = new MockResponse();
  const finalPaymentHandled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/payments`,
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            method: 'cash',
            amount: 50,
            installments: 1,
            reference: 'CX-FINAL'
          })
        );
      }
    } as never,
    finalPaymentResponse as never,
    'corr-cs-block-4',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.equal(finalPaymentHandled, true);
  assert.equal(finalPaymentResponse.statusCode, 201);

  const closeResponse = new MockResponse();
  const closeHandled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/close`,
    { method: 'POST', url: `/counter-sales/${sale.id}/close` } as never,
    closeResponse as never,
    'corr-cs-block-5',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.equal(closeHandled, true);
  assert.equal(closeResponse.statusCode, 200);

  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/items`,
        {
          method: 'POST',
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(
              JSON.stringify({
                itemType: 'service',
                nameSnapshot: 'Taxa pós-fechamento',
                unitPrice: 10
              })
            );
          }
        } as never,
        new MockResponse() as never,
        'corr-cs-block-6',
        {
          counterSales,
          audit: createAudit() as never,
          requirePrincipal: () => createPrincipal()
        }
      ),
    ConflictError
  );

  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/payments`,
        {
          method: 'POST',
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(
              JSON.stringify({
                method: 'pix',
                amount: 1
              })
            );
          }
        } as never,
        new MockResponse() as never,
        'corr-cs-block-7',
        {
          counterSales,
          audit: createAudit() as never,
          requirePrincipal: () => createPrincipal()
        }
      ),
    ConflictError
  );
});

test('handleCounterSalesRoutes settles the final payment and closes atomically', async () => {
  const counterSales = new CounterSalesService();
  const sale = await counterSales.open('acc-1' as never, 'user-1' as never);
  await counterSales.addItem(sale.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta de retorno',
    unitPrice: 100
  });

  let commandCalls = 0;
  const response = new MockResponse();
  const handled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/settle`,
    {
      method: 'POST',
      headers: { 'idempotency-key': 'settle-cs-1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            payments: [{ method: 'pix', amount: 100, reference: 'PIX-SETTLE' }]
          })
        );
      }
    } as never,
    response as never,
    'corr-cs-settle-1',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: async (input) => {
        commandCalls += 1;
        return input.command();
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(commandCalls, 1);
  const payload = response.bodyJson<{
    status: string;
    paidAmount: number;
    receipt: { counterSaleId: string; amount: number };
  }>();
  assert.equal(payload.status, 'closed');
  assert.equal(payload.paidAmount, 100);
  assert.equal(payload.receipt.counterSaleId, sale.id);
  assert.equal(payload.receipt.amount, 100);
});

test('handleCounterSalesRoutes rejects malformed settlement payments at the boundary', async () => {
  const counterSales = new CounterSalesService();
  const sale = await counterSales.open('acc-1' as never, 'user-1' as never);

  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/settle`,
        {
          method: 'POST',
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(JSON.stringify({ payments: [{ method: 'bitcoin', amount: 1 }] }));
          }
        } as never,
        new MockResponse() as never,
        'corr-cs-settle-invalid',
        {
          counterSales,
          audit: createAudit() as never,
          requirePrincipal: () => createPrincipal()
        }
      ),
    ValidationError
  );
});

test('handleCounterSalesRoutes forwards the payment idempotency key and validates the payload', async () => {
  const sale = {
    id: 'sale-payment-key',
    accountId: 'acc-1',
    number: 'CS-KEY-001'
  };
  let receivedPayload: Record<string, unknown> | undefined;
  const counterSales = {
    getOrThrow: () => sale,
    addPayment: async (_saleId: string, payload: Record<string, unknown>) => {
      receivedPayload = payload;
      return {
        sale: { ...sale, status: 'open' },
        payment: { id: 'payment-key-1', ...payload }
      };
    }
  } as never;

  const response = new MockResponse();
  const handled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/payments`,
    {
      method: 'POST',
      headers: { 'idempotency-key': 'payment-retry-001' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ method: 'pix', amount: 25 }));
      }
    } as never,
    response as never,
    'corr-cs-payment-key',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.equal(receivedPayload?.idempotencyKey, 'payment-retry-001');

  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/payments`,
        {
          method: 'POST',
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(JSON.stringify({ method: 'pix', amount: 25, unexpected: true }));
          }
        } as never,
        new MockResponse() as never,
        'corr-cs-payment-invalid',
        {
          counterSales,
          audit: createAudit() as never,
          requirePrincipal: () => createPrincipal()
        }
      ),
    ValidationError
  );
});

test('handleCounterSalesRoutes rejects an item whose parent sale or account differs from the URL', async () => {
  const counterSales = new CounterSalesService();
  const saleA = await counterSales.open('acc-1' as never, 'user-1' as never);
  const saleB = await counterSales.open('acc-1' as never, 'user-1' as never);
  const saleOtherAccount = await counterSales.open('acc-2' as never, 'user-2' as never);
  const { item } = await counterSales.addItem(saleA.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 100
  });

  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${saleB.id}/items/${item.id}`,
        {
          method: 'PATCH',
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(JSON.stringify({ quantity: 2 }));
          }
        } as never,
        new MockResponse() as never,
        'corr-cs-item-parent-mismatch',
        {
          counterSales,
          audit: createAudit() as never,
          requirePrincipal: () => createPrincipal()
        }
      ),
    AuthenticationError
  );

  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${saleOtherAccount.id}/items/${item.id}`,
        {
          method: 'DELETE'
        } as never,
        new MockResponse() as never,
        'corr-cs-item-account-mismatch',
        {
          counterSales,
          audit: createAudit() as never,
          requirePrincipal: () => createPrincipalFor('acc-2', 'user-2')
        }
      ),
    AuthenticationError
  );

  assert.equal(counterSales.getItems(saleA.id)[0]?.quantity, 1);
});

test('handleCounterSalesRoutes binds add_item idempotency payload to the account and parent sale', async () => {
  const counterSales = new CounterSalesService();
  const sale = await counterSales.open('acc-1' as never, 'user-1' as never);
  let commandPayload: unknown;

  const handled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/items`,
    {
      method: 'POST',
      headers: { 'idempotency-key': 'add-item-retry-001' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            itemType: 'service',
            nameSnapshot: 'Consulta',
            unitPrice: 100
          })
        );
      }
    } as never,
    new MockResponse() as never,
    'corr-cs-add-item-idempotency',
    {
      counterSales,
      audit: createAudit() as never,
      requirePrincipal: () => createPrincipal(),
      runCommand: async (input) => {
        commandPayload = input.payload;
        return input.command();
      }
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(commandPayload, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 100,
    saleId: sale.id,
    accountId: 'acc-1'
  });
});
