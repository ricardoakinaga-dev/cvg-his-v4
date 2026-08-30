import assert from 'node:assert/strict';
import test from 'node:test';

import type { Logger } from '@cvg-his-v2/shared-logging';
import type { NotificationRepository } from '@cvg-his-v2/module-notifications';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { WebhooksService } from '@cvg-his-v2/module-webhooks';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';

import {
  createWorkerNotifications,
  createWorkerEventBus,
  createWorkerReports,
  runWorkerTick,
  runEventBusTick,
  runWebhookDeliveriesTick,
  runScheduledReportsTick,
  runFailedReportDeliveriesTick,
  resolveScheduledReportRows,
  type WorkerTickContext
} from './runner.js';

const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => mockLogger
};

const mockContext: WorkerTickContext = {
  service: 'test-worker',
  environment: 'test',
  correlationId: 'test-correlation-123',
  persistenceMode: 'database',
  databaseHealthy: true,
  databaseDetail: 'connected'
};

function createMockNotificationRepository(
  overrides: Partial<NotificationRepository> = {}
): NotificationRepository {
  return {
    createNotification: async () => {},
    updateNotification: async () => {},
    findNotificationById: async () => null,
    findNotifications: async () => [],
    createJob: async () => {},
    updateJob: async () => {},
    findJobById: async () => null,
    findJobs: async () => [],
    findQueuedJobs: async () => [],
    ...overrides
  };
}

test('createWorkerNotifications creates service with optional repository', () => {
  const notifications = createWorkerNotifications();
  assert.ok(notifications, 'Should create notifications service');
});

test('createWorkerNotifications creates service with provided repository', () => {
  const mockRepo = createMockNotificationRepository();

  const notifications = createWorkerNotifications({ notificationRepository: mockRepo });
  assert.ok(notifications, 'Should create notifications service with repo');
});

test('createWorkerEventBus creates service with optional repository', () => {
  const eventBus = createWorkerEventBus();
  assert.ok(eventBus, 'Should create event bus service');
});

test('createWorkerEventBus creates service with provided repository', () => {
  const mockRepo: OutboxRepository = {
    deliveryGuarantees: 'ephemeral',
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    claimPending: async () => [],
    renewClaim: async () => true,
    completeClaim: async () => true,
    retryClaim: async () => true,
    failClaim: async () => true,
    reprocess: async () => null,
    peekPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => [],
    countByStatus: async () => ({ pending: 0, retrying: 0, completed: 0, failed: 0, total: 0 })
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });
  assert.ok(eventBus, 'Should create event bus service with repo');
});

test('createWorkerReports creates service with optional repository', () => {
  const reports = createWorkerReports();
  assert.ok(reports, 'Should create reports service');
});

test('runWorkerTick handles empty notification queue', async () => {
  let infoCalled = false;
  let infoData: Record<string, unknown> = {};

  const logger: Logger = {
    ...mockLogger,
    info: (_msg, ctx) => {
      infoCalled = true;
      infoData = ctx ?? {};
    }
  };

  const mockRepo = createMockNotificationRepository({
    findQueuedJobs: async () => []
  });

  const notifications = createWorkerNotifications({ notificationRepository: mockRepo });

  await runWorkerTick(logger, mockContext, notifications);

  assert.equal(infoCalled, true, 'Logger info should be called');
  assert.equal(infoData.service, 'test-worker');
  assert.equal(infoData.correlationId, 'test-correlation-123');
  assert.equal(infoData.databaseHealthy, true);
});

test('runWorkerTick scopes queued notifications to the current account', async () => {
  let queriedAccountId: string | undefined;
  const notifications = createWorkerNotifications({
    notificationRepository: createMockNotificationRepository({
      findQueuedJobs: async (_limit, accountId) => {
        queriedAccountId = accountId;
        return [];
      }
    })
  });

  await runWorkerTick(
    mockLogger,
    { ...mockContext, accountId: 'account-worker-a' as never },
    notifications
  );

  assert.equal(queriedAccountId, 'account-worker-a');
});

test('runEventBusTick handles empty event queue', async () => {
  let infoCalled = false;
  let infoData: Record<string, unknown> = {};

  const logger: Logger = {
    ...mockLogger,
    info: (_msg, ctx) => {
      infoCalled = true;
      infoData = ctx ?? {};
    }
  };

  const mockRepo: OutboxRepository = {
    deliveryGuarantees: 'ephemeral',
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    claimPending: async () => [],
    renewClaim: async () => true,
    completeClaim: async () => true,
    retryClaim: async () => true,
    failClaim: async () => true,
    reprocess: async () => null,
    peekPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => [],
    countByStatus: async () => ({ pending: 0, retrying: 0, completed: 0, failed: 0, total: 0 })
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });

  await runEventBusTick(logger, mockContext, eventBus);

  assert.equal(infoCalled, true, 'Logger info should be called');
  assert.equal(infoData.service, 'test-worker');
  assert.equal(infoData.correlationId, 'test-correlation-123');
  assert.equal(infoData.databaseHealthy, true);
  assert.deepEqual(infoData.processedCorrelationIds, []);
});

test('runWebhookDeliveriesTick scopes the durable executor to the worker account', async () => {
  let receivedAccountId: string | undefined;
  let receivedWorkerId: string | undefined;
  const webhooks = {
    processPendingDeliveries: async (accountId: string, options: { readonly workerId: string }) => {
      receivedAccountId = accountId;
      receivedWorkerId = options.workerId;
      return { claimed: 2, delivered: 1, retried: 1, failed: 0, leaseLost: 0 };
    }
  } as unknown as WebhooksService;

  const result = await runWebhookDeliveriesTick(
    mockLogger,
    { ...mockContext, accountId: 'account-webhook-worker' as never },
    webhooks,
    'webhook-worker-test',
    2
  );

  assert.deepEqual(result, { claimed: 2, delivered: 1, retried: 1, failed: 0, leaseLost: 0 });
  assert.equal(receivedAccountId, 'account-webhook-worker');
  assert.equal(receivedWorkerId, 'webhook-worker-test');
});

test('runScheduledReportsTick handles empty due report queue', async () => {
  let infoData: Record<string, unknown> = {};

  const logger: Logger = {
    ...mockLogger,
    info: (_msg, ctx) => {
      infoData = ctx ?? {};
    }
  };

  const reports = createWorkerReports();
  await runScheduledReportsTick(
    logger,
    {
      ...mockContext,
      accountId: 'acc-worker-reports' as never,
      runAsUserId: 'user-worker-reports' as never
    },
    reports
  );

  assert.equal(infoData.service, 'test-worker');
  assert.equal(infoData.dueSchedules, 0);
  assert.equal(infoData.executedSchedules, 0);
});

test('runFailedReportDeliveriesTick retries failed deliveries with the same identity', async () => {
  let shouldFail = true;
  const calls: Array<{ readonly deliveryId: string; readonly idempotencyKey: string }> = [];
  const reports = createWorkerReports({
    reportDeliveryProvider: {
      deliver: async (input) => {
        calls.push({ deliveryId: input.deliveryId, idempotencyKey: input.idempotencyKey });
        if (shouldFail) throw new Error('controlled report provider failure');
      }
    }
  });
  const schedule = await reports.createSchedule(
    'acc-worker-reports' as never,
    'user-worker-reports' as never,
    {
      reportId: 'administrative-executive',
      name: 'Failed delivery retry',
      frequency: 'daily',
      format: 'csv',
      recipients: ['retry@example.test']
    }
  );
  await reports.claimDueSchedules(
    'acc-worker-reports' as never,
    schedule.nextRunAt,
    'worker-retry'
  );
  const execution = await reports.execute(
    'acc-worker-reports' as never,
    'user-worker-reports' as never,
    {
      reportId: schedule.reportId,
      rows: [{ domain: 'reports', metric: 'Executions', value: 1, status: 'tracked' }]
    }
  );
  const exported = await reports.exportExecution(
    'acc-worker-reports' as never,
    'user-worker-reports' as never,
    execution.id,
    'csv'
  );
  const firstAttempt = await reports.deliverExport(
    'acc-worker-reports' as never,
    schedule.id,
    execution.id,
    exported,
    schedule.recipients
  );
  assert.equal(firstAttempt.deliveries[0]?.status, 'failed');

  shouldFail = false;
  const result = await runFailedReportDeliveriesTick(
    mockLogger,
    {
      ...mockContext,
      accountId: 'acc-worker-reports' as never,
      runAsUserId: 'user-worker-reports' as never
    },
    reports
  );

  assert.deepEqual(result, { attempted: 1, retried: 1, failures: [] });
  assert.equal(
    reports.listScheduleDeliveries('acc-worker-reports' as never, schedule.id)[0]?.status,
    'sent'
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], calls[0]);
});

test('resolveScheduledReportRows returns non-empty rows for known recurring reports', async () => {
  const administrativeRows = await resolveScheduledReportRows({
    id: 'schedule-admin',
    accountId: 'acc-worker-reports' as never,
    reportId: 'administrative-executive',
    name: 'Diretoria diaria',
    frequency: 'daily',
    format: 'csv',
    filters: { dateFrom: '2026-05-01', dateTo: '2026-05-28' },
    recipients: ['diretoria@cvg.local', 'financeiro@cvg.local'],
    isActive: true,
    nextRunAt: '2026-05-29T10:00:00.000Z',
    lastRunAt: null,
    lastExecutionId: null,
    lastError: null,
    createdByUserId: 'user-worker-reports' as never,
    createdAt: '2026-05-28T10:00:00.000Z',
    updatedAt: '2026-05-28T10:00:00.000Z'
  });

  assert.ok(administrativeRows.length >= 3);
  assert.deepEqual(administrativeRows[0], {
    domain: 'reports',
    metric: 'Destinatarios configurados',
    value: 2,
    status: 'tracked'
  });

  const commissionRows = await resolveScheduledReportRows(
    {
      id: 'schedule-commissions',
      accountId: 'acc-worker-reports' as never,
      reportId: 'commission-calculations',
      name: 'Comissoes semanal',
      frequency: 'weekly',
      format: 'csv',
      filters: { status: 'reviewed' },
      recipients: ['rh@cvg.local'],
      isActive: true,
      nextRunAt: '2026-05-29T10:00:00.000Z',
      lastRunAt: '2026-05-22T10:00:00.000Z',
      lastExecutionId: 'rep-exec-last',
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-22T10:00:00.000Z'
    },
    {
      commissions: {
        list: async (_accountId, filters) =>
          [
            {
              accountId: 'acc-worker-reports' as never,
              id: 'calc-reviewed',
              number: 'COM-000042',
              periodStart: '2026-05-01',
              periodEnd: '2026-05-28',
              status: 'reviewed' as const,
              totalBaseAmount: 0,
              totalCommissionAmount: 0,
              lineCount: 0
            }
          ].filter((calculation) => !filters?.status || calculation.status === filters.status)
      }
    }
  );

  assert.deepEqual(commissionRows[0], {
    number: 'COM-000042',
    period: '2026-05-01..2026-05-28',
    status: 'reviewed',
    totalBaseAmount: 0,
    totalCommissionAmount: 0,
    lineCount: 0
  });
});

test('resolveScheduledReportRows enriches administrative executive report with operational sources', async () => {
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-admin-sources',
      accountId: 'acc-worker-reports' as never,
      reportId: 'administrative-executive',
      name: 'Diretoria diaria com fontes',
      frequency: 'daily',
      format: 'csv',
      filters: { dateFrom: '2026-05-01', dateTo: '2026-05-28' },
      recipients: ['diretoria@cvg.local'],
      isActive: true,
      nextRunAt: '2026-05-29T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    },
    {
      commercial: {
        getCommercialDashboard: async (_accountId, dateFrom, dateTo) => ({
          openSales: 3,
          closedToday: 8,
          grossRevenueToday: 1420.7,
          netRevenueToday: 1280.45,
          avgTicket: 160.05,
          salesByPaymentMethod: [],
          topProducts: [],
          topServices: [],
          quotesIssued: 2,
          quotesConverted: 1,
          lowStockAlerts: [],
          dateFrom,
          dateTo
        })
      },
      financial: {
        getIncomeStatement: async (_accountId, period) => ({
          generatedAt: '2026-05-28T10:00:00.000Z',
          period,
          revenue: {
            grossRevenue: 2000,
            realizedRevenue: 1500,
            outstandingReceivables: 500,
            receivableCount: 10,
            settledReceivableCount: 7,
            openReceivableCount: 3
          },
          expenses: {
            accruedExpenses: 700,
            paidExpenses: 300,
            outstandingPayables: 400,
            payableCount: 4,
            paidPayableCount: 2,
            openPayableCount: 2,
            byCategory: []
          },
          result: {
            realizedNetResult: 1200,
            accrualNetResult: 1300,
            grossMarginPercent: 65,
            cashConversionPercent: 75
          }
        })
      },
      cash: {
        findOpenRegister: async () => ({
          id: 'cash-register-1',
          accountId: 'acc-worker-reports' as never,
          openedByUserId: 'user-worker-reports' as never,
          closedByUserId: null,
          openingAmount: 100,
          closingAmount: null,
          expectedClosingAmount: null,
          difference: null,
          status: 'open',
          openedAt: '2026-05-28T08:00:00.000Z',
          closedAt: null,
          notes: null,
          createdAt: '2026-05-28T08:00:00.000Z',
          updatedAt: '2026-05-28T08:00:00.000Z'
        }),
        getCurrentBalance: async () => 650.5
      }
    }
  );

  assert.ok(
    rows.some(
      (row) =>
        row.domain === 'commercial' &&
        row.metric === 'Receita liquida comercial' &&
        row.value === 1280.45
    )
  );
  assert.ok(
    rows.some(
      (row) =>
        row.domain === 'financial' &&
        row.metric === 'Resultado liquido realizado' &&
        row.value === 1200
    )
  );
  assert.ok(
    rows.some(
      (row) =>
        row.domain === 'cash' && row.metric === 'Saldo do caixa aberto' && row.value === 650.5
    )
  );
});

test('resolveScheduledReportRows uses persisted commission calculations when source is available', async () => {
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-commissions-persisted',
      accountId: 'acc-worker-reports' as never,
      reportId: 'commission-calculations',
      name: 'Comissoes persistidas',
      frequency: 'weekly',
      format: 'csv',
      filters: { status: 'reviewed' },
      recipients: ['rh@cvg.local'],
      isActive: true,
      nextRunAt: '2026-05-29T10:00:00.000Z',
      lastRunAt: '2026-05-22T10:00:00.000Z',
      lastExecutionId: 'rep-exec-last',
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-22T10:00:00.000Z'
    },
    {
      commissions: {
        list: async (_accountId, filters) =>
          [
            {
              id: 'calc-reviewed',
              accountId: 'acc-worker-reports' as never,
              number: 'COM-000042',
              periodStart: '2026-05-01',
              periodEnd: '2026-05-28',
              status: 'reviewed' as const,
              totalBaseAmount: 3000,
              totalCommissionAmount: 450,
              createdByUserId: 'user-worker-reports' as never,
              reviewedByUserId: 'reviewer-1' as never,
              paidByUserId: null,
              cancelledByUserId: null,
              payableId: null,
              lineCount: 1
            },
            {
              id: 'calc-paid',
              accountId: 'acc-worker-reports' as never,
              number: 'COM-000041',
              periodStart: '2026-04-01',
              periodEnd: '2026-04-30',
              status: 'paid' as const,
              totalBaseAmount: 1000,
              totalCommissionAmount: 100,
              createdByUserId: 'user-worker-reports' as never,
              reviewedByUserId: null,
              paidByUserId: 'payer-1' as never,
              cancelledByUserId: null,
              payableId: null,
              lineCount: 0
            }
          ].filter((calculation) => !filters?.status || calculation.status === filters.status)
      }
    }
  );

  assert.deepEqual(rows, [
    {
      number: 'COM-000042',
      period: '2026-05-01..2026-05-28',
      status: 'reviewed',
      totalBaseAmount: 3000,
      totalCommissionAmount: 450,
      lineCount: 1
    }
  ]);
});

test('resolveScheduledReportRows reads bounded persisted NFS-e service invoices', async () => {
  let receivedAccountId: string | undefined;
  let receivedFilters: Record<string, unknown> | undefined;

  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-fiscal-service-invoices',
      accountId: 'acc-worker-reports' as never,
      reportId: 'fiscal-service-invoices',
      name: 'NFS-e mensal',
      frequency: 'monthly',
      format: 'csv',
      filters: {
        search: ' Cliente E2E ',
        status: 'draft',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      },
      recipients: ['financeiro@cvg.local'],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z'
    },
    {
      fiscal: {
        listNfseDocuments: async (accountId, filters) => {
          receivedAccountId = accountId;
          receivedFilters = filters as Record<string, unknown>;
          return [
            {
              id: 'nfse-worker-1',
              serie: '001',
              numero: 42,
              competencia: '2026-05-15',
              provider: 'abrasf',
              customer: { type: 'cpf', document: '12345678909', name: 'Cliente E2E' },
              services: [
                {
                  description: 'Consulta E2E',
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
              observations: 'worker',
              createdAt: '2026-05-15T10:00:00.000Z',
              status: 'draft',
              authorizationCode: undefined
            }
          ];
        }
      }
    }
  );

  assert.equal(receivedAccountId, 'acc-worker-reports');
  assert.deepEqual(receivedFilters, {
    search: 'cliente e2e',
    status: 'draft',
    competenciaFrom: '2026-05-01',
    competenciaTo: '2026-05-31',
    limit: 10001
  });
  assert.deepEqual(rows, [
    {
      documentId: 'nfse-worker-1',
      serie: '001',
      numero: 42,
      competencia: '2026-05-15',
      status: 'draft',
      customerName: 'Cliente E2E',
      customerDocument: '12345678909',
      provider: 'abrasf',
      serviceDescriptions: 'Consulta E2E',
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
      observations: 'worker',
      createdAt: '2026-05-15T10:00:00.000Z',
      authorizationCode: ''
    }
  ]);
});

test('resolveScheduledReportRows uses persisted cheque payments for scheduled reports', async () => {
  let receivedAccountId: string | undefined;
  let receivedFilters: { readonly dateFrom?: string; readonly dateTo?: string } | undefined;

  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-cheques-persisted',
      accountId: 'acc-worker-reports' as never,
      reportId: 'financial-cheques',
      name: 'Cheques diarios',
      frequency: 'daily',
      format: 'csv',
      filters: { dateFrom: '2026-05-01', dateTo: '2026-05-28' },
      recipients: ['finance@cvg.local'],
      isActive: true,
      nextRunAt: '2026-05-29T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    },
    {
      cheques: {
        listChequePayments: async (accountId, filters) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              id: 'payment-cheque-1',
              counterSaleId: 'sale-1',
              accountId,
              method: 'check',
              amount: 125.5,
              installments: 2,
              reference: 'CHK-001',
              notes: 'Cheque persistido',
              createdAt: '2026-05-12T14:30:00.000Z',
              saleNumber: 'COM-0001',
              saleStatus: 'closed'
            }
          ];
        }
      }
    }
  );

  assert.equal(receivedAccountId, 'acc-worker-reports');
  assert.deepEqual(receivedFilters, { dateFrom: '2026-05-01', dateTo: '2026-05-28' });
  assert.deepEqual(rows, [
    {
      paymentId: 'payment-cheque-1',
      counterSaleId: 'sale-1',
      saleNumber: 'COM-0001',
      saleStatus: 'closed',
      reference: 'CHK-001',
      amount: 125.5,
      installments: 2,
      recordedAt: '2026-05-12T14:30:00.000Z',
      notes: 'Cheque persistido'
    }
  ]);
});

test('resolveScheduledReportRows uses persisted financial payables with canonical filters and columns', async () => {
  let receivedAccountId: string | undefined;
  let receivedFilters: { readonly status?: string } | undefined;

  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-payables-persisted',
      accountId: 'acc-worker-reports' as never,
      reportId: 'financial-payables',
      name: 'Contas a pagar',
      frequency: 'daily',
      format: 'csv',
      filters: {
        status: 'partial',
        search: 'medicamentos',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      },
      recipients: [],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    },
    {
      payables: {
        listPayables: async (accountId, filters) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              id: 'payable-1',
              accountId,
              supplierName: 'Distribuidora Vet',
              description: 'Medicamentos de rotina',
              category: 'Farmácia',
              costCenterCode: 'CC-01',
              costCenterName: 'Clínica',
              issuedAt: '2026-05-01',
              dueAt: '2026-05-31',
              totalAmount: 1000,
              paidAmount: 250,
              outstandingAmount: 750,
              status: 'partial',
              sourceExpenseId: null,
              notes: 'Compra mensal',
              paymentMethod: 'bank_transfer',
              paymentReference: 'TED-001',
              reconciliationStatus: 'pending',
              reconciliationReference: null,
              createdByUserId: 'user-worker-reports' as never,
              paidByUserId: null,
              cancelledByUserId: null,
              reconciledByUserId: null,
              createdAt: '2026-05-01T10:00:00.000Z',
              updatedAt: '2026-05-01T10:00:00.000Z',
              paidAt: null,
              cancelledAt: null,
              reconciledAt: null
            },
            {
              id: 'payable-outside-date',
              accountId,
              supplierName: 'Distribuidora Vet',
              description: 'Medicamentos fora da janela',
              category: 'Farmácia',
              costCenterCode: 'CC-01',
              costCenterName: 'Clínica',
              issuedAt: '2026-06-01',
              dueAt: '2026-06-01',
              totalAmount: 500,
              paidAmount: 0,
              outstandingAmount: 500,
              status: 'partial',
              sourceExpenseId: null,
              notes: null,
              paymentMethod: null,
              paymentReference: null,
              reconciliationStatus: 'not_required',
              reconciliationReference: null,
              createdByUserId: 'user-worker-reports' as never,
              paidByUserId: null,
              cancelledByUserId: null,
              reconciledByUserId: null,
              createdAt: '2026-06-01T10:00:00.000Z',
              updatedAt: '2026-06-01T10:00:00.000Z',
              paidAt: null,
              cancelledAt: null,
              reconciledAt: null
            },
            {
              id: 'payable-other-account',
              accountId: 'acc-other' as never,
              supplierName: 'Distribuidora Vet',
              description: 'Medicamentos de outra conta',
              category: 'Farmácia',
              costCenterCode: 'CC-01',
              costCenterName: 'Clínica',
              issuedAt: '2026-05-01',
              dueAt: '2026-05-15',
              totalAmount: 400,
              paidAmount: 0,
              outstandingAmount: 400,
              status: 'partial',
              sourceExpenseId: null,
              notes: null,
              paymentMethod: null,
              paymentReference: null,
              reconciliationStatus: 'not_required',
              reconciliationReference: null,
              createdByUserId: 'user-worker-reports' as never,
              paidByUserId: null,
              cancelledByUserId: null,
              reconciledByUserId: null,
              createdAt: '2026-05-01T10:00:00.000Z',
              updatedAt: '2026-05-01T10:00:00.000Z',
              paidAt: null,
              cancelledAt: null,
              reconciledAt: null
            },
            {
              id: 'payable-wrong-status',
              accountId,
              supplierName: 'Distribuidora Vet',
              description: 'Medicamentos em outro status',
              category: 'Farmácia',
              costCenterCode: 'CC-01',
              costCenterName: 'Clínica',
              issuedAt: '2026-05-01',
              dueAt: '2026-05-15',
              totalAmount: 300,
              paidAmount: 0,
              outstandingAmount: 300,
              status: 'open',
              sourceExpenseId: null,
              notes: null,
              paymentMethod: null,
              paymentReference: null,
              reconciliationStatus: 'not_required',
              reconciliationReference: null,
              createdByUserId: 'user-worker-reports' as never,
              paidByUserId: null,
              cancelledByUserId: null,
              reconciledByUserId: null,
              createdAt: '2026-05-01T10:00:00.000Z',
              updatedAt: '2026-05-01T10:00:00.000Z',
              paidAt: null,
              cancelledAt: null,
              reconciledAt: null
            }
          ] as never;
        }
      }
    }
  );

  assert.equal(receivedAccountId, 'acc-worker-reports');
  assert.deepEqual(receivedFilters, { status: 'partial' });
  assert.deepEqual(rows, [
    {
      supplierName: 'Distribuidora Vet',
      description: 'Medicamentos de rotina',
      category: 'Farmácia',
      issuedAt: '2026-05-01',
      dueAt: '2026-05-31',
      totalAmount: 1000,
      paidAmount: 250,
      outstandingAmount: 750,
      status: 'partial',
      paymentMethod: 'bank_transfer',
      reconciliationStatus: 'pending'
    }
  ]);
});

test('resolveScheduledReportRows uses the canonical advance-payment source with exact filters and columns', async () => {
  let receivedAccountId: string | undefined;
  let receivedFilters: Record<string, unknown> | undefined;
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-advance-payments-persisted',
      accountId: 'acc-worker-reports' as never,
      reportId: 'financial-advance-payments',
      name: 'Pagamento antecipado',
      frequency: 'daily',
      format: 'csv',
      filters: {
        status: 'partially_compensated',
        search: '  maria  ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      },
      recipients: [],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    },
    {
      advancePayments: {
        list: async (accountId: string, filters: Record<string, unknown> | undefined) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              paymentId: 'advance-payment-1',
              ownerName: 'Maria Silva',
              documentId: 'DOC-1',
              issuedAt: '2026-05-15T00:00:00.000Z',
              originalAmount: 100,
              compensatedAmount: 25,
              balance: 75,
              origin: 'manual',
              status: 'partially_compensated',
              notes: 'Crédito de teste',
              ignoredInternalField: 'must not leak'
            }
          ] as never;
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-reports');
  assert.deepEqual(receivedFilters, {
    search: 'maria',
    status: 'partially_compensated',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      paymentId: 'advance-payment-1',
      ownerName: 'Maria Silva',
      documentId: 'DOC-1',
      issuedAt: '2026-05-15T00:00:00.000Z',
      originalAmount: 100,
      compensatedAmount: 25,
      balance: 75,
      origin: 'manual',
      status: 'partially_compensated',
      notes: 'Crédito de teste'
    }
  ]);
});

test('resolveScheduledReportRows validates advance-payment filters and bounds before execution', async () => {
  let queried = false;
  const source = {
    advancePayments: {
      list: async () => {
        queried = true;
        return [];
      }
    }
  };
  const schedule = {
    id: 'schedule-advance-payments-invalid-filter',
    accountId: 'acc-worker-reports' as never,
    reportId: 'financial-advance-payments' as const,
    name: 'Pagamento antecipado com filtro inválido',
    frequency: 'daily' as const,
    format: 'csv' as const,
    filters: {},
    recipients: [],
    isActive: true,
    nextRunAt: '2026-05-29T10:00:00.000Z',
    lastRunAt: null,
    lastExecutionId: null,
    lastError: null,
    createdByUserId: 'user-worker-reports' as never,
    createdAt: '2026-05-28T10:00:00.000Z',
    updatedAt: '2026-05-28T10:00:00.000Z'
  } as const;

  await assert.rejects(
    resolveScheduledReportRows({ ...schedule, filters: { status: 'settled' } }, source as never),
    /status must be one of available, partially_compensated, compensated/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { search: 'x'.repeat(201) } },
      source as never
    ),
    /search must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-02-30' } },
      source as never
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-01' } },
      source as never
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);
});

test('resolveScheduledReportRows rejects oversized advance-payment sources before persistence', async () => {
  const row = {
    paymentId: 'advance-payment-oversized',
    ownerName: 'Owner',
    documentId: '',
    issuedAt: '2026-05-15T00:00:00.000Z',
    originalAmount: 100,
    compensatedAmount: 0,
    balance: 100,
    origin: 'manual',
    status: 'available',
    notes: ''
  };
  await assert.rejects(
    resolveScheduledReportRows(
      {
        id: 'schedule-advance-payments-oversized',
        accountId: 'acc-worker-reports' as never,
        reportId: 'financial-advance-payments',
        name: 'Pagamento antecipado grande',
        frequency: 'daily',
        format: 'csv',
        filters: {},
        recipients: [],
        isActive: true,
        nextRunAt: '2026-05-29T10:00:00.000Z',
        lastRunAt: null,
        lastExecutionId: null,
        lastError: null,
        createdByUserId: 'user-worker-reports' as never,
        createdAt: '2026-05-28T10:00:00.000Z',
        updatedAt: '2026-05-28T10:00:00.000Z'
      },
      { advancePayments: { list: async () => Array.from({ length: 10_001 }, () => row) } } as never
    ),
    /maximum exportable page|10,000/
  );
});

test('resolveScheduledReportRows fails closed for missing or unsupported scheduled report sources', async () => {
  await assert.rejects(
    resolveScheduledReportRows({
      id: 'schedule-payables-without-source',
      accountId: 'acc-worker-reports' as never,
      reportId: 'financial-payables',
      name: 'Contas a pagar sem fonte',
      frequency: 'daily',
      format: 'csv',
      filters: {},
      recipients: [],
      isActive: true,
      nextRunAt: '2026-05-29T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    }),
    /Persisted payable report source is not configured/
  );

  await assert.rejects(
    resolveScheduledReportRows({
      id: 'schedule-advance-payments-without-source',
      accountId: 'acc-worker-reports' as never,
      reportId: 'financial-advance-payments',
      name: 'Pagamento antecipado sem fonte de worker',
      frequency: 'daily',
      format: 'csv',
      filters: {},
      recipients: [],
      isActive: true,
      nextRunAt: '2026-05-29T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    }),
    /Persisted advance-payment report source is not configured/
  );

  await assert.rejects(
    resolveScheduledReportRows({
      id: 'schedule-commissions-without-source',
      accountId: 'acc-worker-reports' as never,
      reportId: 'commission-calculations',
      name: 'Comissões sem fonte de worker',
      frequency: 'daily',
      format: 'csv',
      filters: {},
      recipients: [],
      isActive: true,
      nextRunAt: '2026-05-29T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    }),
    /Persisted commission report source is not configured/
  );
});

test('resolveScheduledReportRows rejects invalid payables filters before querying the source', async () => {
  let queried = false;
  const source = {
    payables: {
      listPayables: async () => {
        queried = true;
        return [];
      }
    }
  };
  const schedule = {
    id: 'schedule-payables-invalid-filter',
    accountId: 'acc-worker-reports' as never,
    reportId: 'financial-payables' as const,
    name: 'Contas a pagar com filtro inválido',
    frequency: 'daily' as const,
    format: 'csv' as const,
    filters: {},
    recipients: [],
    isActive: true,
    nextRunAt: '2026-05-29T10:00:00.000Z',
    lastRunAt: null,
    lastExecutionId: null,
    lastError: null,
    createdByUserId: 'user-worker-reports' as never,
    createdAt: '2026-05-28T10:00:00.000Z',
    updatedAt: '2026-05-28T10:00:00.000Z'
  } as const;

  await assert.rejects(
    resolveScheduledReportRows({ ...schedule, filters: { status: 'settled' } }, source),
    /status must be one of open, partial, paid, cancelled/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { search: 'x'.repeat(201) } } as never,
      source
    ),
    /search must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-01' } },
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);
});

test('resolveScheduledReportRows fails closed when a cheque source is unavailable', async () => {
  await assert.rejects(
    resolveScheduledReportRows({
      id: 'schedule-cheques-without-source',
      accountId: 'acc-worker-reports' as never,
      reportId: 'financial-cheques',
      name: 'Cheques sem fonte',
      frequency: 'daily',
      format: 'csv',
      filters: {},
      recipients: [],
      isActive: true,
      nextRunAt: '2026-05-29T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    }),
    /Persisted cheque report source is not configured/
  );
});

test('resolveScheduledReportRows rejects invalid scheduled cheque date filters', async () => {
  await assert.rejects(
    resolveScheduledReportRows(
      {
        id: 'schedule-cheques-invalid-filter',
        accountId: 'acc-worker-reports' as never,
        reportId: 'financial-cheques',
        name: 'Cheques com filtro inválido',
        frequency: 'daily',
        format: 'csv',
        filters: { dateFrom: 20260501 },
        recipients: [],
        isActive: true,
        nextRunAt: '2026-05-29T10:00:00.000Z',
        lastRunAt: null,
        lastExecutionId: null,
        lastError: null,
        createdByUserId: 'user-worker-reports' as never,
        createdAt: '2026-05-28T10:00:00.000Z',
        updatedAt: '2026-05-28T10:00:00.000Z'
      },
      { cheques: { listChequePayments: async () => [] } }
    ),
    /dateFrom must be an ISO calendar date/
  );
});

test('resolveScheduledReportRows rejects invalid calendar and inverted cheque dates', async () => {
  const schedule = {
    id: 'schedule-cheques-calendar-boundary',
    accountId: 'acc-worker-reports' as never,
    reportId: 'financial-cheques' as const,
    name: 'Cheques com limite de calendário',
    frequency: 'daily' as const,
    format: 'csv' as const,
    filters: {},
    recipients: [],
    isActive: true,
    nextRunAt: '2026-05-29T10:00:00.000Z',
    lastRunAt: null,
    lastExecutionId: null,
    lastError: null,
    createdByUserId: 'user-worker-reports' as never,
    createdAt: '2026-05-28T10:00:00.000Z',
    updatedAt: '2026-05-28T10:00:00.000Z'
  } as const;
  const source = { cheques: { listChequePayments: async () => [] } };

  await assert.rejects(
    resolveScheduledReportRows({ ...schedule, filters: { dateFrom: '2026-02-30' } }, source),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-01' } },
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
});

test('runWorkerTick uses default notifications when none provided', async () => {
  let infoCalled = false;

  const logger: Logger = {
    ...mockLogger,
    info: () => {
      infoCalled = true;
    }
  };

  await runWorkerTick(logger, mockContext);

  assert.equal(infoCalled, true, 'Should use default notifications');
});

test('runEventBusTick uses provided eventBus', async () => {
  let infoCalled = false;

  const logger: Logger = {
    ...mockLogger,
    info: () => {
      infoCalled = true;
    }
  };

  const mockRepo: OutboxRepository = {
    deliveryGuarantees: 'ephemeral',
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    claimPending: async () => [],
    renewClaim: async () => true,
    completeClaim: async () => true,
    retryClaim: async () => true,
    failClaim: async () => true,
    reprocess: async () => null,
    peekPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => [],
    countByStatus: async () => ({ pending: 0, retrying: 0, completed: 0, failed: 0, total: 0 })
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });

  await runEventBusTick(logger, mockContext, eventBus);

  assert.equal(infoCalled, true, 'Should use provided event bus');
});

test('runEventBusTick logs processed event correlation ids for async trace follow-up', async () => {
  let infoData: Record<string, unknown> = {};
  let claimed = false;

  const logger: Logger = {
    ...mockLogger,
    info: (_msg, ctx) => {
      infoData = ctx ?? {};
    }
  };

  const mockRepo: OutboxRepository = {
    deliveryGuarantees: 'ephemeral',
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    claimPending: async () => {
      if (claimed) return [];
      claimed = true;
      return [
        {
          event: {
            id: 'evt-1',
            accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as never,
            correlationId: 'corr-api-123' as CorrelationId,
            moduleName: 'notifications' as ModuleName,
            eventType: 'notification.sent',
            payload: {
              accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              _meta: {
                accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01'
              }
            },
            status: 'processing',
            attempts: 1,
            maxAttempts: 3,
            scheduledAt: new Date(Date.now() - 1000).toISOString(),
            processedAt: null,
            error: null,
            createdAt: new Date(Date.now() - 1000).toISOString()
          },
          leaseOwner: 'worker-test',
          leaseToken: '11111111-1111-1111-1111-111111111111',
          leaseVersion: 1,
          leaseExpiresAt: new Date(Date.now() + 60_000).toISOString()
        }
      ];
    },
    renewClaim: async () => true,
    completeClaim: async () => true,
    retryClaim: async () => true,
    failClaim: async () => true,
    reprocess: async () => null,
    peekPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => [],
    countByStatus: async () => ({ pending: 0, retrying: 0, completed: 0, failed: 0, total: 0 })
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });
  eventBus.subscribe(async () => {});
  await runEventBusTick(logger, mockContext, eventBus);

  assert.deepEqual(infoData.processedCorrelationIds, ['corr-api-123']);
  assert.deepEqual(infoData.processedEventIds, ['evt-1']);
});

test('WorkerTickContext type is correctly structured', () => {
  const ctx: WorkerTickContext = {
    service: 'my-service',
    environment: 'production',
    correlationId: 'corr-456',
    persistenceMode: 'database',
    databaseHealthy: true,
    databaseDetail: 'postgres://localhost:5432/his'
  };

  assert.equal(ctx.service, 'my-service');
  assert.equal(ctx.environment, 'production');
  assert.equal(ctx.correlationId, 'corr-456');
  assert.equal(ctx.persistenceMode, 'database');
  assert.equal(ctx.databaseHealthy, true);
});

test('WorkerTickContext supports in-memory persistence mode', () => {
  const ctx: WorkerTickContext = {
    service: 'my-service',
    environment: 'test',
    correlationId: 'corr-789',
    persistenceMode: 'in-memory',
    databaseHealthy: false,
    databaseDetail: 'DATABASE_URL not configured'
  };

  assert.equal(ctx.persistenceMode, 'in-memory');
  assert.equal(ctx.databaseHealthy, false);
});

test('resolveScheduledReportRows reads the bounded persisted cancelled-sales report', async () => {
  let receivedAccountId: string | undefined;
  let receivedFilters: Record<string, unknown> | undefined;
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-deleted-sales',
      accountId: 'acc-worker-reports' as never,
      reportId: 'commercial-deleted-sales',
      name: 'Comandas canceladas',
      frequency: 'daily',
      format: 'csv',
      filters: {
        search: '  cancelada  ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      },
      recipients: [],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-reports' as never,
      createdAt: '2026-05-28T10:00:00.000Z',
      updatedAt: '2026-05-28T10:00:00.000Z'
    },
    {
      commercialDeletedSales: {
        persistenceMode: 'database',
        listPersisted: async (accountId: string, filters: Record<string, unknown> | undefined) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              id: 'sale-cancelled-1',
              accountId: 'acc-worker-reports' as never,
              number: 'COM-CANCELADA-1',
              ownerId: 'owner-1',
              patientId: null,
              encounterId: null,
              queueEntryId: null,
              billingRecordId: null,
              status: 'cancelled',
              subtotal: 100,
              discountAmount: 10,
              total: 90,
              paidAmount: 0,
              balanceDue: 90,
              notes: 'Cancelada',
              openedByUserId: 'user-1' as never,
              closedByUserId: null,
              closedAt: null,
              createdAt: '2026-05-15T10:00:00.000Z',
              updatedAt: '2026-05-15T11:00:00.000Z'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-reports');
  assert.deepEqual(receivedFilters, {
    status: 'cancelled',
    search: 'cancelada',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31',
    limit: 10_001
  });
  assert.deepEqual(rows, [
    {
      number: 'COM-CANCELADA-1',
      status: 'cancelled',
      ownerId: 'owner-1',
      openedByUserId: 'user-1',
      createdAt: '2026-05-15T10:00:00.000Z',
      updatedAt: '2026-05-15T11:00:00.000Z',
      total: 90,
      discountAmount: 10,
      paidAmount: 0,
      balanceDue: 90,
      notes: 'Cancelada'
    }
  ]);
});

test('resolveScheduledReportRows rejects invalid deleted-sales filters before querying', async () => {
  let queried = false;
  const schedule = {
    accountId: 'acc-worker-reports',
    reportId: 'commercial-deleted-sales',
    filters: { dateFrom: '2026-02-30' }
  } as never;
  const source = {
    commercialDeletedSales: {
      persistenceMode: 'database',
      listPersisted: async () => {
        queried = true;
        return [];
      }
    }
  } as never;

  await assert.rejects(
    resolveScheduledReportRows(schedule, source),
    /dateFrom must be an ISO calendar date/
  );
  assert.equal(queried, false);

  await assert.rejects(
    resolveScheduledReportRows(
      {
        accountId: 'acc-worker-reports' as never,
        reportId: 'commercial-deleted-sales',
        filters: { search: 'x'.repeat(201) }
      } as never,
      source
    ),
    /search must be a string with at most 200 characters/
  );
  assert.equal(queried, false);
});

test('resolveScheduledReportRows rejects memory and oversized deleted-sales sources', async () => {
  const schedule = {
    accountId: 'acc-worker-reports',
    reportId: 'commercial-deleted-sales',
    filters: {}
  } as never;
  const memorySource = {
    commercialDeletedSales: {
      persistenceMode: 'in-memory',
      listPersisted: async () => []
    }
  } as never;
  await assert.rejects(
    resolveScheduledReportRows(schedule, memorySource),
    /database-backed counter-sale source/
  );

  const oversizedSource = {
    commercialDeletedSales: {
      persistenceMode: 'database',
      listPersisted: async () =>
        Array.from({ length: 10_001 }, () => ({
          accountId: 'acc-worker-reports',
          status: 'cancelled'
        }))
    }
  } as never;
  await assert.rejects(
    resolveScheduledReportRows(schedule, oversizedSource),
    /maximum exportable page of 10000/
  );
});

test('resolveScheduledReportRows maps the exact scheduled financial-receivables contract', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      accountId: 'acc-worker-receivables' as never,
      reportId: 'financial-receivables',
      filters: {
        status: 'settled',
        search: '  Paciente  ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    } as never,
    {
      receivables: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-receivables',
              patientName: 'Paciente A',
              ownerName: 'Tutor A',
              patientSpecies: 'Canino',
              encounterId: 'encounter-a',
              installmentNumber: 1,
              installmentLabel: 'Consulta',
              issuedAt: '2026-05-01T00:00:00.000Z',
              dueAt: '2026-05-15T00:00:00.000Z',
              settledAt: '2026-05-20T00:00:00.000Z',
              amountOriginal: 100,
              amountPaid: 100,
              amountOutstanding: 0,
              status: 'settled',
              financialStatus: 'paid',
              encounterStatus: 'closed',
              paymentCount: 2
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-receivables');
  assert.deepEqual(receivedFilters, {
    status: 'settled',
    search: 'paciente',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      patientName: 'Paciente A',
      ownerName: 'Tutor A',
      patientSpecies: 'Canino',
      encounterId: 'encounter-a',
      installmentNumber: 1,
      installmentLabel: 'Consulta',
      issuedAt: '2026-05-01T00:00:00.000Z',
      dueAt: '2026-05-15T00:00:00.000Z',
      settledAt: '2026-05-20T00:00:00.000Z',
      amountOriginal: 100,
      amountPaid: 100,
      amountOutstanding: 0,
      status: 'settled',
      financialStatus: 'paid',
      encounterStatus: 'closed',
      paymentCount: 2
    }
  ]);
});

test('resolveScheduledReportRows fails closed if a receivables source returns a foreign row', async () => {
  await assert.rejects(
    resolveScheduledReportRows(
      {
        accountId: 'acc-worker-receivables',
        reportId: 'financial-receivables',
        filters: {}
      } as never,
      {
        receivables: {
          list: async () => [
            {
              accountId: 'acc-foreign',
              patientName: 'Foreign Patient',
              ownerName: 'Foreign Owner',
              patientSpecies: 'Canino',
              encounterId: 'foreign-encounter',
              installmentNumber: 1,
              installmentLabel: 'Foreign',
              issuedAt: '2026-05-01T00:00:00.000Z',
              dueAt: '2026-05-15T00:00:00.000Z',
              settledAt: null,
              amountOriginal: 10,
              amountPaid: 0,
              amountOutstanding: 10,
              status: 'open',
              financialStatus: 'pending',
              encounterStatus: 'open',
              paymentCount: 0
            }
          ]
        }
      } as never
    ),
    /foreign account/
  );
});

test('resolveScheduledReportRows rejects invalid financial-receivables filters before querying', async () => {
  let queried = false;
  const source = {
    receivables: {
      list: async () => {
        queried = true;
        return [];
      }
    }
  } as never;

  await assert.rejects(
    resolveScheduledReportRows(
      {
        accountId: 'acc-worker-receivables',
        reportId: 'financial-receivables',
        filters: { status: 'paid' }
      } as never,
      source
    ),
    /status must be one of open, settled/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      {
        accountId: 'acc-worker-receivables',
        reportId: 'financial-receivables',
        filters: { search: 'x'.repeat(201) }
      } as never,
      source
    ),
    /search must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      {
        accountId: 'acc-worker-receivables',
        reportId: 'financial-receivables',
        filters: { dateFrom: '2026-02-30' }
      } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      {
        accountId: 'acc-worker-receivables',
        reportId: 'financial-receivables',
        filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' }
      } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);
});

test('resolveScheduledReportRows fails closed for missing and oversized financial-receivables sources', async () => {
  const schedule = {
    accountId: 'acc-worker-receivables',
    reportId: 'financial-receivables',
    filters: {}
  } as never;

  await assert.rejects(
    resolveScheduledReportRows(schedule),
    /Persisted receivable report source is not configured/
  );

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        receivables: {
          list: async () =>
            Array.from({ length: 10_001 }, () => ({ accountId: 'acc-worker-receivables' }))
        }
      } as never
    ),
    /maximum exportable page of 10000/
  );
});

test('resolveScheduledReportRows maps the exact scheduled registration-services contract', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      accountId: 'acc-worker-services' as never,
      reportId: 'registration-services',
      filters: {
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    } as never,
    {
      services: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-services',
              id: 'service-a',
              code: 'SRV-001',
              name: 'Consulta',
              description: 'Consulta padrão',
              basePrice: 120.5,
              active: true,
              createdAt: '2026-05-01T00:00:00.000Z'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-services');
  assert.deepEqual(receivedFilters, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      code: 'SRV-001',
      name: 'Consulta',
      description: 'Consulta padrão',
      basePrice: 120.5,
      status: 'active',
      createdAt: '2026-05-01T00:00:00.000Z'
    }
  ]);
});

test('resolveScheduledReportRows rejects invalid registration-services filters before querying', async () => {
  let queried = false;
  const source = {
    services: {
      list: async () => {
        queried = true;
        return [];
      }
    }
  } as never;

  await assert.rejects(
    resolveScheduledReportRows(
      {
        accountId: 'acc-worker-services',
        reportId: 'registration-services',
        filters: { dateFrom: '2026-02-30' }
      } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      {
        accountId: 'acc-worker-services',
        reportId: 'registration-services',
        filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' }
      } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);
});

test('resolveScheduledReportRows fails closed for missing, oversized and foreign registration-services sources', async () => {
  const schedule = {
    accountId: 'acc-worker-services',
    reportId: 'registration-services',
    filters: {}
  } as never;

  await assert.rejects(
    resolveScheduledReportRows(schedule),
    /Persisted services report source is not configured/
  );

  await assert.rejects(
    resolveScheduledReportRows(schedule, {
      services: {
        list: async () =>
          Array.from({ length: 10_001 }, () => ({
            accountId: 'acc-worker-services'
          }))
      }
    } as never),
    /maximum exportable page of 10000/
  );

  await assert.rejects(
    resolveScheduledReportRows(schedule, {
      services: {
        list: async () => [
          {
            accountId: 'acc-foreign',
            id: 'foreign-service',
            code: 'FOREIGN',
            name: 'Foreign',
            description: null,
            basePrice: 10,
            active: true,
            createdAt: '2026-05-01T00:00:00.000Z'
          }
        ]
      }
    } as never),
    /foreign account/
  );
});

test('resolveScheduledReportRows maps the exact scheduled registration-suppliers contract', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      accountId: 'acc-worker-suppliers' as never,
      reportId: 'registration-suppliers',
      filters: {
        search: '  Fornecedor  ',
        category: ' Tecnologia ',
        costCenterCode: ' CC-ATD ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    } as never,
    {
      suppliers: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-suppliers',
              id: 'DES-001',
              name: 'Fornecedor Alfa',
              kind: 'Despesa operacional',
              category: 'Tecnologia',
              costCenterCode: 'CC-ATD',
              costCenterName: 'Operação de Atendimento',
              description: 'Descrição persistida',
              createdAt: '2026-05-15T00:00:00.000Z',
              updatedAt: '2026-05-16T00:00:00.000Z',
              ignoredInternalField: 'must not leak'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-suppliers');
  assert.deepEqual(receivedFilters, {
    search: 'fornecedor',
    category: 'tecnologia',
    costCenterCode: 'cc-atd',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      code: 'DES-001',
      name: 'Fornecedor Alfa',
      kind: 'Despesa operacional',
      category: 'Tecnologia',
      costCenterCode: 'CC-ATD',
      costCenterName: 'Operação de Atendimento',
      description: 'Descrição persistida',
      createdAt: '2026-05-15T00:00:00.000Z',
      updatedAt: '2026-05-16T00:00:00.000Z'
    }
  ]);
});

test('resolveScheduledReportRows rejects invalid registration-suppliers filters before querying', async () => {
  let queried = false;
  const source = {
    suppliers: {
      list: async () => {
        queried = true;
        return [];
      }
    }
  } as never;
  const schedule = {
    accountId: 'acc-worker-suppliers',
    reportId: 'registration-suppliers',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { search: 'x'.repeat(201) } } as never,
      source
    ),
    /search must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows({ ...schedule, filters: { category: 42 } } as never, source),
    /category must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { costCenterCode: 'x'.repeat(201) } } as never,
      source
    ),
    /costCenterCode must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-02-30' } } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' } } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);
});

test('resolveScheduledReportRows fails closed for missing, oversized, foreign and malformed suppliers sources', async () => {
  const schedule = {
    accountId: 'acc-worker-suppliers',
    reportId: 'registration-suppliers',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows(schedule as never),
    /Persisted suppliers report source is not configured/
  );

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        suppliers: {
          list: async () =>
            Array.from({ length: 10_001 }, () => ({ accountId: 'acc-worker-suppliers' }))
        }
      } as never
    ),
    /maximum exportable page of 10000/
  );

  const validRow = {
    accountId: 'acc-worker-suppliers',
    id: 'DES-001',
    name: 'Fornecedor Alfa',
    kind: 'Despesa operacional',
    category: 'Tecnologia',
    costCenterCode: 'CC-ATD',
    costCenterName: 'Operação de Atendimento',
    description: 'Descrição persistida',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-16T00:00:00.000Z'
  };

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        suppliers: { list: async () => [{ ...validRow, accountId: 'acc-foreign' }] }
      } as never
    ),
    /foreign account/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        suppliers: { list: async () => [{ ...validRow, name: '' }] }
      } as never
    ),
    /malformed|invalid/i
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        suppliers: { list: async () => [{ ...validRow, createdAt: 'not-a-date' }] }
      } as never
    ),
    /malformed|invalid/i
  );
});

test('resolveScheduledReportRows maps the exact scheduled registration-owners contract', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      accountId: 'acc-worker-owners' as never,
      reportId: 'registration-owners',
      filters: {
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    } as never,
    {
      owners: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-owners',
              id: 'owner-a',
              documentId: 'DOC-OWNER-A',
              fullName: 'Tutor Alpha',
              primaryContact: 'WhatsApp: +55 11 99999-0001',
              city: 'São Paulo',
              financialResponsible: true,
              status: 'active',
              createdAt: '2026-05-15T00:00:00.000Z',
              updatedAt: '2026-05-16T00:00:00.000Z',
              administrativeNotes: 'must not leak'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-owners');
  assert.deepEqual(receivedFilters, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      documentId: 'DOC-OWNER-A',
      fullName: 'Tutor Alpha',
      primaryContact: 'WhatsApp: +55 11 99999-0001',
      city: 'São Paulo',
      financialResponsible: 'Sim',
      status: 'active',
      createdAt: '2026-05-15T00:00:00.000Z'
    }
  ]);
});

test('resolveScheduledReportRows rejects invalid registration-owners filters before querying', async () => {
  let queried = false;
  const source = {
    owners: {
      list: async () => {
        queried = true;
        return [];
      }
    }
  } as never;
  const schedule = {
    accountId: 'acc-worker-owners',
    reportId: 'registration-owners',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-02-30' } } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' } } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);
});

test('resolveScheduledReportRows fails closed for missing, oversized, foreign and malformed owners sources', async () => {
  const schedule = {
    accountId: 'acc-worker-owners',
    reportId: 'registration-owners',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows(schedule as never),
    /Persisted owners report source is not configured/
  );

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        owners: {
          list: async () =>
            Array.from({ length: 10_001 }, () => ({ accountId: 'acc-worker-owners' }))
        }
      } as never
    ),
    /maximum exportable page of 10000/
  );

  const validRow = {
    accountId: 'acc-worker-owners',
    id: 'owner-a',
    documentId: 'DOC-OWNER-A',
    fullName: 'Tutor Alpha',
    primaryContact: 'WhatsApp: +55 11 99999-0001',
    city: 'São Paulo',
    financialResponsible: true,
    status: 'active',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-16T00:00:00.000Z'
  };

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      { owners: { list: async () => [{ ...validRow, accountId: 'acc-foreign' }] } } as never
    ),
    /foreign account/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      { owners: { list: async () => [{ ...validRow, fullName: '' }] } } as never
    ),
    /malformed|invalid/i
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      { owners: { list: async () => [{ ...validRow, createdAt: 'not-a-date' }] } } as never
    ),
    /malformed|invalid/i
  );
});

test('resolveScheduledReportRows maps the exact scheduled registration-patients contract', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      accountId: 'acc-worker-patients' as never,
      reportId: 'registration-patients',
      filters: {
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    } as never,
    {
      patients: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-patients',
              id: 'patient-a',
              code: 'VETUS-PATIENT-A',
              name: 'Luna',
              species: 'canine',
              breed: 'SRD',
              sex: 'female',
              microchip: 'MC-A',
              status: 'active',
              createdAt: '2026-05-15T00:00:00.000Z'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-patients');
  assert.deepEqual(receivedFilters, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      code: 'VETUS-PATIENT-A',
      name: 'Luna',
      species: 'canine',
      breed: 'SRD',
      sex: 'female',
      microchip: 'MC-A',
      status: 'active',
      createdAt: '2026-05-15T00:00:00.000Z'
    }
  ]);
});

test('resolveScheduledReportRows rejects invalid registration-patients filters before querying', async () => {
  let queried = false;
  const source = {
    patients: {
      list: async () => {
        queried = true;
        return [];
      }
    }
  } as never;
  const schedule = {
    accountId: 'acc-worker-patients',
    reportId: 'registration-patients',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-02-30' } } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' } } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);
});

test('resolveScheduledReportRows fails closed for missing, oversized, foreign and malformed patients sources', async () => {
  const schedule = {
    accountId: 'acc-worker-patients',
    reportId: 'registration-patients',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows(schedule as never),
    /Persisted patients report source is not configured/
  );

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        patients: {
          list: async () =>
            Array.from({ length: 10_001 }, () => ({ accountId: 'acc-worker-patients' }))
        }
      } as never
    ),
    /maximum exportable page of 10000/
  );

  const validRow = {
    accountId: 'acc-worker-patients',
    id: 'patient-a',
    code: 'VETUS-PATIENT-A',
    name: 'Luna',
    species: 'canine',
    breed: 'SRD',
    sex: 'female',
    microchip: 'MC-A',
    status: 'active',
    createdAt: '2026-05-15T00:00:00.000Z'
  };

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      { patients: { list: async () => [{ ...validRow, accountId: 'acc-foreign' }] } } as never
    ),
    /foreign account/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      { patients: { list: async () => [{ ...validRow, name: '' }] } } as never
    ),
    /malformed|invalid/i
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      { patients: { list: async () => [{ ...validRow, microchip: 42 }] } } as never
    ),
    /malformed|invalid/i
  );
});

test('resolveScheduledReportRows reads persisted commission-calculation report rows through an async source', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-commissions-async-source',
      accountId: 'acc-worker-commissions' as never,
      reportId: 'commission-calculations',
      name: 'Comissões persistidas',
      frequency: 'weekly',
      format: 'csv',
      filters: { status: 'reviewed', dateFrom: '2026-05-01', dateTo: '2026-05-31' },
      recipients: ['rh@cvg.local'],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-commissions' as never,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z'
    },
    {
      commissions: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-commissions' as never,
              id: 'comm_calc_report_1',
              number: 'COM-000042',
              periodStart: '2026-05-01',
              periodEnd: '2026-05-28',
              status: 'reviewed',
              totalBaseAmount: 3000,
              totalCommissionAmount: 450,
              lineCount: 2
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-commissions');
  assert.deepEqual(receivedFilters, {
    status: 'reviewed',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      number: 'COM-000042',
      period: '2026-05-01..2026-05-28',
      status: 'reviewed',
      totalBaseAmount: 3000,
      totalCommissionAmount: 450,
      lineCount: 2
    }
  ]);
});

test('resolveScheduledReportRows fails closed for invalid commission filters and source rows', async () => {
  let queried = false;
  const validRow = {
    accountId: 'acc-worker-commissions',
    id: 'comm_calc_report_1',
    number: 'COM-000042',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-28',
    status: 'reviewed' as const,
    totalBaseAmount: 3000,
    totalCommissionAmount: 450,
    lineCount: 2
  };
  const source = {
    commissions: {
      list: async () => {
        queried = true;
        return [validRow];
      }
    }
  } as never;
  const schedule = {
    accountId: 'acc-worker-commissions',
    reportId: 'commission-calculations',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows({ ...schedule, filters: { status: 'approved' } } as never, source),
    /status must be one of draft, reviewed, paid, cancelled/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-02-30' } } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' } } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        commissions: {
          list: async () => Array.from({ length: 10_001 }, () => validRow)
        }
      } as never
    ),
    /maximum exportable page of 10000/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        commissions: {
          list: async () => [{ ...validRow, accountId: 'acc-foreign' }]
        }
      } as never
    ),
    /foreign account/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        commissions: {
          list: async () => [{ ...validRow, periodEnd: '2026-02-30' }]
        }
      } as never
    ),
    /malformed periodEnd|ISO calendar date/i
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        commissions: {
          list: async () => [{ ...validRow, totalCommissionAmount: '450.00' }]
        }
      } as never
    ),
    /malformed totalCommissionAmount/i
  );
});

test('resolveScheduledReportRows reads persisted inventory-products rows through an async source', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-inventory-products-async-source',
      accountId: 'acc-worker-inventory-products' as never,
      reportId: 'inventory-products',
      name: 'Produtos de estoque persistidos',
      frequency: 'weekly',
      format: 'csv',
      filters: { search: '  SURGICAL  ', dateFrom: '2026-05-01', dateTo: '2026-05-31' },
      recipients: ['estoque@cvg.local'],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-inventory-products' as never,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z'
    } as never,
    {
      inventoryProducts: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-inventory-products',
              id: 'inventory-item-1',
              sku: 'MED-SURG-001',
              name: 'Surgical saline',
              unit: 'bottle',
              onHandQuantity: 12.5,
              reorderLevel: 5,
              unitCostAmount: 4.2,
              createdAt: '2026-05-15T23:30:00.000Z',
              updatedAt: '2026-05-16T00:00:00.000Z'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-inventory-products');
  assert.deepEqual(receivedFilters, {
    search: 'surgical',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      sku: 'MED-SURG-001',
      name: 'Surgical saline',
      unit: 'bottle',
      onHandQuantity: 12.5,
      reorderLevel: 5,
      unitCostAmount: 4.2,
      createdAt: '2026-05-15T23:30:00.000Z',
      updatedAt: '2026-05-16T00:00:00.000Z'
    }
  ]);
});

test('resolveScheduledReportRows fails closed for invalid inventory-products filters and source rows', async () => {
  let queried = false;
  const validRow = {
    accountId: 'acc-worker-inventory-products',
    id: 'inventory-item-1',
    sku: 'MED-SURG-001',
    name: 'Surgical saline',
    unit: 'bottle',
    onHandQuantity: 12.5,
    reorderLevel: 5,
    unitCostAmount: 4.2,
    createdAt: '2026-05-15T23:30:00.000Z',
    updatedAt: '2026-05-16T00:00:00.000Z'
  };
  const source = {
    inventoryProducts: {
      list: async () => {
        queried = true;
        return [validRow];
      }
    }
  } as never;
  const schedule = {
    accountId: 'acc-worker-inventory-products',
    reportId: 'inventory-products',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows({ ...schedule, filters: { search: 42 } } as never, source),
    /search must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-02-30' } } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' } } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryProducts: {
          list: async () => Array.from({ length: 10_001 }, () => validRow)
        }
      } as never
    ),
    /maximum exportable page of 10000/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryProducts: {
          list: async () => [{ ...validRow, accountId: 'acc-foreign' }]
        }
      } as never
    ),
    /foreign account/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryProducts: {
          list: async () => [{ ...validRow, unitCostAmount: '4.20' }]
        }
      } as never
    ),
    /malformed|invalid/i
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryProducts: {
          list: async () => [{ ...validRow, createdAt: 'not-a-date' }]
        }
      } as never
    ),
    /malformed|invalid/i
  );
});

test('resolveScheduledReportRows maps the exact scheduled inventory-stock contract', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-inventory-stock-async-source',
      accountId: 'acc-worker-inventory-stock' as never,
      reportId: 'inventory-stock',
      name: 'Estoque persistido',
      frequency: 'weekly',
      format: 'json',
      filters: { search: '  LOW  ', dateFrom: '2026-05-01', dateTo: '2026-05-31' },
      recipients: [],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-inventory-stock' as never,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z'
    } as never,
    {
      inventoryStock: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-inventory-stock',
              id: 'inventory-stock-item-1',
              sku: 'SKU-STOCK-001',
              name: 'Low stock item',
              unit: 'bottle',
              onHandQuantity: 1.25,
              reorderLevel: 2,
              unitCostAmount: 4.56,
              stockValue: 5.7,
              reorderStatus: 'below_reorder_level',
              createdAt: '2026-05-15T23:30:00.000Z',
              updatedAt: '2026-05-16T00:00:00.000Z'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-inventory-stock');
  assert.deepEqual(receivedFilters, {
    search: 'low',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      sku: 'SKU-STOCK-001',
      name: 'Low stock item',
      unit: 'bottle',
      onHandQuantity: 1.25,
      reorderLevel: 2,
      unitCostAmount: 4.56,
      stockValue: 5.7,
      reorderStatus: 'below_reorder_level',
      createdAt: '2026-05-15T23:30:00.000Z',
      updatedAt: '2026-05-16T00:00:00.000Z'
    }
  ]);
});

test('resolveScheduledReportRows fails closed for invalid inventory-stock filters and source rows', async () => {
  let queried = false;
  const validRow = {
    accountId: 'acc-worker-inventory-stock',
    id: 'inventory-stock-item-1',
    sku: 'SKU-STOCK-001',
    name: 'Low stock item',
    unit: 'bottle',
    onHandQuantity: 1.25,
    reorderLevel: 2,
    unitCostAmount: 4.56,
    stockValue: 5.7,
    reorderStatus: 'below_reorder_level',
    createdAt: '2026-05-15T23:30:00.000Z',
    updatedAt: '2026-05-16T00:00:00.000Z'
  };
  const source = {
    inventoryStock: {
      list: async () => {
        queried = true;
        return [validRow];
      }
    }
  } as never;
  const schedule = {
    accountId: 'acc-worker-inventory-stock',
    reportId: 'inventory-stock',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows({ ...schedule, filters: { search: 42 } } as never, source),
    /search must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-02-30' } } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' } } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);

  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryStock: { list: async () => Array.from({ length: 10_001 }, () => validRow) }
      } as never
    ),
    /maximum exportable page of 10000/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      { inventoryStock: { list: async () => [{ ...validRow, accountId: 'acc-foreign' }] } } as never
    ),
    /foreign account/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      { inventoryStock: { list: async () => [{ ...validRow, stockValue: '5.70' }] } } as never
    ),
    /malformed|invalid/i
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryStock: { list: async () => [{ ...validRow, reorderStatus: 'adequate' }] }
      } as never
    ),
    /malformed|invalid/i
  );
});

test('resolveScheduledReportRows maps the exact scheduled inventory-movements contract', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-inventory-movements-async-source',
      accountId: 'acc-worker-inventory-movements' as never,
      reportId: 'inventory-movements',
      name: 'Movimentações persistidas',
      frequency: 'weekly',
      format: 'json',
      filters: { search: '  MED  ', dateFrom: '2026-05-01', dateTo: '2026-05-31' },
      recipients: [],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-inventory-movements' as never,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z'
    } as never,
    {
      inventoryMovements: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-inventory-movements',
              movementId: 'movement-1',
              occurredAt: '2026-05-10T10:00:00.000Z',
              movementType: 'outbound',
              sku: 'MED-001',
              name: 'Dipirona',
              unit: 'ampola',
              quantityDelta: -2,
              balanceBefore: 10,
              balanceAfter: 8,
              unitCostAmount: 12.5,
              reason: 'Consumo assistencial',
              reference: '',
              recordedByUserId: 'user-1'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-inventory-movements');
  assert.deepEqual(receivedFilters, {
    search: 'med',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      movementId: 'movement-1',
      occurredAt: '2026-05-10T10:00:00.000Z',
      movementType: 'outbound',
      sku: 'MED-001',
      name: 'Dipirona',
      unit: 'ampola',
      quantityDelta: -2,
      balanceBefore: 10,
      balanceAfter: 8,
      unitCostAmount: 12.5,
      reason: 'Consumo assistencial',
      reference: '',
      recordedByUserId: 'user-1'
    }
  ]);
});

test('resolveScheduledReportRows fails closed for invalid inventory-movements filters and source rows', async () => {
  let queried = false;
  const validRow = {
    accountId: 'acc-worker-inventory-movements',
    movementId: 'movement-1',
    occurredAt: '2026-05-10T10:00:00.000Z',
    movementType: 'outbound',
    sku: 'MED-001',
    name: 'Dipirona',
    unit: 'ampola',
    quantityDelta: -2,
    balanceBefore: 10,
    balanceAfter: 8,
    unitCostAmount: 12.5,
    reason: 'Consumo assistencial',
    reference: '',
    recordedByUserId: 'user-1'
  };
  const source = {
    inventoryMovements: {
      list: async () => {
        queried = true;
        return [validRow];
      }
    }
  } as never;
  const schedule = {
    accountId: 'acc-worker-inventory-movements',
    reportId: 'inventory-movements',
    filters: {}
  };

  await assert.rejects(
    resolveScheduledReportRows({ ...schedule, filters: { search: 42 } } as never, source),
    /search must be a string with at most 200 characters/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-02-30' } } as never,
      source
    ),
    /dateFrom must be an ISO calendar date/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      { ...schedule, filters: { dateFrom: '2026-06-01', dateTo: '2026-05-31' } } as never,
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);

  await assert.rejects(
    resolveScheduledReportRows(schedule as never),
    /Persisted inventory-movements report source is not configured/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryMovements: {
          list: async () => Array.from({ length: 10_001 }, () => validRow)
        }
      } as never
    ),
    /maximum exportable page of 10000/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryMovements: {
          list: async () => [{ ...validRow, accountId: 'acc-foreign' }]
        }
      } as never
    ),
    /foreign account/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryMovements: {
          list: async () => [{ ...validRow, quantityDelta: 'negative' }]
        }
      } as never
    ),
    /malformed|invalid/i
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryMovements: {
          list: async () => [{ ...validRow, occurredAt: 'not-a-date' }]
        }
      } as never
    ),
    /malformed|invalid/i
  );
});

test('resolveScheduledReportRows maps the exact scheduled inventory-invoices contract', async () => {
  let receivedAccountId: unknown;
  let receivedFilters: unknown;
  const rows = await resolveScheduledReportRows(
    {
      id: 'schedule-inventory-invoices-async-source',
      accountId: 'acc-worker-inventory-invoices' as never,
      reportId: 'inventory-invoices',
      name: 'Entradas de compras com NF',
      frequency: 'weekly',
      format: 'json',
      filters: {
        search: '  FORNECEDOR  ',
        status: ' RECEIVED ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      },
      recipients: [],
      isActive: true,
      nextRunAt: '2026-06-01T10:00:00.000Z',
      lastRunAt: null,
      lastExecutionId: null,
      lastError: null,
      createdByUserId: 'user-worker-inventory-invoices' as never,
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z'
    } as never,
    {
      inventoryInvoices: {
        list: async (accountId: unknown, filters: unknown) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              accountId: 'acc-worker-inventory-invoices',
              purchaseId: 'purchase-invoice-1',
              invoiceNumber: 'NF-001',
              supplierName: 'Fornecedor Alpha',
              status: 'received',
              totalAmount: 125.5,
              receivedAmount: 125.5,
              payableId: 'payable-1',
              createdByUserId: 'user-1',
              approvedByUserId: 'approver-1',
              createdAt: '2026-05-31T23:59:59.999Z',
              updatedAt: '2026-06-01T00:00:00.000Z',
              receivedAt: '2026-06-01T00:00:00.000Z'
            }
          ];
        }
      }
    } as never
  );

  assert.equal(receivedAccountId, 'acc-worker-inventory-invoices');
  assert.deepEqual(receivedFilters, {
    search: 'fornecedor',
    status: 'received',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });
  assert.deepEqual(rows, [
    {
      purchaseId: 'purchase-invoice-1',
      invoiceNumber: 'NF-001',
      supplierName: 'Fornecedor Alpha',
      status: 'received',
      totalAmount: 125.5,
      receivedAmount: 125.5,
      payableId: 'payable-1',
      createdByUserId: 'user-1',
      approvedByUserId: 'approver-1',
      createdAt: '2026-05-31T23:59:59.999Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      receivedAt: '2026-06-01T00:00:00.000Z'
    }
  ]);
});

test('resolveScheduledReportRows fails closed for invalid inventory-invoices filters and source rows', async () => {
  let queried = false;
  const validRow = {
    accountId: 'acc-worker-inventory-invoices',
    purchaseId: 'purchase-invoice-1',
    invoiceNumber: 'NF-001',
    supplierName: 'Fornecedor Alpha',
    status: 'received',
    totalAmount: 125.5,
    receivedAmount: 125.5,
    payableId: 'payable-1',
    createdByUserId: 'user-1',
    approvedByUserId: 'approver-1',
    createdAt: '2026-05-31T23:59:59.999Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    receivedAt: '2026-06-01T00:00:00.000Z'
  };
  const source = {
    inventoryInvoices: {
      list: async () => {
        queried = true;
        return [validRow];
      }
    }
  } as never;
  const schedule = {
    accountId: 'acc-worker-inventory-invoices',
    reportId: 'inventory-invoices',
    filters: {}
  };

  for (const filters of [
    { search: 42 },
    { status: 'unknown' },
    { status: null },
    { status: '' },
    { status: '   ' },
    { dateFrom: '2026-02-30' },
    { dateFrom: '2026-06-01', dateTo: '2026-05-31' }
  ]) {
    await assert.rejects(
      resolveScheduledReportRows({ ...schedule, filters } as never, source),
      /search must be a string|status must be|dateFrom must be/i
    );
  }
  assert.equal(queried, false);

  await assert.rejects(
    resolveScheduledReportRows(schedule as never),
    /Persisted inventory-invoices report source is not configured/
  );
  await assert.rejects(
    resolveScheduledReportRows(
      schedule as never,
      {
        inventoryInvoices: {
          list: async () => Array.from({ length: 10_001 }, () => validRow)
        }
      } as never
    ),
    /maximum exportable page of 10000/
  );

  for (const row of [
    { ...validRow, accountId: 'acc-foreign' },
    { ...validRow, receivedAmount: '125.50' },
    { ...validRow, receivedAmount: 126 },
    { ...validRow, status: 'invalid' },
    { ...validRow, receivedAt: 'not-a-date' }
  ]) {
    await assert.rejects(
      resolveScheduledReportRows(
        schedule as never,
        { inventoryInvoices: { list: async () => [row] } } as never
      ),
      /foreign account|malformed|invalid/i
    );
  }
});
