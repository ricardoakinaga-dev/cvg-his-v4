import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import {
  EncounterFinancialService,
  FinancialIncomeStatementService,
  FinancialPayablesService,
  FinancialLedgerService,
  InMemoryFinancialLedgerRepository,
  InMemoryEncounterFinancialRepository,
  InMemoryFinancialPayablesRepository
} from '@cvg-his-v2/module-financial';

import { handleFinancialRoutes } from './financial-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  setHeader(): this {
    return this;
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback = typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function request(method: string, url: string, body?: unknown): never {
  return {
    method,
    url,
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-finance-1' as never,
      accountId: 'acc-finance-1' as never,
      username: 'finance',
      email: 'finance@example.com',
      displayName: 'Finance',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-finance-1' as never,
      userId: 'user-finance-1' as never,
      accountId: 'acc-finance-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['finance'],
      permissionCodes: ['billing.read', 'billing.manage'],
      capabilities: []
    }
  };
}

function handlers() {
  const billing = {} as never;
  const receivables = new InMemoryEncounterFinancialRepository();
  const payables = new InMemoryFinancialPayablesRepository();
  const ledger = new FinancialLedgerService(new InMemoryFinancialLedgerRepository());
  return {
    encounterFinancial: new EncounterFinancialService({ getOrThrow() { throw new Error('unused'); } } as never, billing, {} as never, {} as never, {
      repository: receivables
    }),
    financialPayables: new FinancialPayablesService(payables),
    ledger,
    financialStatements: new FinancialIncomeStatementService({ receivables, payables }),
    billing,
    audit: { write() {} } as never,
    pixTransactions: { list: async () => [] } as never,
    cardTransactions: { list: async () => [] } as never,
    requirePrincipal: () => principal()
  };
}

test('handleFinancialRoutes exposes the canonical ledger and reconciliation result', async () => {
  const routeHandlers = handlers();
  await routeHandlers.ledger!.postEntry({
    accountId: 'acc-finance-1' as never,
    sourceType: 'test',
    sourceId: 'ledger-1',
    description: 'Teste de reconciliacao',
    occurredAt: '2026-05-01T10:00:00.000Z',
    lines: [
      { accountCode: '1.1.01-caixa', debit: 100, credit: 0 },
      { accountCode: '3.1.01-receita', debit: 0, credit: 100 }
    ]
  });

  const listResponse = new MockResponse();
  await handleFinancialRoutes(
    '/financial/ledger',
    request('GET', '/financial/ledger?dateFrom=2026-05-01T00:00:00.000Z'),
    listResponse as never,
    'corr-ledger-1',
    routeHandlers
  );
  const listed = listResponse.bodyJson<{ items: Array<{ sourceId: string }> }>();
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0]?.sourceId, 'ledger-1');

  const reconciliationResponse = new MockResponse();
  await handleFinancialRoutes(
    '/financial/ledger/reconciliation',
    request('GET', '/financial/ledger/reconciliation'),
    reconciliationResponse as never,
    'corr-ledger-2',
    routeHandlers
  );
  const reconciliation = reconciliationResponse.bodyJson<{
    balanced: boolean;
    totalDebit: number;
    totalCredit: number;
    entryCount: number;
  }>();
  assert.deepEqual(reconciliation, {
    balanced: true,
    totalDebit: 100,
    totalCredit: 100,
    entryCount: 1,
    lineCount: 2,
    accountId: 'acc-finance-1',
    dateFrom: null,
    dateTo: null,
    unbalancedEntryIds: []
  });
});

test('handleFinancialRoutes creates, lists and pays accounts payable records', async () => {
  const routeHandlers = handlers();

  const createResponse = new MockResponse();
  await handleFinancialRoutes(
    '/financial/payables',
    request('POST', '/financial/payables', {
      supplierName: 'Fornecedor de medicamentos',
      description: 'NF 123',
      category: 'Compras',
      costCenterCode: 'EST',
      costCenterName: 'Estoque',
      issuedAt: '2026-05-01',
      dueAt: '2026-05-20',
      totalAmount: 600
    }),
    createResponse as never,
    'corr-payable-1',
    routeHandlers
  );

  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; status: string; outstandingAmount: number }>();
  assert.equal(created.status, 'open');
  assert.equal(created.outstandingAmount, 600);

  const listResponse = new MockResponse();
  await handleFinancialRoutes(
    '/financial/payables',
    request('GET', '/financial/payables?search=medicamentos'),
    listResponse as never,
    'corr-payable-2',
    routeHandlers
  );
  const list = listResponse.bodyJson<{ data: Array<{ id: string }>; totalOutstanding: number }>();
  assert.equal(list.data.length, 1);
  assert.equal(list.totalOutstanding, 600);

  const payResponse = new MockResponse();
  await handleFinancialRoutes(
    `/financial/payables/${created.id}/pay`,
    request('POST', `/financial/payables/${created.id}/pay`, {
      amountPaid: 600,
      paymentMethod: 'cash',
      paymentReference: 'gaveta-principal',
      notes: 'Quitado'
    }),
    payResponse as never,
    'corr-payable-3',
    routeHandlers
  );
  const paid = payResponse.bodyJson<{
    status: string;
    paidAmount: number;
    outstandingAmount: number;
    paymentMethod: string;
    paymentReference: string;
  }>();
  assert.equal(paid.status, 'paid');
  assert.equal(paid.paidAmount, 600);
  assert.equal(paid.outstandingAmount, 0);
  assert.equal(paid.paymentMethod, 'cash');
  assert.equal(paid.paymentReference, 'gaveta-principal');
});

test('handleFinancialRoutes returns income statement from payables ledger', async () => {
  const routeHandlers = handlers();

  await handleFinancialRoutes(
    '/financial/payables',
    request('POST', '/financial/payables', {
      supplierName: 'Fornecedor de medicamentos',
      description: 'NF 124',
      category: 'Compras',
      costCenterCode: 'EST',
      costCenterName: 'Estoque',
      issuedAt: '2026-05-01',
      dueAt: '2026-05-20',
      totalAmount: 600
    }),
    new MockResponse() as never,
    'corr-payable-4',
    routeHandlers
  );

  const response = new MockResponse();
  await handleFinancialRoutes(
    '/financial/income-statement',
    request('GET', '/financial/income-statement?dateFrom=2026-05-01&dateTo=2026-05-31'),
    response as never,
    'corr-statement-1',
    routeHandlers
  );

  assert.equal(response.statusCode, 200);
  const statement = response.bodyJson<{
    period: { dateFrom: string; dateTo: string };
    expenses: { accruedExpenses: number; outstandingPayables: number };
    result: { accrualNetResult: number };
  }>();
  assert.equal(statement.period.dateFrom, '2026-05-01');
  assert.equal(statement.period.dateTo, '2026-05-31');
  assert.equal(statement.expenses.accruedExpenses, 600);
  assert.equal(statement.expenses.outstandingPayables, 600);
  assert.equal(statement.result.accrualNetResult, -600);
});

test('handleFinancialRoutes lists and reconciles non-cash payable payments', async () => {
  const routeHandlers = handlers();

  const createResponse = new MockResponse();
  await handleFinancialRoutes(
    '/financial/payables',
    request('POST', '/financial/payables', {
      supplierName: 'Fornecedor banco',
      description: 'NF banco',
      category: 'Servicos',
      costCenterCode: 'ADM',
      costCenterName: 'Administrativo',
      issuedAt: '2026-05-01',
      dueAt: '2026-05-20',
      totalAmount: 500
    }),
    createResponse as never,
    'corr-payable-5',
    routeHandlers
  );
  const created = createResponse.bodyJson<{ id: string }>();

  await handleFinancialRoutes(
    `/financial/payables/${created.id}/pay`,
    request('POST', `/financial/payables/${created.id}/pay`, {
      amountPaid: 500,
      paymentMethod: 'bank_transfer',
      paymentReference: 'extrato-500'
    }),
    new MockResponse() as never,
    'corr-payable-6',
    routeHandlers
  );

  const listResponse = new MockResponse();
  await handleFinancialRoutes(
    '/financial/reconciliation/payables',
    request('GET', '/financial/reconciliation/payables?status=pending'),
    listResponse as never,
    'corr-payable-7',
    routeHandlers
  );
  const pending = listResponse.bodyJson<{ total: number; pendingAmount: number; data: Array<{ id: string }> }>();
  assert.equal(pending.total, 1);
  assert.equal(pending.pendingAmount, 500);
  assert.equal(pending.data[0]?.id, created.id);

  const reconcileResponse = new MockResponse();
  await handleFinancialRoutes(
    `/financial/payables/${created.id}/reconcile`,
    request('POST', `/financial/payables/${created.id}/reconcile`, {
      reconciliationReference: 'OFX-500',
      notes: 'Conferido no banco'
    }),
    reconcileResponse as never,
    'corr-payable-8',
    routeHandlers
  );
  const reconciled = reconcileResponse.bodyJson<{
    reconciliationStatus: string;
    reconciliationReference: string;
  }>();
  assert.equal(reconciled.reconciliationStatus, 'reconciled');
  assert.equal(reconciled.reconciliationReference, 'OFX-500');
});
