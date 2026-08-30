import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import { ForbiddenError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { CommissionsService } from '@cvg-his-v2/module-commissions';
import { FinancialPayablesService } from '@cvg-his-v2/module-financial';
import { FiscalService } from '@cvg-his-v2/module-fiscal';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { ReportsService } from '@cvg-his-v2/module-reports';
import { ServicesService } from '@cvg-his-v2/module-services';

import { handleReportsRoutes } from './reports-routes.js';

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

  setHeader(): this {
    return this;
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

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function request(method: string, body?: unknown, url?: string): never {
  return {
    method,
    url: url ?? '/reports/catalog',
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-reports-1' as never,
      accountId: 'acc-reports-1' as never,
      username: 'reports',
      email: 'reports@example.com',
      displayName: 'Reports',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-reports-1' as never,
      userId: 'user-reports-1' as never,
      accountId: 'acc-reports-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['billing.read', 'staff.read'],
      capabilities: []
    }
  };
}

function handlers(
  reports = new ReportsService({
    deliveryProvider: {
      async deliver() {}
    }
  }),
  commissions = new CommissionsService(),
  audit: { write: (event: unknown) => unknown } = { write() {} },
  financialPayables = new FinancialPayablesService(),
  encounterFinancial = {
    async listReceivables() {
      return {
        data: [],
        page: 1,
        pageSize: 100,
        total: 0,
        openCount: 0,
        settledCount: 0,
        totalOutstanding: 0,
        totalSettled: 0
      };
    }
  } as never,
  services = new ServicesService(),
  fiscal = new FiscalService()
) {
  const owners = new OwnersService({ seedOwners: [] });
  const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });

  return {
    reports,
    billing: {
      listAuthoritative: async () => [
        {
          accountId: 'acc-reports-1',
          subtotalAmount: 300
        }
      ]
    } as never,
    cash: {
      async findOpenRegister() {
        return { id: 'cash-1' };
      },
      async getCurrentBalance() {
        return 150;
      }
    } as never,
    commissions,
    encounterFinancial,
    financialPayables,
    counterSales: {
      async getCommercialDashboard() {
        return {
          netRevenueToday: 450,
          closedToday: 2
        };
      }
    } as never,
    inventory: {
      persistenceMode: 'in-memory'
    } as never,
    quotes: {
      list: () => [
        { status: 'approved', total: 120 },
        { status: 'draft', total: 80 }
      ]
    } as never,
    owners,
    patients,
    services,
    fiscal,
    audit: audit as never,
    requirePrincipal: () => principal()
  };
}

function persistedReports(): ReportsService {
  return new ReportsService({
    repository: {
      async saveExecution() {},
      async saveExport() {},
      async saveSchedule() {},
      async saveDelivery() {},
      async findExecutions() {
        return [];
      },
      async findExports() {
        return [];
      },
      async findSchedules() {
        return [];
      },
      async findDeliveries() {
        return [];
      }
    }
  });
}

test('handleReportsRoutes waits for durable report export audit before returning', async () => {
  const reports = new ReportsService();
  const execution = await reports.execute('acc-reports-1' as never, 'user-reports-1' as never, {
    reportId: 'inventory-stock',
    filters: {},
    rows: []
  });
  let auditStarted = false;
  let releaseAudit!: () => void;
  const auditComplete = new Promise<void>((resolve) => {
    releaseAudit = resolve;
  });
  const audit = {
    write() {},
    async writeAndWait() {
      auditStarted = true;
      await auditComplete;
    }
  };
  const response = new MockResponse();
  let routeSettled = false;
  const routePromise = handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    response as never,
    'corr-report-export-audit-wait',
    { ...handlers(reports), audit } as never
  );
  routePromise.then(() => {
    routeSettled = true;
  });

  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(auditStarted, true);
  assert.equal(routeSettled, false);

  releaseAudit();
  await routePromise;
  assert.equal(response.statusCode, 200);
});

test('handleReportsRoutes executes and exports the persisted NFS-e service-invoice report', async () => {
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const fiscal = {
    forAccount(accountId: string) {
      return {
        persistenceMode: 'database',
        async listNfseDocuments(filters: Record<string, unknown>) {
          sourceCalls.push({ accountId, filters });
          return [
            {
              id: 'nfse-report-1',
              serie: '001',
              numero: 42,
              competencia: '2026-05-15',
              status: 'issued',
              provider: 'abrasf',
              customer: {
                type: 'cpf',
                document: '11122233344',
                name: 'Cliente NFS-e'
              },
              services: [
                {
                  description: '=HYPERLINK("https://attacker.invalid")',
                  codigoServico: '0407',
                  cnae: '7500-1/00',
                  quantity: 2,
                  unitValue: 100,
                  totalValue: 200,
                  issRate: 0.05,
                  issValue: 10,
                  pisValue: 0,
                  cofinsValue: 0,
                  csllValue: 0
                }
              ],
              subtotal: 200,
              totalIss: 10,
              totalPis: 0,
              totalCofins: 0,
              totalCsll: 0,
              totalIrrf: 0,
              totalInss: 0,
              totalDocument: 210,
              observations: 'Documento persistido',
              createdAt: '2026-05-15T12:00:00.000Z',
              authorizationCode: 'AUTH-42'
            }
          ];
        }
      };
    }
  };
  const permissions: string[] = [];
  const routeHandlers = {
    ...handlers(),
    fiscal,
    requirePrincipal: (_request: never, permissionCode: string) => {
      permissions.push(permissionCode);
      return principal();
    }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'fiscal-service-invoices',
      filters: {
        search: 'NFS-e',
        status: 'issued',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-service-invoices',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    id: string;
    reportId: string;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'fiscal-service-invoices');
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(execution.rows[0], {
    documentId: 'nfse-report-1',
    serie: '001',
    numero: 42,
    competencia: '2026-05-15',
    status: 'issued',
    customerName: 'Cliente NFS-e',
    customerDocument: '11122233344',
    provider: 'abrasf',
    serviceDescriptions: '=HYPERLINK("https://attacker.invalid")',
    serviceCodes: '0407',
    serviceQuantity: 2,
    serviceSubtotal: 200,
    totalIss: 10,
    totalPis: 0,
    totalCofins: 0,
    totalCsll: 0,
    totalIrrf: 0,
    totalInss: 0,
    totalDocument: 210,
    observations: 'Documento persistido',
    createdAt: '2026-05-15T12:00:00.000Z',
    authorizationCode: 'AUTH-42'
  });
  assert.equal(sourceCalls[0]?.accountId, 'acc-reports-1');
  assert.deepEqual(sourceCalls[0]?.filters, {
    status: 'issued',
    search: 'NFS-e',
    competenciaFrom: '2026-05-01',
    competenciaTo: '2026-05-31',
    limit: 10001
  });
  assert.deepEqual(permissions, ['billing.read', 'fiscal.read']);

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-service-invoices-export',
    routeHandlers as never
  );
  const exported = exportResponse.bodyJson<{ content: string }>();
  assert.match(exported.content, /Documento,Série,Número/);
  assert.match(exported.content, /'=HYPERLINK\(""https:\/\/attacker\.invalid""\)/);
});

test('handleReportsRoutes executes the bounded persisted inventory-products report', async () => {
  const reports = new ReportsService();
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const requestedPermissions: string[] = [];
  const persistedItem = {
    id: 'inventory-report-1',
    accountId: 'acc-reports-1',
    sku: 'MED-001',
    name: 'Dipirona',
    unit: 'un',
    onHandQuantity: 4,
    reorderLevel: 5,
    unitCostAmount: 12.5,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T01:00:00.000Z'
  };
  const routeHandlers = {
    ...handlers(reports),
    requirePrincipal: (_request: never, permission: string) => {
      requestedPermissions.push(permission);
      return principal();
    },
    inventory: {
      persistenceMode: 'database',
      async listPersistedItems(accountId: string, filters: Record<string, unknown>) {
        sourceCalls.push({ accountId, filters });
        return [
          persistedItem,
          { ...persistedItem, id: 'foreign', accountId: 'acc-other' },
          { ...persistedItem, id: 'outside-period', createdAt: '2026-06-01T00:00:00.000Z' },
          { ...persistedItem, id: 'search-miss', sku: 'OTHER-001' }
        ];
      }
    }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'inventory-products',
      filters: {
        search: ' MED-001 ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-inventory-products',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    reportId: string;
    filters: Record<string, unknown>;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'inventory-products');
  assert.deepEqual(execution.filters, {
    search: 'MED-001',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(requestedPermissions, ['billing.read', 'inventory.read']);
  assert.deepEqual(execution.rows[0], {
    sku: 'MED-001',
    name: 'Dipirona',
    unit: 'un',
    onHandQuantity: 4,
    reorderLevel: 5,
    unitCostAmount: 12.5,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T01:00:00.000Z'
  });
  assert.deepEqual(sourceCalls, [
    {
      accountId: 'acc-reports-1',
      filters: {
        search: 'MED-001',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        limit: 10_001
      }
    }
  ]);
});

test('handleReportsRoutes executes the persisted inventory purchase-entry report with exact fields', async () => {
  const reports = persistedReports();
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const requestedPermissions: string[] = [];
  const routeHandlers = {
    ...handlers(reports),
    requirePrincipal: (_request: never, permission: string) => {
      requestedPermissions.push(permission);
      return principal();
    },
    procurement: {
      persistenceMode: 'database',
      async listPersistedPurchaseReportRows(accountId: string, filters: Record<string, unknown>) {
        sourceCalls.push({ accountId, filters });
        const row = {
          purchaseId: 'purchase-report-1',
          accountId: 'acc-reports-1',
          invoiceNumber: 'NF-2026-001',
          supplierName: 'Fornecedor Persistente',
          status: 'approved',
          totalAmount: 125,
          receivedAmount: 0,
          payableId: 'payable-1',
          createdByUserId: 'buyer-1',
          approvedByUserId: 'manager-1',
          createdAt: '2026-05-10T10:00:00.000Z',
          updatedAt: '2026-05-10T11:00:00.000Z',
          receivedAt: null
        };
        return [
          row,
          { ...row, purchaseId: 'purchase-foreign', accountId: 'acc-other' },
          { ...row, purchaseId: 'purchase-date-miss', createdAt: '2026-06-01T10:00:00.000Z' },
          { ...row, purchaseId: 'purchase-search-miss', supplierName: 'Outra empresa' }
        ];
      }
    }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'inventory-invoices',
      filters: {
        search: ' Fornecedor ',
        status: 'approved',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-inventory-invoices',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    reportId: string;
    filters: Record<string, unknown>;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'inventory-invoices');
  assert.deepEqual(execution.filters, {
    search: 'Fornecedor',
    status: 'approved',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(requestedPermissions, ['billing.read', 'inventory.read']);
  assert.deepEqual(execution.rows[0], {
    purchaseId: 'purchase-report-1',
    invoiceNumber: 'NF-2026-001',
    supplierName: 'Fornecedor Persistente',
    status: 'approved',
    totalAmount: 125,
    receivedAmount: 0,
    payableId: 'payable-1',
    createdByUserId: 'buyer-1',
    approvedByUserId: 'manager-1',
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T11:00:00.000Z',
    receivedAt: null
  });
  assert.deepEqual(sourceCalls, [
    {
      accountId: 'acc-reports-1',
      filters: {
        search: 'Fornecedor',
        status: 'approved',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        limit: 10_001
      }
    }
  ]);
});

test('handleReportsRoutes fails closed for non-durable inventory purchase reports and enforces source guards', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-invoices' }),
        new MockResponse() as never,
        'corr-inventory-invoices-missing-source',
        handlers() as never
      ),
    /database-backed purchase source/
  );

  const inMemorySourceCalls: string[] = [];
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-invoices' }),
        new MockResponse() as never,
        'corr-inventory-invoices-memory-source',
        {
          ...handlers(),
          procurement: {
            persistenceMode: 'in-memory',
            async listPersistedPurchaseReportRows() {
              inMemorySourceCalls.push('read');
              return [];
            }
          }
        } as never
      ),
    /database-backed purchase source/
  );
  assert.deepEqual(inMemorySourceCalls, []);

  const sourceCalls: string[] = [];
  const databaseProcurement = {
    persistenceMode: 'database',
    async listPersistedPurchaseReportRows() {
      sourceCalls.push('read');
      return [];
    }
  };
  for (const [suffix, filters, message] of [
    [
      'status',
      { status: 'unknown' },
      /status must be draft, approved, partially_received, received or cancelled/
    ],
    ['search', { search: 'x'.repeat(201) }, /search must be a string with at most 200 characters/],
    ['date', { dateFrom: '2026-02-30' }, /dateFrom must be an ISO calendar date/]
  ] as const) {
    await assert.rejects(
      () =>
        handleReportsRoutes(
          '/reports/executions',
          request('POST', { reportId: 'inventory-invoices', filters }),
          new MockResponse() as never,
          `corr-inventory-invoices-invalid-${suffix}`,
          { ...handlers(), procurement: databaseProcurement } as never
        ),
      message
    );
  }
  assert.deepEqual(sourceCalls, []);

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-invoices' }),
        new MockResponse() as never,
        'corr-inventory-invoices-invalid-row',
        {
          ...handlers(persistedReports()),
          procurement: {
            persistenceMode: 'database',
            async listPersistedPurchaseReportRows() {
              return [
                {
                  purchaseId: 'purchase-invalid',
                  accountId: 'acc-reports-1',
                  invoiceNumber: 'NF-INVALID',
                  supplierName: 'Fornecedor',
                  status: 'approved',
                  totalAmount: '125',
                  receivedAmount: 0,
                  payableId: null,
                  createdByUserId: 'buyer-1',
                  approvedByUserId: null,
                  createdAt: '2026-05-10T10:00:00.000Z',
                  updatedAt: '2026-05-10T10:00:00.000Z',
                  receivedAt: null
                }
              ];
            }
          }
        } as never
      ),
    /source returned an invalid row/
  );

  const validPurchase = (index: number) => ({
    purchaseId: `purchase-${index}`,
    accountId: 'acc-reports-1',
    invoiceNumber: `NF-${index}`,
    supplierName: 'Fornecedor',
    status: 'approved',
    totalAmount: 125,
    receivedAmount: 0,
    payableId: null,
    createdByUserId: 'buyer-1',
    approvedByUserId: null,
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T10:00:00.000Z',
    receivedAt: null
  });
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-invoices' }),
        new MockResponse() as never,
        'corr-inventory-invoices-limit',
        {
          ...handlers(persistedReports()),
          procurement: {
            persistenceMode: 'database',
            async listPersistedPurchaseReportRows() {
              return Array.from({ length: 10_001 }, (_, index) => validPurchase(index));
            }
          }
        } as never
      ),
    /Report contains too many rows/
  );
});

test('handleReportsRoutes executes the bounded current persisted inventory-stock report', async () => {
  const reports = new ReportsService();
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const requestedPermissions: string[] = [];
  const persistedItem = {
    id: 'inventory-stock-1',
    accountId: 'acc-reports-1',
    sku: 'MED-001',
    name: 'Dipirona',
    unit: 'un',
    onHandQuantity: 4,
    reorderLevel: 5,
    unitCostAmount: 12.5,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T01:00:00.000Z'
  };
  const routeHandlers = {
    ...handlers(reports),
    requirePrincipal: (_request: never, permission: string) => {
      requestedPermissions.push(permission);
      return principal();
    },
    inventory: {
      persistenceMode: 'database',
      async listPersistedItems(accountId: string, filters: Record<string, unknown>) {
        sourceCalls.push({ accountId, filters });
        return [
          persistedItem,
          { ...persistedItem, id: 'foreign', accountId: 'acc-other' },
          { ...persistedItem, id: 'outside-period', createdAt: '2026-06-01T00:00:00.000Z' },
          { ...persistedItem, id: 'search-miss', sku: 'OTHER-001' }
        ];
      }
    }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'inventory-stock',
      filters: {
        search: ' MED-001 ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-inventory-stock',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    reportId: string;
    filters: Record<string, unknown>;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'inventory-stock');
  assert.deepEqual(execution.filters, {
    search: 'MED-001',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(requestedPermissions, ['billing.read', 'inventory.read']);
  assert.deepEqual(execution.rows[0], {
    sku: 'MED-001',
    name: 'Dipirona',
    unit: 'un',
    onHandQuantity: 4,
    reorderLevel: 5,
    unitCostAmount: 12.5,
    stockValue: 50,
    reorderStatus: 'below_reorder_level',
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T01:00:00.000Z'
  });
  assert.deepEqual(sourceCalls, [
    {
      accountId: 'acc-reports-1',
      filters: {
        search: 'MED-001',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        limit: 10_001
      }
    }
  ]);
});

test('handleReportsRoutes executes the raw persisted inventory movement report with account scope', async () => {
  const reports = persistedReports();
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const requestedPermissions: string[] = [];
  const routeHandlers = {
    ...handlers(reports),
    requirePrincipal: (_request: never, permission: string) => {
      requestedPermissions.push(permission);
      return principal();
    },
    inventory: {
      persistenceMode: 'database',
      stockMovementsPersistenceMode: 'database',
      async listPersistedStockMovementReportRows(
        accountId: string,
        filters: Record<string, unknown>
      ) {
        sourceCalls.push({ accountId, filters });
        return [
          {
            movement: {
              id: 'movement-own',
              accountId: 'acc-reports-1',
              inventoryItemId: 'item-own',
              movementType: 'consumption',
              quantityDelta: -2,
              balanceBefore: 10,
              balanceAfter: 8,
              unitCostAmount: 12.5,
              reason: 'Consumo assistencial',
              reference: 'encounter-1',
              recordedByUserId: 'user-1',
              createdAt: '2026-05-10T10:00:00.000Z'
            },
            sku: 'MED-001',
            name: 'Dipirona',
            unit: 'ampola'
          },
          {
            movement: {
              id: 'movement-foreign',
              accountId: 'acc-other',
              inventoryItemId: 'item-other',
              movementType: 'inbound',
              quantityDelta: 4,
              balanceBefore: 0,
              balanceAfter: 4,
              unitCostAmount: 9,
              reason: 'Entrada de compra',
              reference: 'NF-other',
              recordedByUserId: 'other-user',
              createdAt: '2026-05-10T11:00:00.000Z'
            },
            sku: 'OTHER-001',
            name: 'Outro produto',
            unit: 'un'
          },
          {
            movement: {
              id: 'movement-date-miss',
              accountId: 'acc-reports-1',
              inventoryItemId: 'item-own',
              movementType: 'adjustment',
              quantityDelta: 1,
              balanceBefore: 8,
              balanceAfter: 9,
              unitCostAmount: 12.5,
              reason: 'Ajuste',
              reference: null,
              recordedByUserId: 'user-1',
              createdAt: '2026-06-01T10:00:00.000Z'
            },
            sku: 'MED-001',
            name: 'Dipirona',
            unit: 'ampola'
          }
        ];
      }
    }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'inventory-movements',
      filters: {
        search: ' MED-001 ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-inventory-movements',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    reportId: string;
    filters: Record<string, unknown>;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'inventory-movements');
  assert.deepEqual(execution.filters, {
    search: 'MED-001',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(requestedPermissions, ['billing.read', 'inventory.read']);
  assert.deepEqual(execution.rows[0], {
    movementId: 'movement-own',
    occurredAt: '2026-05-10T10:00:00.000Z',
    movementType: 'consumption',
    sku: 'MED-001',
    name: 'Dipirona',
    unit: 'ampola',
    quantityDelta: -2,
    balanceBefore: 10,
    balanceAfter: 8,
    unitCostAmount: 12.5,
    reason: 'Consumo assistencial',
    reference: 'encounter-1',
    recordedByUserId: 'user-1'
  });
  assert.deepEqual(sourceCalls, [
    {
      accountId: 'acc-reports-1',
      filters: {
        search: 'MED-001',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        limit: 10_001
      }
    }
  ]);
});

test('handleReportsRoutes fails closed for a disabled inventory movement ledger and enforces its row bound', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-movements' }),
        new MockResponse() as never,
        'corr-inventory-movements-disabled',
        {
          ...handlers(),
          inventory: {
            persistenceMode: 'database',
            stockMovementsPersistenceMode: 'disabled'
          }
        } as never
      ),
    /database-backed stock movement source/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-movements' }),
        new MockResponse() as never,
        'corr-inventory-movements-limit',
        {
          ...handlers(),
          inventory: {
            persistenceMode: 'database',
            stockMovementsPersistenceMode: 'database',
            async listPersistedStockMovementReportRows() {
              return Array.from({ length: 10_001 }, (_, index) => ({
                movement: {
                  id: `movement-${index}`,
                  accountId: 'acc-reports-1',
                  inventoryItemId: `item-${index}`,
                  movementType: 'inbound',
                  quantityDelta: 1,
                  balanceBefore: 0,
                  balanceAfter: 1,
                  unitCostAmount: 1,
                  reason: 'Entrada',
                  reference: null,
                  recordedByUserId: 'user-1',
                  createdAt: '2026-05-10T00:00:00.000Z'
                },
                sku: `SKU-${index}`,
                name: `Produto ${index}`,
                unit: 'un'
              }));
            }
          }
        } as never
      ),
    /Report contains too many rows/
  );
});

test('handleReportsRoutes rejects malformed inventory movement source rows before persistence', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-movements' }),
        new MockResponse() as never,
        'corr-inventory-movements-invalid-row',
        {
          ...handlers(),
          inventory: {
            persistenceMode: 'database',
            stockMovementsPersistenceMode: 'database',
            async listPersistedStockMovementReportRows() {
              return [
                {
                  movement: {
                    id: 'movement-invalid',
                    accountId: 'acc-reports-1',
                    inventoryItemId: 'item-own',
                    movementType: 'inbound',
                    quantityDelta: '1',
                    balanceBefore: 0,
                    balanceAfter: 1,
                    unitCostAmount: 1,
                    reason: 'Entrada',
                    reference: null,
                    recordedByUserId: 'user-1',
                    createdAt: '2026-05-10T10:00:00.000Z'
                  },
                  sku: 'SKU-001',
                  name: 'Produto',
                  unit: 'un'
                }
              ];
            }
          }
        } as never
      ),
    /source returned an invalid row/
  );
});

test('handleReportsRoutes fails closed when inventory movement reports are not durable', async () => {
  const reports = new ReportsService();
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-movements' }),
        new MockResponse() as never,
        'corr-inventory-movements-memory-reports',
        {
          ...handlers(reports),
          inventory: {
            persistenceMode: 'database',
            stockMovementsPersistenceMode: 'database',
            async listPersistedStockMovementReportRows() {
              return [
                {
                  movement: {
                    id: 'movement-durable-check',
                    accountId: 'acc-reports-1',
                    inventoryItemId: 'item-own',
                    movementType: 'inbound',
                    quantityDelta: 1,
                    balanceBefore: 0,
                    balanceAfter: 1,
                    unitCostAmount: 1,
                    reason: 'Entrada',
                    reference: null,
                    recordedByUserId: 'user-1',
                    createdAt: '2026-05-10T10:00:00.000Z'
                  },
                  sku: 'SKU-001',
                  name: 'Produto',
                  unit: 'un'
                }
              ];
            }
          }
        } as never
      ),
    /database-backed ReportsService/
  );
  assert.deepEqual(reports.listExecutions('acc-reports-1' as never), []);
});

test('handleReportsRoutes fails closed for an in-memory inventory-stock source and enforces its row bound', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-stock' }),
        new MockResponse() as never,
        'corr-inventory-stock-memory',
        {
          ...handlers(),
          inventory: { persistenceMode: 'in-memory' }
        } as never
      ),
    /database-backed inventory source/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-stock' }),
        new MockResponse() as never,
        'corr-inventory-stock-limit',
        {
          ...handlers(),
          inventory: {
            persistenceMode: 'database',
            async listPersistedItems() {
              return Array.from({ length: 10_001 }, (_, index) => ({
                id: `inventory-stock-${index}`,
                accountId: 'acc-reports-1',
                sku: `SKU-${index}`,
                name: `Produto ${index}`,
                unit: 'un',
                onHandQuantity: 1,
                reorderLevel: 1,
                unitCostAmount: 1,
                createdAt: '2026-05-10T00:00:00.000Z',
                updatedAt: '2026-05-10T00:00:00.000Z'
              }));
            }
          }
        } as never
      ),
    /too many rows/
  );
});

test('handleReportsRoutes rejects inventory-products reports without a database source or within the row bound', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-products' }),
        new MockResponse() as never,
        'corr-inventory-products-memory',
        {
          ...handlers(),
          inventory: { persistenceMode: 'in-memory' }
        } as never
      ),
    /database-backed inventory source/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'inventory-products',
          filters: { search: 'x'.repeat(201) }
        }),
        new MockResponse() as never,
        'corr-inventory-products-search',
        {
          ...handlers(),
          inventory: {
            persistenceMode: 'database',
            async listPersistedItems() {
              throw new Error('source must not be called');
            }
          }
        } as never
      ),
    /search must be a string with at most 200 characters/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'inventory-products' }),
        new MockResponse() as never,
        'corr-inventory-products-limit',
        {
          ...handlers(),
          inventory: {
            persistenceMode: 'database',
            async listPersistedItems() {
              return Array.from({ length: 10_001 }, (_, index) => ({
                id: `inventory-${index}`,
                accountId: 'acc-reports-1',
                sku: `SKU-${index}`,
                name: `Produto ${index}`,
                unit: 'un',
                onHandQuantity: 1,
                reorderLevel: 1,
                unitCostAmount: 1,
                createdAt: '2026-05-10T00:00:00.000Z',
                updatedAt: '2026-05-10T00:00:00.000Z'
              }));
            }
          }
        } as never
      ),
    /Report contains too many rows/
  );
});

test('handleReportsRoutes validates the report execution body before reading a source', async () => {
  const sourceCalls: string[] = [];
  const routeHandlers = {
    ...handlers(),
    inventory: {
      persistenceMode: 'database',
      async listPersistedItems() {
        sourceCalls.push('read');
        return [];
      }
    }
  };

  const invalidBodies: Array<{ body: unknown; message: RegExp }> = [
    { body: null, message: /Request body must be an object/ },
    { body: { reportId: 123 }, message: /reportId must be a non-empty string/ },
    {
      body: { reportId: 'inventory-products', filters: null },
      message: /filters must be an object/
    },
    { body: { reportId: 'inventory-products', filters: [] }, message: /filters must be an object/ },
    {
      body: { reportId: 'inventory-products', filters: 'search' },
      message: /filters must be an object/
    },
    {
      body: { reportId: 'inventory-products', filters: { dateFrom: '2026-02-30' } },
      message: /dateFrom must be an ISO calendar date/
    }
  ];

  for (const invalid of invalidBodies) {
    await assert.rejects(
      () =>
        handleReportsRoutes(
          '/reports/executions',
          request('POST', invalid.body),
          new MockResponse() as never,
          'corr-inventory-products-invalid-body',
          routeHandlers as never
        ),
      invalid.message
    );
  }
  assert.deepEqual(sourceCalls, []);
});

test('handleReportsRoutes validates the report export body before parsing its format', async () => {
  const reports = new ReportsService();
  const execution = await reports.execute('acc-reports-1' as never, 'user-reports-1' as never, {
    reportId: 'inventory-products',
    rows: []
  });
  const routeHandlers = { ...handlers(reports) };
  const invalidBodies: unknown[] = [null, [], 'csv', 42];

  for (const body of invalidBodies) {
    await assert.rejects(
      () =>
        handleReportsRoutes(
          `/reports/executions/${execution.id}/export`,
          request('POST', body, `/reports/executions/${execution.id}/export`),
          new MockResponse() as never,
          'corr-report-export-invalid-body',
          routeHandlers as never
        ),
      /Request body must be an object/
    );
  }
});

test('handleReportsRoutes rejects an in-memory NFS-e source and invalid/oversized report input', async () => {
  const inMemoryResponse = new MockResponse();
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'fiscal-service-invoices', filters: {} }),
        inMemoryResponse as never,
        'corr-service-invoices-memory',
        handlers() as never
      ),
    /database-backed fiscal source/
  );

  const calls: string[] = [];
  const databaseFiscal = {
    forAccount() {
      return {
        persistenceMode: 'database',
        async listNfseDocuments() {
          calls.push('read');
          return Array.from({ length: 10_001 }, (_, index) => ({
            id: `nfse-${index}`,
            serie: '001',
            numero: index + 1,
            competencia: '2026-05-15',
            status: 'issued',
            provider: 'abrasf',
            customer: { type: 'cpf', document: '1', name: 'Cliente' },
            services: [],
            subtotal: 1,
            totalIss: 0,
            totalPis: 0,
            totalCofins: 0,
            totalCsll: 0,
            totalDocument: 1,
            createdAt: '2026-05-15T00:00:00.000Z'
          }));
        }
      };
    }
  };

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'fiscal-service-invoices',
          filters: { dateFrom: '2026-02-30' }
        }),
        new MockResponse() as never,
        'corr-service-invoices-date',
        { ...handlers(), fiscal: databaseFiscal } as never
      ),
    /dateFrom must be an ISO calendar date/
  );
  assert.deepEqual(calls, []);

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'fiscal-service-invoices',
          filters: { status: 'unknown' }
        }),
        new MockResponse() as never,
        'corr-service-invoices-status',
        { ...handlers(), fiscal: databaseFiscal } as never
      ),
    /status must be draft, issued, cancelled or error/
  );
  assert.deepEqual(calls, []);

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'fiscal-service-invoices',
          filters: {}
        }),
        new MockResponse() as never,
        'corr-service-invoices-limit',
        { ...handlers(), fiscal: databaseFiscal } as never
      ),
    /Report contains too many rows/
  );
  assert.deepEqual(calls, ['read']);
});

test('handleReportsRoutes ignores unrelated and legacy administrative hub routes', async () => {
  const response = new MockResponse();
  assert.equal(
    await handleReportsRoutes('/owners', request('GET'), response as never, 'corr', handlers()),
    false
  );
  assert.equal(
    await handleReportsRoutes(
      '/reports/administrative-hubs',
      request('GET'),
      response as never,
      'corr',
      handlers()
    ),
    false
  );
});

test('handleReportsRoutes exposes catalog, execution, export and schedules', async () => {
  const auditWrites: Array<{
    action: string;
    entityType: string;
    entityId: string;
    riskLevel: string;
  }> = [];
  const routeHandlers = handlers(undefined, undefined, {
    write: (event) => {
      auditWrites.push(event as never);
      return event;
    }
  });

  const catalogResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/catalog',
    request('GET'),
    catalogResponse as never,
    'corr-1',
    routeHandlers
  );
  assert.ok(catalogResponse.bodyJson<{ items: unknown[] }>().items.length >= 2);

  const executeResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', { reportId: 'administrative-executive', filters: { dateFrom: '2026-05-01' } }),
    executeResponse as never,
    'corr-2',
    routeHandlers
  );
  assert.equal(executeResponse.statusCode, 201);
  const execution = executeResponse.bodyJson<{ id: string; rowCount: number }>();
  assert.equal(execution.rowCount, 4);

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-3',
    routeHandlers
  );
  assert.equal(exportResponse.bodyJson<{ format: string; content: string }>().format, 'csv');
  assert.match(
    exportResponse.bodyJson<{ content: string }>().content,
    /Domínio,Indicador,Valor,Status/
  );

  const scheduleResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/schedules',
    request(
      'POST',
      {
        reportId: 'administrative-executive',
        name: 'Diretoria diaria',
        frequency: 'daily',
        format: 'csv'
      },
      '/reports/schedules'
    ),
    scheduleResponse as never,
    'corr-4',
    routeHandlers
  );
  assert.equal(scheduleResponse.statusCode, 201);
  const schedule = scheduleResponse.bodyJson<{
    id: string;
    createdAt: string;
    nextRunAt: string;
  }>();
  assert.equal(schedule.nextRunAt, addUtcDays(schedule.createdAt, 1));
  await routeHandlers.reports.recordScheduleDeliveries('acc-reports-1' as never, schedule.id, {
    recipients: ['diretoria@cvg.local'],
    status: 'sent',
    format: 'csv',
    deliveredAt: schedule.nextRunAt
  });
  const [failedDelivery] = await routeHandlers.reports.recordScheduleDeliveries(
    'acc-reports-1' as never,
    schedule.id,
    {
      executionId: execution.id,
      recipients: ['financeiro@cvg.local'],
      status: 'failed',
      format: 'csv',
      error: 'SMTP indisponivel',
      deliveredAt: schedule.nextRunAt
    }
  );
  await routeHandlers.reports.recordScheduleDeliveries('acc-reports-1' as never, schedule.id, {
    executionId: execution.id,
    recipients: ['financeiro@cvg.local'],
    status: 'failed',
    format: 'csv',
    error: 'SMTP indisponivel',
    deliveredAt: addUtcDays(schedule.nextRunAt, 1)
  });

  const schedulesResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/schedules',
    request('GET'),
    schedulesResponse as never,
    'corr-5',
    routeHandlers
  );
  assert.equal(schedulesResponse.bodyJson<{ items: unknown[] }>().items.length, 1);

  const deliveriesResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/deliveries`,
    request('GET', undefined, `/reports/schedules/${schedule.id}/deliveries`),
    deliveriesResponse as never,
    'corr-5a',
    routeHandlers
  );
  const deliveries = deliveriesResponse.bodyJson<{
    items: Array<{ recipient: string; status: string }>;
  }>().items;
  assert.ok(
    deliveries.some((item) => item.recipient === 'diretoria@cvg.local' && item.status === 'sent')
  );

  const alertsResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/delivery-alerts`,
    request('GET', undefined, `/reports/schedules/${schedule.id}/delivery-alerts`),
    alertsResponse as never,
    'corr-5ab',
    routeHandlers
  );
  const alerts = alertsResponse.bodyJson<{
    items: Array<{ recipient: string; failureCount: number; severity: string }>;
  }>().items;
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.recipient, 'financeiro@cvg.local');
  assert.equal(alerts[0]?.failureCount, 2);
  assert.equal(alerts[0]?.severity, 'high');
  assert.ok(
    auditWrites.some(
      (event) =>
        event.action === 'report_schedule_delivery_alerts_read' &&
        event.entityType === 'report-schedule-delivery-alert' &&
        event.entityId === schedule.id &&
        event.riskLevel === 'high'
    )
  );

  const retryResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/deliveries/${failedDelivery?.id}/retry`,
    request(
      'POST',
      undefined,
      `/reports/schedules/${schedule.id}/deliveries/${failedDelivery?.id}/retry`
    ),
    retryResponse as never,
    'corr-5aa',
    routeHandlers
  );
  const retriedDelivery = retryResponse.bodyJson<{
    recipient: string;
    status: string;
    executionId: string;
  }>();
  assert.equal(retryResponse.statusCode, 201);
  assert.equal(retriedDelivery.recipient, 'financeiro@cvg.local');
  assert.equal(retriedDelivery.status, 'sent');
  assert.equal(retriedDelivery.executionId, execution.id);

  const pauseResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}`,
    request('PATCH', { isActive: false }, `/reports/schedules/${schedule.id}`),
    pauseResponse as never,
    'corr-5b',
    routeHandlers
  );
  assert.equal(pauseResponse.bodyJson<{ isActive: boolean }>().isActive, false);

  const reactivateResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}`,
    request('PATCH', { isActive: true }, `/reports/schedules/${schedule.id}`),
    reactivateResponse as never,
    'corr-5c',
    routeHandlers
  );
  assert.equal(reactivateResponse.bodyJson<{ isActive: boolean }>().isActive, true);

  const dueResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/schedules/due',
    request(
      'GET',
      undefined,
      `/reports/schedules/due?asOf=${encodeURIComponent(addUtcDays(schedule.createdAt, 1))}`
    ),
    dueResponse as never,
    'corr-6',
    routeHandlers
  );
  assert.equal(dueResponse.bodyJson<{ items: unknown[] }>().items.length, 1);
});

test('handleReportsRoutes executes commission calculation report', async () => {
  const reports = new ReportsService();
  const commissions = new CommissionsService();
  await commissions.createRule('acc-reports-1' as never, 'user-reports-1' as never, {
    description: 'Global',
    percentage: 10
  });
  await commissions.calculate('acc-reports-1' as never, 'user-reports-1' as never, {
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    lines: [
      {
        staffId: 'staff-1',
        staffName: 'Dra. Ana',
        itemKind: 'service',
        sourceType: 'manual',
        sourceId: 'line-1',
        sourceDescription: 'Consulta',
        baseAmount: 200,
        occurredAt: '2026-05-10'
      }
    ]
  });

  const response = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', { reportId: 'commission-calculations' }),
    response as never,
    'corr-6',
    handlers(reports, commissions)
  );

  const execution = response.bodyJson<{
    rowCount: number;
    rows: Array<{ totalCommissionAmount: number }>;
  }>();
  assert.equal(execution.rowCount, 1);
  assert.equal(execution.rows[0]?.totalCommissionAmount, 20);
});

test('handleReportsRoutes keeps registry report sources account scoped', async () => {
  const accountId = 'acc-reports-1' as never;
  const otherAccountId = 'acc-reports-other' as never;
  const owners = new OwnersService({ seedOwners: [] });
  const owner = owners.create(accountId, {
    fullName: 'Tutor Relatório',
    documentId: '11111111111',
    contacts: [{ label: 'Telefone', value: '+55 11 90000-0000', type: 'phone', primary: true }],
    financialResponsible: true,
    address: { city: 'São Paulo' }
  });
  owners.create(otherAccountId, {
    fullName: 'Tutor Outra Conta',
    contacts: [{ label: 'Telefone', value: '+55 11 91111-1111', type: 'phone', primary: true }],
    financialResponsible: false
  });
  const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
  patients.create(accountId, {
    name: 'Paciente Relatório',
    species: 'canine',
    breed: 'SRD',
    sex: 'female',
    microchip: '985141000000001',
    primaryOwnerId: owner.id
  });

  const requiredPermissions: string[] = [];
  const routeHandlers = {
    ...handlers(),
    owners,
    patients,
    requirePrincipal: (_request: never, permissionCode: string) => {
      requiredPermissions.push(permissionCode);
      return principal();
    }
  };
  const ownerResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'registration-owners',
      filters: { dateFrom: '2026-01-01', dateTo: '2026-12-31' }
    }),
    ownerResponse as never,
    'corr-register-owners',
    routeHandlers as never
  );
  const ownerExecution = ownerResponse.bodyJson<{
    rowCount: number;
    rows: Array<{
      documentId: string;
      fullName: string;
      primaryContact: string;
      city: string;
      financialResponsible: string;
      status: string;
      createdAt: string;
    }>;
  }>();
  assert.equal(ownerExecution.rowCount, 1);
  assert.deepEqual(ownerExecution.rows[0], {
    documentId: '11111111111',
    fullName: 'Tutor Relatório',
    primaryContact: 'Telefone: +55 11 90000-0000',
    city: 'São Paulo',
    financialResponsible: 'Sim',
    status: 'active',
    createdAt: ownerExecution.rows[0]?.createdAt
  });

  const patientResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'registration-patients',
      filters: { dateFrom: '2026-01-01', dateTo: '2026-12-31' }
    }),
    patientResponse as never,
    'corr-register-patients',
    routeHandlers as never
  );
  const patientExecution = patientResponse.bodyJson<{
    rowCount: number;
    rows: Array<{ code: string; name: string; microchip: string }>;
  }>();
  assert.equal(patientExecution.rowCount, 1);
  assert.match(patientExecution.rows[0]?.code ?? '', /\S/);
  assert.equal(patientExecution.rows[0]?.name, 'Paciente Relatório');
  assert.equal(patientExecution.rows[0]?.microchip, '985141000000001');

  const services = new ServicesService({
    repository: {
      async create() {},
      async update() {},
      async findById() {
        return null;
      },
      async findByAccountId() {
        return [];
      }
    } as never
  });
  const service = await services.create(accountId, {
    name: 'Consulta Relatório',
    code: 'SRV-001',
    description: 'Consulta clínica persistida',
    basePrice: 125.5,
    active: true
  });
  await services.create(otherAccountId, {
    name: 'Serviço Outra Conta',
    code: 'OTHER-001',
    basePrice: 999
  });
  const serviceResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'registration-services',
      filters: { dateFrom: '2026-01-01', dateTo: '2026-12-31' }
    }),
    serviceResponse as never,
    'corr-register-services',
    { ...routeHandlers, services } as never
  );
  const serviceExecution = serviceResponse.bodyJson<{
    rowCount: number;
    rows: Array<{
      code: string;
      name: string;
      description: string;
      basePrice: number;
      status: string;
      createdAt: string;
    }>;
  }>();
  assert.equal(serviceExecution.rowCount, 1);
  assert.deepEqual(serviceExecution.rows[0], {
    code: 'SRV-001',
    name: 'Consulta Relatório',
    description: 'Consulta clínica persistida',
    basePrice: 125.5,
    status: 'active',
    createdAt: service.createdAt
  });
  assert.deepEqual(requiredPermissions, [
    'billing.read',
    'owners.read',
    'billing.read',
    'patients.read',
    'billing.read',
    'service.read'
  ]);
});

test('handleReportsRoutes bounds and validates the services registry report', async () => {
  const oversizedServices = {
    persistenceMode: 'database',
    list: () =>
      Array.from({ length: 10_001 }, (_, index) => ({
        id: `service-${index}`,
        accountId: 'acc-reports-1',
        name: `Service ${index}`,
        code: null,
        description: null,
        basePrice: 10,
        active: true,
        createdAt: '2026-05-10T00:00:00.000Z',
        updatedAt: '2026-05-10T00:00:00.000Z'
      }))
  };

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'registration-services',
          filters: { dateFrom: '2026-05-01', dateTo: '2026-05-31' }
        }),
        new MockResponse() as never,
        'corr-services-limit',
        { ...handlers(), services: oversizedServices } as never
      ),
    /Report contains too many rows/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'registration-services',
          filters: { dateFrom: '2026-02-30' }
        }),
        new MockResponse() as never,
        'corr-services-invalid-date',
        { ...handlers(), services: oversizedServices } as never
      ),
    /dateFrom must be an ISO calendar date/
  );
});

test('handleReportsRoutes executes and exports the persisted supplier registry with account scope', async () => {
  const persistedRow = {
    id: 'expense-1',
    accountId: 'acc-reports-1',
    name: 'Fornecedor Persistido',
    kind: 'Operacional',
    category: 'FORNECEDOR',
    costCenterCode: 'ESTOQUE',
    costCenterName: 'Suprimentos',
    description: '=HYPERLINK("https://attacker.invalid")',
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-11T00:00:00.000Z',
    createdBy: 'user-reports-1'
  };
  const outsidePeriodRow = {
    ...persistedRow,
    id: 'expense-2',
    name: 'Despesa Fora do Período',
    createdAt: '2026-06-10T00:00:00.000Z'
  };
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const financeCatalog = {
    async list(accountId: string, filters: Record<string, unknown> = {}) {
      sourceCalls.push({ accountId, filters });
      const page = filters.page === 2 ? 2 : 1;
      return {
        items: page === 1 ? [persistedRow] : [outsidePeriodRow],
        totalItems: 2
      };
    }
  };
  const auditWrites: unknown[] = [];
  const routeHandlers = {
    ...handlers(),
    financeCatalog,
    audit: { write: (event: unknown) => auditWrites.push(event) }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'registration-suppliers',
      filters: {
        search: 'persistido',
        category: 'FORNECEDOR',
        costCenterCode: 'ESTOQUE',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-register-suppliers',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    id: string;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(execution.rows[0], {
    code: 'expense-1',
    name: 'Fornecedor Persistido',
    kind: 'Operacional',
    category: 'FORNECEDOR',
    costCenterCode: 'ESTOQUE',
    costCenterName: 'Suprimentos',
    description: '=HYPERLINK("https://attacker.invalid")',
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-11T00:00:00.000Z'
  });
  assert.equal(sourceCalls[0]?.accountId, 'acc-reports-1');
  assert.equal(sourceCalls[0]?.filters.search, 'persistido');
  assert.equal(sourceCalls[0]?.filters.category, 'FORNECEDOR');
  assert.equal(sourceCalls[0]?.filters.costCenterCode, 'ESTOQUE');
  assert.equal(sourceCalls[0]?.filters.dateFrom, '2026-05-01');
  assert.equal(sourceCalls[0]?.filters.dateTo, '2026-05-31');
  assert.equal(sourceCalls[0]?.filters.page, 1);
  assert.equal(sourceCalls[1]?.filters.page, 2);
  assert.ok(
    auditWrites.some(
      (event) =>
        (event as { action?: string }).action === 'execute_report' &&
        (event as { entityType?: string }).entityType === 'report-execution'
    )
  );

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-register-suppliers-export',
    routeHandlers as never
  );
  const exported = exportResponse.bodyJson<{ content: string }>();
  assert.match(exported.content, /Código,Nome,Tipo,Categoria/);
  assert.match(exported.content, /'=HYPERLINK\(""https:\/\/attacker\.invalid""\)/);
  assert.doesNotMatch(exported.content, /\n=HYPERLINK/);
});

test('handleReportsRoutes fails closed for supplier registry without a database source', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'registration-suppliers' }),
        new MockResponse() as never,
        'corr-register-suppliers-no-source',
        handlers() as never
      ),
    /database-backed finance catalog source/
  );
});

test('handleReportsRoutes rejects invalid supplier periods and oversized sources', async () => {
  const financeCatalog = {
    async list() {
      return {
        items: Array.from({ length: 10_001 }, (_, index) => ({
          id: `expense-${index}`,
          accountId: 'acc-reports-1',
          name: `Expense ${index}`,
          kind: 'Fixo',
          category: 'DESPESA',
          costCenterCode: 'ADM',
          costCenterName: 'Administrativo',
          description: 'Persistido',
          createdAt: '2026-05-10T00:00:00.000Z',
          updatedAt: '2026-05-10T00:00:00.000Z',
          createdBy: 'user-reports-1'
        })),
        totalItems: 10_001
      };
    }
  };

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'registration-suppliers',
          filters: { dateFrom: '2026-02-30' }
        }),
        new MockResponse() as never,
        'corr-register-suppliers-invalid-date',
        { ...handlers(), financeCatalog } as never
      ),
    /dateFrom must be an ISO calendar date/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'registration-suppliers' }),
        new MockResponse() as never,
        'corr-register-suppliers-limit',
        { ...handlers(), financeCatalog } as never
      ),
    /Report contains too many rows/
  );
});

test('handleReportsRoutes executes and exports the persisted advance-payment report with account scope', async () => {
  const persistedRow = {
    paymentId: 'advance-1',
    ownerId: 'owner-1',
    ownerName: 'Maria Persistida',
    documentId: '111.111.111-11',
    issuedAt: '2026-05-10T12:00:00.000Z',
    originalAmount: 250,
    compensatedAmount: 100,
    balance: 150,
    origin: 'cash_receipt',
    status: 'partially_compensated',
    notes: '=HYPERLINK("https://attacker.invalid")'
  };
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const advancePayments = {
    async list(accountId: string, filters: Record<string, unknown> = {}) {
      sourceCalls.push({ accountId, filters });
      return [persistedRow];
    }
  };
  const routeHandlers = { ...handlers(), advancePayments };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'financial-advance-payments',
      filters: {
        search: 'Maria',
        status: 'partially_compensated',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-advance-payments',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    id: string;
    reportId: string;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'financial-advance-payments');
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(execution.rows[0], {
    paymentId: 'advance-1',
    ownerName: 'Maria Persistida',
    documentId: '111.111.111-11',
    issuedAt: '2026-05-10T12:00:00.000Z',
    originalAmount: 250,
    compensatedAmount: 100,
    balance: 150,
    origin: 'cash_receipt',
    status: 'partially_compensated',
    notes: '=HYPERLINK("https://attacker.invalid")'
  });
  assert.deepEqual(sourceCalls, [
    {
      accountId: 'acc-reports-1',
      filters: {
        search: 'Maria',
        status: 'partially_compensated',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }
  ]);

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-advance-payments-export',
    routeHandlers as never
  );
  assert.equal(exportResponse.statusCode, 200);
  assert.match(exportResponse.bodyJson<{ content: string }>().content, /Maria Persistida/);
  assert.match(
    exportResponse.bodyJson<{ content: string }>().content,
    /'=HYPERLINK\(""https:\/\/attacker\.invalid""\)/
  );
});

test('handleReportsRoutes fails closed for advance-payment reports without a database source', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'financial-advance-payments' }),
        new MockResponse() as never,
        'corr-advance-payments-no-source',
        handlers() as never
      ),
    /database-backed advance-payment source/
  );
});

test('handleReportsRoutes validates advance-payment filters and enforces the row bound', async () => {
  const list = async () => [];
  const advancePayments = { list };

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'financial-advance-payments',
          filters: { status: 'unknown' }
        }),
        new MockResponse() as never,
        'corr-advance-payments-invalid-status',
        { ...handlers(), advancePayments } as never
      ),
    /status must be available, partially_compensated or compensated/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'financial-advance-payments',
          filters: { dateFrom: '2026-06-01', dateTo: '2026-05-01' }
        }),
        new MockResponse() as never,
        'corr-advance-payments-invalid-period',
        { ...handlers(), advancePayments } as never
      ),
    /dateFrom must be before or equal to dateTo/
  );

  const oversizedAdvancePayments = {
    async list() {
      return Array.from({ length: 10_001 }, () => ({ id: 'oversized' }));
    }
  };
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'financial-advance-payments' }),
        new MockResponse() as never,
        'corr-advance-payments-limit',
        { ...handlers(), advancePayments: oversizedAdvancePayments } as never
      ),
    /Report contains too many rows/
  );
});

test('handleReportsRoutes refuses a services registry export without database-backed source', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'registration-services' }),
        new MockResponse() as never,
        'corr-services-in-memory',
        handlers()
      ),
    /database-backed services source/
  );
});

test('handleReportsRoutes executes and exports the persisted cancelled counter-sale report', async () => {
  const reports = new ReportsService();
  const persistedCancelledSale = {
    id: 'sale-cancelled-1',
    accountId: 'acc-reports-1',
    number: 'CS-000901',
    ownerId: 'owner-reports-1',
    patientId: null,
    encounterId: null,
    queueEntryId: null,
    billingRecordId: null,
    status: 'cancelled',
    subtotal: 250,
    discountAmount: 25,
    total: 225,
    paidAmount: 0,
    balanceDue: 225,
    notes: '=HYPERLINK("https://attacker.invalid")',
    openedByUserId: 'user-reports-1',
    closedByUserId: null,
    closedAt: null,
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T10:30:00.000Z'
  };
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const routeHandlers = {
    ...handlers(reports),
    counterSales: {
      persistenceMode: 'database',
      async listPersisted(accountId: string, filters: Record<string, unknown>) {
        sourceCalls.push({ accountId, filters });
        return [persistedCancelledSale, { ...persistedCancelledSale, status: 'closed' }];
      }
    }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'commercial-deleted-sales',
      filters: {
        search: 'CS-000901',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-cancelled-sales',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    id: string;
    reportId: string;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'commercial-deleted-sales');
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(execution.rows[0], {
    number: 'CS-000901',
    status: 'cancelled',
    ownerId: 'owner-reports-1',
    openedByUserId: 'user-reports-1',
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T10:30:00.000Z',
    total: 225,
    discountAmount: 25,
    paidAmount: 0,
    balanceDue: 225,
    notes: '=HYPERLINK("https://attacker.invalid")'
  });
  assert.deepEqual(sourceCalls, [
    {
      accountId: 'acc-reports-1',
      filters: {
        status: 'cancelled',
        search: 'CS-000901',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }
  ]);

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-cancelled-sales-export',
    routeHandlers as never
  );
  const exported = exportResponse.bodyJson<{ content: string }>();
  assert.match(exported.content, /Número,Status,Tutor \(ID\),Usuário de abertura \(ID\)/);
  assert.match(exported.content, /'=HYPERLINK\(""https:\/\/attacker\.invalid""\)/);
});

test('handleReportsRoutes executes the persisted appointments report with account-safe filters', async () => {
  const reports = new ReportsService();
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const requestedPermissions: string[] = [];
  const routeHandlers = {
    ...handlers(reports),
    requirePrincipal: (_request: never, permission: string) => {
      requestedPermissions.push(permission);
      return principal();
    },
    scheduling: {
      persistenceMode: 'database',
      async listPersistedReportRows(accountId: string, filters: Record<string, unknown>) {
        sourceCalls.push({ accountId, filters });
        return [
          {
            id: 'appointment-report-1',
            accountId: 'acc-reports-1',
            patientId: 'patient-report-1',
            ownerId: 'owner-report-1',
            scheduledAt: '2026-05-15T10:00:00.000Z',
            visitType: 'scheduled',
            reason: 'Consulta de rotina',
            status: 'completed',
            practitionerStaffId: 'staff-report-1',
            serviceId: 'service-report-1',
            unit: 'Clinica Centro',
            specialty: 'Clinico geral',
            resourceLabel: 'Consultorio 1',
            createdAt: '2026-05-01T10:00:00.000Z',
            updatedAt: '2026-05-15T10:30:00.000Z'
          },
          {
            id: 'appointment-report-foreign',
            accountId: 'acc-other',
            patientId: 'patient-other',
            ownerId: 'owner-other',
            scheduledAt: '2026-05-15T11:00:00.000Z',
            visitType: 'scheduled',
            reason: 'Consulta de rotina',
            status: 'completed',
            createdAt: '2026-05-01T10:00:00.000Z',
            updatedAt: '2026-05-15T11:30:00.000Z'
          }
        ];
      }
    }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'scheduling-appointments',
      filters: {
        search: ' rotina ',
        status: 'completed',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-appointments-report',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    reportId: string;
    filters: Record<string, unknown>;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'scheduling-appointments');
  assert.deepEqual(execution.filters, {
    search: 'rotina',
    status: 'completed',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(requestedPermissions, ['billing.read', 'scheduling.read']);
  assert.deepEqual(execution.rows[0], {
    appointmentId: 'appointment-report-1',
    scheduledAt: '2026-05-15T10:00:00.000Z',
    status: 'completed',
    reason: 'Consulta de rotina',
    patientId: 'patient-report-1',
    ownerId: 'owner-report-1',
    practitionerStaffId: 'staff-report-1',
    serviceId: 'service-report-1',
    unit: 'Clinica Centro',
    specialty: 'Clinico geral',
    resourceLabel: 'Consultorio 1',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-15T10:30:00.000Z'
  });
  assert.deepEqual(sourceCalls, [
    {
      accountId: 'acc-reports-1',
      filters: {
        search: 'rotina',
        status: 'completed',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        limit: 10_001
      }
    }
  ]);
});

test('handleReportsRoutes fails closed for appointments reports without a database source', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'scheduling-appointments' }),
        new MockResponse() as never,
        'corr-appointments-report-no-source',
        {
          ...handlers(),
          scheduling: {
            persistenceMode: 'in-memory',
            async listPersistedReportRows() {
              return [];
            }
          }
        } as never
      ),
    /database-backed scheduling source/
  );
});

test('handleReportsRoutes validates appointments filters and source rows before persistence', async () => {
  const sourceCalls: string[] = [];
  const databaseSource = {
    persistenceMode: 'database',
    async listPersistedReportRows() {
      sourceCalls.push('read');
      return [];
    }
  };

  for (const [suffix, filters, message] of [
    [
      'status',
      { status: 'unknown' },
      /status must be scheduled, checked_in, completed or cancelled/
    ],
    ['search', { search: 'x'.repeat(201) }, /search must be a string with at most 200 characters/],
    ['date', { dateFrom: '2026-02-30' }, /dateFrom must be an ISO calendar date/],
    [
      'range',
      { dateFrom: '2026-06-02', dateTo: '2026-06-01' },
      /dateFrom must be before or equal to dateTo/
    ]
  ] as const) {
    await assert.rejects(
      () =>
        handleReportsRoutes(
          '/reports/executions',
          request('POST', { reportId: 'scheduling-appointments', filters }),
          new MockResponse() as never,
          `corr-appointments-report-invalid-${suffix}`,
          { ...handlers(), scheduling: databaseSource } as never
        ),
      message
    );
  }
  assert.deepEqual(sourceCalls, []);

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'scheduling-appointments' }),
        new MockResponse() as never,
        'corr-appointments-report-invalid-row',
        {
          ...handlers(),
          scheduling: {
            ...databaseSource,
            async listPersistedReportRows() {
              return [
                {
                  id: 'appointment-invalid',
                  accountId: 'acc-reports-1',
                  patientId: 'patient-report-1',
                  ownerId: 'owner-report-1',
                  scheduledAt: '2026-05-15T10:00:00.000Z',
                  visitType: 'scheduled',
                  reason: 42,
                  status: 'scheduled',
                  createdAt: '2026-05-01T10:00:00.000Z',
                  updatedAt: '2026-05-15T10:30:00.000Z'
                }
              ];
            }
          }
        } as never
      ),
    /source returned an invalid row/
  );
});

test('handleReportsRoutes rejects the appointments report overflow sentinel', async () => {
  const rows = Array.from({ length: 10_001 }, (_, index) => ({
    id: `appointment-overflow-${index}`,
    accountId: 'acc-reports-1',
    patientId: `patient-overflow-${index}`,
    ownerId: 'owner-report-1',
    scheduledAt: '2026-05-15T10:00:00.000Z',
    visitType: 'scheduled',
    reason: 'Overflow appointment',
    status: 'scheduled',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-15T10:30:00.000Z'
  }));

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'scheduling-appointments' }),
        new MockResponse() as never,
        'corr-appointments-report-overflow',
        {
          ...handlers(),
          scheduling: {
            persistenceMode: 'database',
            async listPersistedReportRows() {
              return rows;
            }
          }
        } as never
      ),
    /Report contains too many rows/
  );
});

test('handleReportsRoutes executes the persisted professional care report with account-safe filters', async () => {
  const reports = new ReportsService();
  const sourceCalls: Array<{ accountId: string; filters: Record<string, unknown> }> = [];
  const requestedPermissions: string[] = [];
  const routeHandlers = {
    ...handlers(reports),
    requirePrincipal: (_request: never, permission: string) => {
      requestedPermissions.push(permission);
      return principal();
    },
    scheduling: {
      persistenceMode: 'database',
      async listPersistedProfessionalCareReportRows(
        accountId: string,
        filters: Record<string, unknown>
      ) {
        sourceCalls.push({ accountId, filters });
        return [
          {
            professional: 'staff-report-1',
            scheduled: 3,
            completed: 1,
            checkedIn: 1,
            cancelled: 1,
            services: 2
          },
          {
            professional: 'Sem profissional',
            scheduled: 1,
            completed: 0,
            checkedIn: 0,
            cancelled: 0,
            services: 0
          }
        ];
      }
    }
  };
  const response = new MockResponse();

  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'scheduling-professional-care',
      filters: {
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    response as never,
    'corr-professional-care-report',
    routeHandlers as never
  );

  assert.equal(response.statusCode, 201);
  const execution = response.bodyJson<{
    reportId: string;
    filters: Record<string, unknown>;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'scheduling-professional-care');
  assert.deepEqual(execution.filters, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.equal(execution.rowCount, 2);
  assert.deepEqual(requestedPermissions, ['billing.read', 'staff.read']);
  assert.deepEqual(execution.rows, [
    {
      professional: 'staff-report-1',
      scheduled: 3,
      completed: 1,
      checkedIn: 1,
      cancelled: 1,
      services: 2
    },
    {
      professional: 'Sem profissional',
      scheduled: 1,
      completed: 0,
      checkedIn: 0,
      cancelled: 0,
      services: 0
    }
  ]);
  assert.deepEqual(sourceCalls, [
    {
      accountId: 'acc-reports-1',
      filters: {
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }
  ]);
});

test('handleReportsRoutes fails closed and validates professional care source rows before persistence', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'scheduling-professional-care' }),
        new MockResponse() as never,
        'corr-professional-care-report-no-source',
        {
          ...handlers(),
          scheduling: {
            persistenceMode: 'in-memory',
            async listPersistedProfessionalCareReportRows() {
              return [];
            }
          }
        } as never
      ),
    /database-backed scheduling source/
  );

  const sourceCalls: string[] = [];
  const databaseSource = {
    persistenceMode: 'database',
    async listPersistedProfessionalCareReportRows() {
      sourceCalls.push('read');
      return [];
    }
  };

  for (const [suffix, filters, message] of [
    ['date', { dateFrom: '2026-02-30' }, /dateFrom must be an ISO calendar date/],
    [
      'range',
      { dateFrom: '2026-06-02', dateTo: '2026-06-01' },
      /dateFrom must be before or equal to dateTo/
    ]
  ] as const) {
    await assert.rejects(
      () =>
        handleReportsRoutes(
          '/reports/executions',
          request('POST', { reportId: 'scheduling-professional-care', filters }),
          new MockResponse() as never,
          `corr-professional-care-report-invalid-${suffix}`,
          { ...handlers(), scheduling: databaseSource } as never
        ),
      message
    );
  }
  assert.deepEqual(sourceCalls, []);

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'scheduling-professional-care' }),
        new MockResponse() as never,
        'corr-professional-care-report-invalid-row',
        {
          ...handlers(),
          scheduling: {
            ...databaseSource,
            async listPersistedProfessionalCareReportRows() {
              return [
                {
                  professional: 'staff-invalid',
                  scheduled: -1,
                  completed: 0,
                  checkedIn: 0,
                  cancelled: 0,
                  services: 0
                }
              ];
            }
          }
        } as never
      ),
    /source returned an invalid professional care row/
  );
});

test('handleReportsRoutes rechecks report permission for execution and export access', async () => {
  const reports = new ReportsService();
  const execution = await reports.execute('acc-reports-1' as never, 'user-reports-1' as never, {
    reportId: 'commercial-deleted-sales',
    rows: [
      {
        number: 'CS-000902',
        status: 'cancelled',
        ownerId: null,
        openedByUserId: 'user-reports-1',
        createdAt: '2026-05-10T10:00:00.000Z',
        updatedAt: '2026-05-10T10:30:00.000Z',
        total: 0,
        discountAmount: 0,
        paidAmount: 0,
        balanceDue: 0,
        notes: null
      }
    ]
  });
  const exported = await reports.exportExecution(
    'acc-reports-1' as never,
    'user-reports-1' as never,
    execution.id,
    'csv'
  );
  const routeHandlers = {
    ...handlers(reports),
    requirePrincipal: (_request: never, permission: string) => {
      if (permission === 'counter_sale.read') throw new ForbiddenError('Forbidden');
      return principal();
    }
  };

  await assert.rejects(
    () =>
      handleReportsRoutes(
        `/reports/executions/${execution.id}`,
        request('GET', undefined, `/reports/executions/${execution.id}`),
        new MockResponse() as never,
        'corr-cancelled-sales-read-permission',
        routeHandlers as never
      ),
    ForbiddenError
  );
  await assert.rejects(
    () =>
      handleReportsRoutes(
        `/reports/exports/${exported.id}`,
        request('GET', undefined, `/reports/exports/${exported.id}`),
        new MockResponse() as never,
        'corr-cancelled-sales-export-read-permission',
        routeHandlers as never
      ),
    ForbiddenError
  );
  await assert.rejects(
    () =>
      handleReportsRoutes(
        `/reports/executions/${execution.id}/export`,
        request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
        new MockResponse() as never,
        'corr-cancelled-sales-export-permission',
        routeHandlers as never
      ),
    ForbiddenError
  );
});

test('handleReportsRoutes fails closed for cancelled counter-sale reports without database source', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'commercial-deleted-sales' }),
        new MockResponse() as never,
        'corr-cancelled-sales-no-source',
        {
          ...handlers(),
          counterSales: {
            persistenceMode: 'in-memory',
            async listPersisted() {
              return [];
            }
          }
        } as never
      ),
    /database-backed counter-sale source/
  );
});

test('handleReportsRoutes validates cancelled counter-sale periods, search and row bounds', async () => {
  const counterSales = {
    persistenceMode: 'database',
    async listPersisted() {
      return [];
    }
  };
  const routeHandlers = { ...handlers(), counterSales };

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'commercial-deleted-sales',
          filters: { dateFrom: '2026-06-01', dateTo: '2026-05-01' }
        }),
        new MockResponse() as never,
        'corr-cancelled-sales-invalid-period',
        routeHandlers as never
      ),
    /dateFrom must be before or equal to dateTo/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'commercial-deleted-sales',
          filters: { search: 'x'.repeat(201) }
        }),
        new MockResponse() as never,
        'corr-cancelled-sales-invalid-search',
        routeHandlers as never
      ),
    /search must be a string with at most 200 characters/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'commercial-deleted-sales' }),
        new MockResponse() as never,
        'corr-cancelled-sales-limit',
        {
          ...handlers(),
          counterSales: {
            ...counterSales,
            async listPersisted() {
              return Array.from({ length: 10_001 }, (_, index) => ({
                id: `sale-${index}`,
                accountId: 'acc-reports-1',
                number: `CS-${index}`,
                ownerId: null,
                patientId: null,
                encounterId: null,
                queueEntryId: null,
                billingRecordId: null,
                status: 'cancelled',
                subtotal: 0,
                discountAmount: 0,
                total: 0,
                paidAmount: 0,
                balanceDue: 0,
                notes: null,
                openedByUserId: 'user-reports-1',
                closedByUserId: null,
                closedAt: null,
                createdAt: '2026-05-10T10:00:00.000Z',
                updatedAt: '2026-05-10T10:00:00.000Z'
              }));
            }
          }
        } as never
      ),
    /Report contains too many rows/
  );
});

test('handleReportsRoutes executes and exports the authoritative payable report', async () => {
  let persistedExecutions = 0;
  let persistedExports = 0;
  const reports = new ReportsService({
    repository: {
      async saveExecution() {
        persistedExecutions += 1;
      },
      async saveExport() {
        persistedExports += 1;
      },
      async saveSchedule() {},
      async saveDelivery() {},
      async findExecutions() {
        return [];
      },
      async findExports() {
        return [];
      },
      async findSchedules() {
        return [];
      },
      async findDeliveries() {
        return [];
      }
    }
  });
  const financialPayables = new FinancialPayablesService();
  const accountId = 'acc-reports-1' as never;
  const userId = 'user-reports-1' as never;
  const paid = await financialPayables.createPayable(accountId, userId, {
    supplierName: 'Laboratório parceiro',
    description: 'NF 123',
    category: 'Laboratório',
    costCenterCode: 'LAB',
    costCenterName: 'Diagnóstico',
    issuedAt: '2026-05-01',
    dueAt: '2026-05-15',
    totalAmount: 420
  });
  await financialPayables.payPayable(accountId, userId, paid.id, {
    amountPaid: 420,
    paymentMethod: 'bank_transfer',
    paymentReference: 'TED-123'
  });
  await financialPayables.createPayable(accountId, userId, {
    supplierName: 'Fornecedor futuro',
    description: 'Fora do período',
    category: 'Operacional',
    costCenterCode: 'ADM',
    costCenterName: 'Administrativo',
    issuedAt: '2026-06-01T00:00:00.000Z',
    dueAt: '2026-06-15T00:00:00.000Z',
    totalAmount: 90
  });

  const auditWrites: Array<{ action: string; entityType: string; entityId: string }> = [];
  const routeHandlers = {
    ...handlers(reports, undefined, {
      write(event) {
        const value = event as { action: string; entityType: string; entityId: string };
        auditWrites.push(value);
        return event;
      }
    }),
    financialPayables
  };
  const executeResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'financial-payables',
      filters: {
        status: 'paid',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }),
    executeResponse as never,
    'corr-payables-execute',
    routeHandlers
  );

  assert.equal(executeResponse.statusCode, 201);
  const execution = executeResponse.bodyJson<{
    id: string;
    rowCount: number;
    rows: Array<{ supplierName: string; totalAmount: number; status: string }>;
  }>();
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(execution.rows[0], {
    supplierName: 'Laboratório parceiro',
    description: 'NF 123',
    category: 'Laboratório',
    issuedAt: '2026-05-01',
    dueAt: '2026-05-15',
    totalAmount: 420,
    paidAmount: 420,
    outstandingAmount: 0,
    status: 'paid',
    paymentMethod: 'bank_transfer',
    reconciliationStatus: 'pending'
  });

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-payables-export',
    routeHandlers
  );
  const exported = exportResponse.bodyJson<{ format: string; content: string }>();
  assert.equal(exported.format, 'csv');
  assert.match(exported.content, /Fornecedor,Descrição,Categoria/);
  assert.match(exported.content, /Laboratório parceiro/);
  assert.equal(persistedExecutions, 1);
  assert.equal(persistedExports, 1);
  assert.deepEqual(
    auditWrites.map((event) => [event.action, event.entityType]),
    [
      ['execute_report', 'report-execution'],
      ['export_report', 'report-export']
    ]
  );
});

test('handleReportsRoutes executes and exports the persisted cheque-payment report', async () => {
  const reports = new ReportsService();
  const auditWrites: Array<{ action: string; entityType: string }> = [];
  const routeHandlers = {
    ...handlers(reports, undefined, {
      write(event) {
        const value = event as { action: string; entityType: string };
        auditWrites.push(value);
        return event;
      }
    }),
    counterSales: {
      async listChequePayments(accountId: string, filters: { dateFrom?: string; dateTo?: string }) {
        assert.equal(accountId, 'acc-reports-1');
        assert.deepEqual(filters, { dateFrom: '2026-05-01', dateTo: '2026-05-31' });
        return [
          {
            id: 'payment-cheque-1',
            accountId: 'acc-reports-1',
            counterSaleId: 'sale-cheque-1',
            saleNumber: 'CS-0001',
            saleStatus: 'closed',
            method: 'check',
            amount: 125,
            installments: 1,
            reference: 'CHK-001',
            notes: 'Banco Vetus, bom para 30/04',
            createdAt: '2026-05-12T10:00:00.000Z'
          }
        ];
      }
    } as never
  };

  const executeResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'financial-cheques',
      filters: { dateFrom: '2026-05-01', dateTo: '2026-05-31' }
    }),
    executeResponse as never,
    'corr-cheques-execute',
    routeHandlers
  );

  assert.equal(executeResponse.statusCode, 201);
  const execution = executeResponse.bodyJson<{
    id: string;
    reportId: string;
    rowCount: number;
    rows: Array<Record<string, unknown>>;
  }>();
  assert.equal(execution.reportId, 'financial-cheques');
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(execution.rows[0], {
    paymentId: 'payment-cheque-1',
    counterSaleId: 'sale-cheque-1',
    saleNumber: 'CS-0001',
    saleStatus: 'closed',
    reference: 'CHK-001',
    amount: 125,
    installments: 1,
    recordedAt: '2026-05-12T10:00:00.000Z',
    notes: 'Banco Vetus, bom para 30/04'
  });

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-cheques-export',
    routeHandlers
  );
  const exported = exportResponse.bodyJson<{ format: string; content: string }>();
  assert.equal(exported.format, 'csv');
  assert.match(exported.content, /Pagamento,Comanda,Status da comanda/);
  assert.match(exported.content, /CHK-001/);
  assert.deepEqual(
    auditWrites.map((event) => [event.action, event.entityType]),
    [
      ['execute_report', 'report-execution'],
      ['export_report', 'report-export']
    ]
  );
});

test('handleReportsRoutes validates payable filters before reading the source', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'financial-payables', filters: { status: 'settled' } }),
        new MockResponse() as never,
        'corr-invalid-status',
        handlers()
      ),
    /status must be open, partial, paid or cancelled/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'financial-payables', filters: { dateFrom: '2026-02-30' } }),
        new MockResponse() as never,
        'corr-invalid-date',
        handlers()
      ),
    /dateFrom must be an ISO calendar date/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', {
          reportId: 'financial-cheques',
          filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' }
        }),
        new MockResponse() as never,
        'corr-invalid-cheque-range',
        handlers()
      ),
    /dateFrom must be before or equal to dateTo/
  );
});

test('handleReportsRoutes drains every payable source page before exporting', async () => {
  let calls = 0;
  const payable = {
    supplierName: 'Fornecedor paginado',
    description: 'Título paginado',
    category: 'Operacional',
    issuedAt: '2026-05-01',
    dueAt: '2026-05-15',
    totalAmount: 10,
    paidAmount: 0,
    outstandingAmount: 10,
    status: 'open',
    paymentMethod: null,
    reconciliationStatus: 'not_required'
  } as never;
  const financialPayables = {
    async listPayables(_accountId: unknown, filters: { page?: number }) {
      calls += 1;
      const data = filters.page === 1 ? Array.from({ length: 100 }, () => payable) : [payable];
      return {
        data,
        page: filters.page ?? 1,
        pageSize: 100,
        total: 101,
        openCount: 101,
        paidCount: 0,
        cancelledCount: 0,
        totalAmount: 1010,
        totalPaid: 0,
        totalOutstanding: 1010
      };
    }
  } as never;
  const response = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', { reportId: 'financial-payables' }),
    response as never,
    'corr-payables-pagination',
    { ...handlers(), financialPayables }
  );

  assert.equal(calls, 2);
  assert.equal(response.bodyJson<{ rowCount: number }>().rowCount, 101);
});

test('handleReportsRoutes keeps report execution and export opaque across accounts', async () => {
  const reports = new ReportsService();
  const execution = await reports.execute('acc-reports-1' as never, 'user-reports-1' as never, {
    reportId: 'financial-payables',
    rows: []
  });
  const foreignAccount = 'acc-reports-foreign' as never;
  const foreignPrincipal = principal();
  const foreignHandlers = {
    ...handlers(reports),
    requirePrincipal: () => ({
      ...foreignPrincipal,
      user: { ...foreignPrincipal.user, accountId: foreignAccount },
      session: { ...foreignPrincipal.session, accountId: foreignAccount }
    })
  };

  await assert.rejects(
    () =>
      handleReportsRoutes(
        `/reports/executions/${execution.id}`,
        request('GET', undefined, `/reports/executions/${execution.id}`),
        new MockResponse() as never,
        'corr-foreign-execution',
        foreignHandlers
      ),
    /Report execution not found/
  );
  await assert.rejects(
    () =>
      handleReportsRoutes(
        `/reports/executions/${execution.id}/export`,
        request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
        new MockResponse() as never,
        'corr-foreign-export',
        foreignHandlers
      ),
    /Report execution not found/
  );
});

test('handleReportsRoutes executes and exports the authoritative received report', async () => {
  let persistedExecutions = 0;
  let persistedExports = 0;
  const reports = new ReportsService({
    repository: {
      async saveExecution() {
        persistedExecutions += 1;
      },
      async saveExport() {
        persistedExports += 1;
      },
      async saveSchedule() {},
      async saveDelivery() {},
      async findExecutions() {
        return [];
      },
      async findExports() {
        return [];
      },
      async findSchedules() {
        return [];
      },
      async findDeliveries() {
        return [];
      }
    }
  });
  const receivable = {
    id: 'receivable-settled-1',
    encounterId: 'encounter-received-1',
    financialAccountId: 'financial-account-received-1',
    installmentNumber: 1,
    installmentLabel: 'Parcela 1/1',
    dueAt: '2026-05-15',
    status: 'settled',
    amountOriginal: 420,
    amountPaid: 420,
    amountOutstanding: 0,
    issuedAt: '2026-05-01',
    settledAt: '2026-05-20T14:30:00.000Z',
    patientName: 'Paciente Recebido',
    patientSpecies: 'Canino',
    ownerName: 'Tutor Recebido',
    encounterStatus: 'closed',
    financialStatus: 'paid',
    totalAmount: 420,
    lastClosedAt: '2026-05-20T14:00:00.000Z',
    payments: [{ id: 'payment-1' }]
  } as never;
  const auditWrites: Array<{ action: string; entityType: string }> = [];
  let sourceRequest:
    | {
        accountId?: unknown;
        status?: unknown;
        search?: unknown;
        page?: number;
        pageSize?: number;
      }
    | undefined;
  const encounterFinancial = {
    async listReceivables(filters: typeof sourceRequest) {
      sourceRequest = filters;
      return {
        data: [receivable],
        page: 1,
        pageSize: 100,
        total: 1,
        openCount: 0,
        settledCount: 1,
        totalOutstanding: 0,
        totalSettled: 420
      };
    }
  } as never;
  const routeHandlers = {
    ...handlers(reports),
    encounterFinancial,
    audit: {
      write(event: unknown) {
        const value = event as { action: string; entityType: string };
        auditWrites.push(value);
        return event;
      }
    }
  };
  const executeResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', {
      reportId: 'financial-receivables',
      filters: {
        status: 'settled',
        search: 'Paciente Recebido',
        dateFrom: '2026-05-18',
        dateTo: '2026-05-21'
      }
    }),
    executeResponse as never,
    'corr-receivables-execute',
    routeHandlers as never
  );

  assert.equal(executeResponse.statusCode, 201);
  const execution = executeResponse.bodyJson<{
    id: string;
    rowCount: number;
    rows: Array<{
      patientName: string;
      ownerName: string;
      amountPaid: number;
      status: string;
      paymentCount: number;
    }>;
  }>();
  assert.equal(execution.rowCount, 1);
  assert.deepEqual(sourceRequest, {
    accountId: 'acc-reports-1',
    status: 'settled',
    search: 'Paciente Recebido',
    page: 1,
    pageSize: 100
  });
  assert.deepEqual(execution.rows[0], {
    patientName: 'Paciente Recebido',
    ownerName: 'Tutor Recebido',
    patientSpecies: 'Canino',
    encounterId: 'encounter-received-1',
    installmentNumber: 1,
    installmentLabel: 'Parcela 1/1',
    issuedAt: '2026-05-01',
    dueAt: '2026-05-15',
    settledAt: '2026-05-20T14:30:00.000Z',
    amountOriginal: 420,
    amountPaid: 420,
    amountOutstanding: 0,
    status: 'settled',
    financialStatus: 'paid',
    encounterStatus: 'closed',
    paymentCount: 1
  });

  const exportResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/executions/${execution.id}/export`,
    request('POST', { format: 'csv' }, `/reports/executions/${execution.id}/export`),
    exportResponse as never,
    'corr-receivables-export',
    routeHandlers as never
  );
  const exported = exportResponse.bodyJson<{ format: string; content: string }>();
  assert.equal(exported.format, 'csv');
  assert.match(exported.content, /Paciente,Nome do tutor/);
  assert.match(exported.content, /Paciente Recebido/);
  assert.equal(persistedExecutions, 1);
  assert.equal(persistedExports, 1);
  assert.deepEqual(
    auditWrites.map((event) => [event.action, event.entityType]),
    [
      ['execute_report', 'report-execution'],
      ['export_report', 'report-export']
    ]
  );
});

test('handleReportsRoutes validates received filters before reading the source', async () => {
  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'financial-receivables', filters: { status: 'paid' } }),
        new MockResponse() as never,
        'corr-invalid-receivable-status',
        handlers()
      ),
    /status must be open or settled/
  );

  await assert.rejects(
    () =>
      handleReportsRoutes(
        '/reports/executions',
        request('POST', { reportId: 'financial-receivables', filters: { dateTo: '2026-02-30' } }),
        new MockResponse() as never,
        'corr-invalid-receivable-date',
        handlers()
      ),
    /dateTo must be an ISO calendar date/
  );
});

test('handleReportsRoutes drains every received source page before exporting', async () => {
  let calls = 0;
  const receivable = {
    id: 'receivable-paged',
    encounterId: 'encounter-paged',
    financialAccountId: 'financial-account-paged',
    installmentNumber: 1,
    installmentLabel: 'Parcela 1/1',
    dueAt: '2026-05-15',
    status: 'settled',
    amountOriginal: 10,
    amountPaid: 10,
    amountOutstanding: 0,
    issuedAt: '2026-05-01',
    settledAt: '2026-05-20T00:00:00.000Z',
    patientName: 'Paciente paginado',
    patientSpecies: null,
    ownerName: 'Tutor paginado',
    encounterStatus: 'closed',
    financialStatus: 'paid',
    totalAmount: 10,
    lastClosedAt: null,
    payments: []
  } as never;
  const encounterFinancial = {
    async listReceivables(filters: { page?: number }) {
      calls += 1;
      return {
        data: filters.page === 1 ? Array.from({ length: 100 }, () => receivable) : [receivable],
        page: filters.page ?? 1,
        pageSize: 100,
        total: 101,
        openCount: 0,
        settledCount: 101,
        totalOutstanding: 0,
        totalSettled: 1010
      };
    }
  } as never;
  const response = new MockResponse();
  await handleReportsRoutes(
    '/reports/executions',
    request('POST', { reportId: 'financial-receivables', filters: { status: 'settled' } }),
    response as never,
    'corr-receivables-pagination',
    { ...handlers(), encounterFinancial } as never
  );

  assert.equal(calls, 2);
  assert.equal(response.bodyJson<{ rowCount: number }>().rowCount, 101);
});

function addUtcDays(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
