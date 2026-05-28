import {
  NotificationsService,
  type NotificationRepository
} from '@cvg-his-v2/module-notifications';
import { EventBusService } from '@cvg-his-v2/module-event-bus';
import { ReportsService, type ReportRepository, type ReportScheduleSummary } from '@cvg-his-v2/module-reports';
import type { Logger } from '@cvg-his-v2/shared-logging';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { runScheduledReportJob } from './jobs/scheduled-report-job.js';

export interface WorkerTickContext {
  readonly service: string;
  readonly environment: string;
  readonly correlationId: string;
  readonly persistenceMode: 'database' | 'in-memory';
  readonly databaseHealthy: boolean;
  readonly databaseDetail: string;
}

export interface WorkerOptions {
  readonly notificationRepository?: NotificationRepository;
  readonly eventBusRepository?: OutboxRepository;
  readonly reportRepository?: ReportRepository;
}

export interface AdministrativeExecutiveReportSources {
  readonly commercial?: {
    getCommercialDashboard(
      accountId: AccountId,
      dateFrom?: string,
      dateTo?: string
    ): Promise<{
      readonly openSales: number;
      readonly closedToday: number;
      readonly grossRevenueToday: number;
      readonly netRevenueToday: number;
      readonly avgTicket: number;
    }>;
  };
  readonly financial?: {
    getIncomeStatement(
      accountId: AccountId,
      period: { readonly dateFrom?: string; readonly dateTo?: string }
    ): Promise<{
      readonly revenue: {
        readonly realizedRevenue: number;
        readonly outstandingReceivables: number;
        readonly openReceivableCount: number;
      };
      readonly expenses: {
        readonly paidExpenses: number;
        readonly outstandingPayables: number;
        readonly openPayableCount: number;
      };
      readonly result: {
        readonly realizedNetResult: number;
        readonly grossMarginPercent: number | null;
      };
    }>;
  };
  readonly cash?: {
    findOpenRegister(accountId: AccountId): Promise<{ readonly id: string } | null>;
    getCurrentBalance(registerId: string): Promise<number>;
  };
  readonly commissions?: {
    listCalculations(accountId: AccountId): readonly {
      readonly number: string;
      readonly periodStart: string;
      readonly periodEnd: string;
      readonly status: string;
      readonly totalBaseAmount: number;
      readonly totalCommissionAmount: number;
      readonly lines: readonly unknown[];
    }[];
  };
}

export function createWorkerNotifications(options?: WorkerOptions): NotificationsService {
  return new NotificationsService({
    notificationRepository: options?.notificationRepository
  });
}

export function createWorkerEventBus(options?: WorkerOptions): EventBusService {
  return new EventBusService(options?.eventBusRepository);
}

export function createWorkerReports(options?: WorkerOptions): ReportsService {
  return new ReportsService({
    repository: options?.reportRepository
  });
}

export async function resolveScheduledReportRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources = {}
): Promise<readonly Record<string, unknown>[]> {
  if (schedule.reportId === 'administrative-executive') {
    return [
      ...await resolveAdministrativeExecutiveSourceRows(schedule, sources),
      {
        domain: 'reports',
        metric: 'Destinatarios configurados',
        value: schedule.recipients.length,
        status: schedule.recipients.length > 0 ? 'tracked' : 'attention'
      },
      {
        domain: 'reports',
        metric: 'Agendamento ativo',
        value: schedule.isActive ? 1 : 0,
        status: schedule.isActive ? 'active' : 'paused'
      },
      {
        domain: 'reports',
        metric: 'Ultima falha',
        value: schedule.lastError ? 1 : 0,
        status: schedule.lastError ? 'attention' : 'tracked'
      }
    ];
  }

  if (schedule.reportId === 'commission-calculations') {
    const persistedRows = resolveCommissionCalculationRows(schedule, sources);
    if (persistedRows) return persistedRows;

    return [
      {
        number: `SCHEDULE-${schedule.id}`,
        period: `${schedule.lastRunAt ?? schedule.createdAt}..${schedule.nextRunAt}`,
        status: typeof schedule.filters.status === 'string' && schedule.filters.status ? schedule.filters.status : 'scheduled',
        totalBaseAmount: 0,
        totalCommissionAmount: 0,
        lineCount: schedule.recipients.length
      }
    ];
  }

  return [];
}

function resolveCommissionCalculationRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): readonly Record<string, unknown>[] | null {
  if (!sources.commissions) return null;

  const period = reportPeriodFromSchedule(schedule);
  const status = typeof schedule.filters.status === 'string' ? schedule.filters.status : '';

  return sources.commissions
    .listCalculations(schedule.accountId)
    .filter((calculation) => !status || calculation.status === status)
    .filter((calculation) =>
      (!period.dateFrom || calculation.periodEnd >= period.dateFrom)
      && (!period.dateTo || calculation.periodStart <= period.dateTo)
    )
    .map((calculation) => ({
      number: calculation.number,
      period: `${calculation.periodStart}..${calculation.periodEnd}`,
      status: calculation.status,
      totalBaseAmount: calculation.totalBaseAmount,
      totalCommissionAmount: calculation.totalCommissionAmount,
      lineCount: calculation.lines.length
    }));
}

async function resolveAdministrativeExecutiveSourceRows(
  schedule: ReportScheduleSummary,
  sources: AdministrativeExecutiveReportSources
): Promise<readonly Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  const period = reportPeriodFromSchedule(schedule);

  if (sources.commercial) {
    try {
      const commercial = await sources.commercial.getCommercialDashboard(
        schedule.accountId,
        period.dateFrom,
        period.dateTo
      );
      rows.push(
        {
          domain: 'commercial',
          metric: 'Receita liquida comercial',
          value: commercial.netRevenueToday,
          status: commercial.netRevenueToday > 0 ? 'tracked' : 'attention'
        },
        {
          domain: 'commercial',
          metric: 'Comandas fechadas',
          value: commercial.closedToday,
          status: commercial.closedToday > 0 ? 'tracked' : 'attention'
        },
        {
          domain: 'commercial',
          metric: 'Comandas abertas',
          value: commercial.openSales,
          status: commercial.openSales > 0 ? 'attention' : 'tracked'
        },
        {
          domain: 'commercial',
          metric: 'Ticket medio',
          value: commercial.avgTicket,
          status: commercial.avgTicket > 0 ? 'tracked' : 'attention'
        }
      );
    } catch (error) {
      rows.push(sourceUnavailableRow('commercial', error));
    }
  }

  if (sources.financial) {
    try {
      const financial = await sources.financial.getIncomeStatement(schedule.accountId, period);
      rows.push(
        {
          domain: 'financial',
          metric: 'Resultado liquido realizado',
          value: financial.result.realizedNetResult,
          status: financial.result.realizedNetResult >= 0 ? 'tracked' : 'attention'
        },
        {
          domain: 'financial',
          metric: 'Recebiveis em aberto',
          value: financial.revenue.outstandingReceivables,
          status: financial.revenue.outstandingReceivables > 0 ? 'attention' : 'tracked'
        },
        {
          domain: 'financial',
          metric: 'Pagaveis em aberto',
          value: financial.expenses.outstandingPayables,
          status: financial.expenses.outstandingPayables > 0 ? 'attention' : 'tracked'
        },
        {
          domain: 'financial',
          metric: 'Margem bruta percentual',
          value: financial.result.grossMarginPercent ?? 0,
          status: financial.result.grossMarginPercent !== null ? 'tracked' : 'attention'
        }
      );
    } catch (error) {
      rows.push(sourceUnavailableRow('financial', error));
    }
  }

  if (sources.cash) {
    try {
      const openRegister = await sources.cash.findOpenRegister(schedule.accountId);
      if (openRegister) {
        rows.push({
          domain: 'cash',
          metric: 'Saldo do caixa aberto',
          value: await sources.cash.getCurrentBalance(openRegister.id),
          status: 'tracked'
        });
      } else {
        rows.push({
          domain: 'cash',
          metric: 'Caixa aberto',
          value: 0,
          status: 'attention'
        });
      }
    } catch (error) {
      rows.push(sourceUnavailableRow('cash', error));
    }
  }

  return rows;
}

function reportPeriodFromSchedule(
  schedule: ReportScheduleSummary
): { readonly dateFrom?: string; readonly dateTo?: string } {
  return {
    dateFrom: typeof schedule.filters.dateFrom === 'string' ? schedule.filters.dateFrom : undefined,
    dateTo: typeof schedule.filters.dateTo === 'string' ? schedule.filters.dateTo : undefined
  };
}

function sourceUnavailableRow(domain: string, error: unknown): Record<string, unknown> {
  return {
    domain,
    metric: 'Fonte indisponivel',
    value: 0,
    status: 'attention',
    detail: error instanceof Error ? error.message : String(error)
  };
}

const defaultNotifications = createWorkerNotifications();
const defaultEventBus = createWorkerEventBus();
const defaultReports = createWorkerReports();

export async function runWorkerTick(
  logger: Logger,
  context: WorkerTickContext,
  notifications: NotificationsService = defaultNotifications
) {
  const processed = await notifications.processPendingFromRepository({ limit: 25 });

  logger.info('worker notification tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    processedNotifications: processed.length,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy,
    databaseDetail: context.databaseDetail
  });
}

export async function runEventBusTick(
  logger: Logger,
  context: WorkerTickContext,
  eventBus: EventBusService = defaultEventBus
) {
  const processed = await eventBus.processPending(25);

  logger.info('worker event bus tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    processedEvents: processed.length,
    processedEventIds: processed.map((event) => event.id).slice(0, 10),
    processedCorrelationIds: Array.from(new Set(processed.map((event) => event.correlationId))).slice(0, 10),
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });
}

export async function runScheduledReportsTick(
  logger: Logger,
  context: WorkerTickContext & { readonly accountId: AccountId; readonly runAsUserId: UserId },
  reports: ReportsService = defaultReports,
  reportSources: AdministrativeExecutiveReportSources = {}
) {
  const result = await runScheduledReportJob(reports, {
    accountId: context.accountId,
    runAsUserId: context.runAsUserId,
    correlationId: context.correlationId,
    environment: context.environment,
    logger,
    resolveRows: (schedule) => resolveScheduledReportRows(schedule, reportSources)
  });

  logger.info('worker scheduled report tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    dueSchedules: result.dueSchedules,
    executedSchedules: result.executedSchedules,
    exportedSchedules: result.exportedSchedules,
    failures: result.failures.length,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });
}
