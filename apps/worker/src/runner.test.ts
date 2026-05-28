import assert from 'node:assert/strict';
import test from 'node:test';

import type { Logger } from '@cvg-his-v2/shared-logging';
import type { NotificationRepository } from '@cvg-his-v2/module-notifications';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';

import {
  createWorkerNotifications,
  createWorkerEventBus,
  createWorkerReports,
  runWorkerTick,
  runEventBusTick,
  runScheduledReportsTick,
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

function createMockNotificationRepository(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
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
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    findPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => []
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
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    findPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => []
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });

  await runEventBusTick(logger, mockContext, eventBus);

  assert.equal(infoCalled, true, 'Logger info should be called');
  assert.equal(infoData.service, 'test-worker');
  assert.equal(infoData.correlationId, 'test-correlation-123');
  assert.equal(infoData.databaseHealthy, true);
  assert.deepEqual(infoData.processedCorrelationIds, []);
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
  await runScheduledReportsTick(logger, {
    ...mockContext,
    accountId: 'acc-worker-reports' as never,
    runAsUserId: 'user-worker-reports' as never
  }, reports);

  assert.equal(infoData.service, 'test-worker');
  assert.equal(infoData.dueSchedules, 0);
  assert.equal(infoData.executedSchedules, 0);
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

  const commissionRows = await resolveScheduledReportRows({
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
  });

  assert.deepEqual(commissionRows[0], {
    number: 'SCHEDULE-schedule-commissions',
    period: '2026-05-22T10:00:00.000Z..2026-05-29T10:00:00.000Z',
    status: 'reviewed',
    totalBaseAmount: 0,
    totalCommissionAmount: 0,
    lineCount: 1
  });
});

test('resolveScheduledReportRows enriches administrative executive report with operational sources', async () => {
  const rows = await resolveScheduledReportRows({
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
  }, {
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
  });

  assert.ok(rows.some((row) => row.domain === 'commercial' && row.metric === 'Receita liquida comercial' && row.value === 1280.45));
  assert.ok(rows.some((row) => row.domain === 'financial' && row.metric === 'Resultado liquido realizado' && row.value === 1200));
  assert.ok(rows.some((row) => row.domain === 'cash' && row.metric === 'Saldo do caixa aberto' && row.value === 650.5));
});

test('resolveScheduledReportRows uses persisted commission calculations when source is available', async () => {
  const rows = await resolveScheduledReportRows({
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
  }, {
    commissions: {
      listCalculations: () => [
        {
          id: 'calc-reviewed',
          accountId: 'acc-worker-reports' as never,
          number: 'COM-000042',
          periodStart: '2026-05-01',
          periodEnd: '2026-05-28',
          status: 'reviewed',
          totalBaseAmount: 3000,
          totalCommissionAmount: 450,
          createdByUserId: 'user-worker-reports' as never,
          reviewedByUserId: 'reviewer-1' as never,
          paidByUserId: null,
          cancelledByUserId: null,
          createdAt: '2026-05-28T09:00:00.000Z',
          updatedAt: '2026-05-28T09:05:00.000Z',
          reviewedAt: '2026-05-28T09:05:00.000Z',
          paidAt: null,
          cancelledAt: null,
          notes: null,
          lines: [
            {
              id: 'line-1',
              accountId: 'acc-worker-reports' as never,
              calculationId: 'calc-reviewed',
              staffId: 'staff-1',
              staffName: 'Dra. Ana',
              department: 'Clinica',
              jobTitle: 'Veterinaria',
              itemKind: 'service',
              sourceType: 'billing_item',
              sourceId: 'bill-item-1',
              sourceDescription: 'Consulta',
              baseAmount: 3000,
              occurredAt: '2026-05-20',
              ruleId: 'rule-1',
              percentage: 15,
              commissionAmount: 450
            }
          ]
        },
        {
          id: 'calc-paid',
          accountId: 'acc-worker-reports' as never,
          number: 'COM-000041',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          status: 'paid',
          totalBaseAmount: 1000,
          totalCommissionAmount: 100,
          createdByUserId: 'user-worker-reports' as never,
          reviewedByUserId: null,
          paidByUserId: 'payer-1' as never,
          cancelledByUserId: null,
          createdAt: '2026-04-30T09:00:00.000Z',
          updatedAt: '2026-04-30T09:05:00.000Z',
          reviewedAt: null,
          paidAt: '2026-04-30T09:05:00.000Z',
          cancelledAt: null,
          notes: null,
          lines: []
        }
      ]
    }
  });

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
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    findPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => []
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });

  await runEventBusTick(logger, mockContext, eventBus);

  assert.equal(infoCalled, true, 'Should use provided event bus');
});

test('runEventBusTick logs processed event correlation ids for async trace follow-up', async () => {
  let infoData: Record<string, unknown> = {};

  const logger: Logger = {
    ...mockLogger,
    info: (_msg, ctx) => {
      infoData = ctx ?? {};
    }
  };

  const mockRepo: OutboxRepository = {
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    findPending: async () => [
      {
        id: 'evt-1',
        correlationId: 'corr-api-123' as CorrelationId,
        moduleName: 'notifications' as ModuleName,
        eventType: 'notification.sent',
        payload: {
          _meta: {
            traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01'
          }
        },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        scheduledAt: new Date(Date.now() - 1000).toISOString(),
        processedAt: null,
        error: null,
        createdAt: new Date(Date.now() - 1000).toISOString()
      }
    ],
    findFailed: async () => [],
    findByCorrelationId: async () => []
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });
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
