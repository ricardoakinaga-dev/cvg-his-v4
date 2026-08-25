import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { CommissionsService } from '@cvg-his-v2/module-commissions';
import { FinancialPayablesService } from '@cvg-his-v2/module-financial';
import { ReportsService } from '@cvg-his-v2/module-reports';

import { handleReportsRoutes } from './reports-routes.js';

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
  } as never
) {
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
    quotes: {
      list: () => [
        { status: 'approved', total: 120 },
        { status: 'draft', total: 80 }
      ]
    } as never,
    audit: audit as never,
    requirePrincipal: () => principal()
  };
}

test('handleReportsRoutes ignores unrelated and legacy administrative hub routes', async () => {
  const response = new MockResponse();
  assert.equal(
    await handleReportsRoutes('/owners', request('GET'), response as never, 'corr', handlers()),
    false
  );
  assert.equal(
    await handleReportsRoutes('/reports/administrative-hubs', request('GET'), response as never, 'corr', handlers()),
    false
  );
});

test('handleReportsRoutes exposes catalog, execution, export and schedules', async () => {
  const auditWrites: Array<{ action: string; entityType: string; entityId: string; riskLevel: string }> = [];
  const routeHandlers = handlers(undefined, undefined, {
    write: (event) => {
      auditWrites.push(event as never);
      return event;
    }
  });

  const catalogResponse = new MockResponse();
  await handleReportsRoutes('/reports/catalog', request('GET'), catalogResponse as never, 'corr-1', routeHandlers);
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
  assert.match(exportResponse.bodyJson<{ content: string }>().content, /Domínio,Indicador,Valor,Status/);

  const scheduleResponse = new MockResponse();
  await handleReportsRoutes(
    '/reports/schedules',
    request('POST', {
      reportId: 'administrative-executive',
      name: 'Diretoria diaria',
      frequency: 'daily',
      format: 'csv'
    }, '/reports/schedules'),
    scheduleResponse as never,
    'corr-4',
    routeHandlers
  );
  assert.equal(scheduleResponse.statusCode, 201);
  const schedule = scheduleResponse.bodyJson<{ id: string; createdAt: string; nextRunAt: string }>();
  assert.equal(schedule.nextRunAt, addUtcDays(schedule.createdAt, 1));
  await routeHandlers.reports.recordScheduleDeliveries('acc-reports-1' as never, schedule.id, {
    recipients: ['diretoria@cvg.local'],
    status: 'sent',
    format: 'csv',
    deliveredAt: schedule.nextRunAt
  });
  const [failedDelivery] = await routeHandlers.reports.recordScheduleDeliveries('acc-reports-1' as never, schedule.id, {
    executionId: execution.id,
    recipients: ['financeiro@cvg.local'],
    status: 'failed',
    format: 'csv',
    error: 'SMTP indisponivel',
    deliveredAt: schedule.nextRunAt
  });
  await routeHandlers.reports.recordScheduleDeliveries('acc-reports-1' as never, schedule.id, {
    executionId: execution.id,
    recipients: ['financeiro@cvg.local'],
    status: 'failed',
    format: 'csv',
    error: 'SMTP indisponivel',
    deliveredAt: addUtcDays(schedule.nextRunAt, 1)
  });

  const schedulesResponse = new MockResponse();
  await handleReportsRoutes('/reports/schedules', request('GET'), schedulesResponse as never, 'corr-5', routeHandlers);
  assert.equal(schedulesResponse.bodyJson<{ items: unknown[] }>().items.length, 1);

  const deliveriesResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/deliveries`,
    request('GET', undefined, `/reports/schedules/${schedule.id}/deliveries`),
    deliveriesResponse as never,
    'corr-5a',
    routeHandlers
  );
  const deliveries = deliveriesResponse.bodyJson<{ items: Array<{ recipient: string; status: string }> }>().items;
  assert.ok(deliveries.some((item) => item.recipient === 'diretoria@cvg.local' && item.status === 'sent'));

  const alertsResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/delivery-alerts`,
    request('GET', undefined, `/reports/schedules/${schedule.id}/delivery-alerts`),
    alertsResponse as never,
    'corr-5ab',
    routeHandlers
  );
  const alerts = alertsResponse.bodyJson<{ items: Array<{ recipient: string; failureCount: number; severity: string }> }>().items;
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.recipient, 'financeiro@cvg.local');
  assert.equal(alerts[0]?.failureCount, 2);
  assert.equal(alerts[0]?.severity, 'high');
  assert.ok(auditWrites.some((event) =>
    event.action === 'report_schedule_delivery_alerts_read' &&
    event.entityType === 'report-schedule-delivery-alert' &&
    event.entityId === schedule.id &&
    event.riskLevel === 'high'
  ));

  const retryResponse = new MockResponse();
  await handleReportsRoutes(
    `/reports/schedules/${schedule.id}/deliveries/${failedDelivery?.id}/retry`,
    request('POST', undefined, `/reports/schedules/${schedule.id}/deliveries/${failedDelivery?.id}/retry`),
    retryResponse as never,
    'corr-5aa',
    routeHandlers
  );
  const retriedDelivery = retryResponse.bodyJson<{ recipient: string; status: string; executionId: string }>();
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
    request('GET', undefined, `/reports/schedules/due?asOf=${encodeURIComponent(addUtcDays(schedule.createdAt, 1))}`),
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

  const execution = response.bodyJson<{ rowCount: number; rows: Array<{ totalCommissionAmount: number }> }>();
  assert.equal(execution.rowCount, 1);
  assert.equal(execution.rows[0]?.totalCommissionAmount, 20);
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

test('handleReportsRoutes validates payable filters before reading the source', async () => {
  await assert.rejects(
    () => handleReportsRoutes(
      '/reports/executions',
      request('POST', { reportId: 'financial-payables', filters: { status: 'settled' } }),
      new MockResponse() as never,
      'corr-invalid-status',
      handlers()
    ),
    /status must be open, partial, paid or cancelled/
  );

  await assert.rejects(
    () => handleReportsRoutes(
      '/reports/executions',
      request('POST', { reportId: 'financial-payables', filters: { dateFrom: '2026-02-30' } }),
      new MockResponse() as never,
      'corr-invalid-date',
      handlers()
    ),
    /dateFrom must be an ISO calendar date/
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
    () => handleReportsRoutes(
      `/reports/executions/${execution.id}`,
      request('GET', undefined, `/reports/executions/${execution.id}`),
      new MockResponse() as never,
      'corr-foreign-execution',
      foreignHandlers
    ),
    /Report execution not found/
  );
  await assert.rejects(
    () => handleReportsRoutes(
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
  let sourceRequest: {
    accountId?: unknown;
    status?: unknown;
    search?: unknown;
    page?: number;
    pageSize?: number;
  } | undefined;
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
    () => handleReportsRoutes(
      '/reports/executions',
      request('POST', { reportId: 'financial-receivables', filters: { status: 'paid' } }),
      new MockResponse() as never,
      'corr-invalid-receivable-status',
      handlers()
    ),
    /status must be open or settled/
  );

  await assert.rejects(
    () => handleReportsRoutes(
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
