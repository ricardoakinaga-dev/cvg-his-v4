import {
  createDatabaseClient,
  checkDatabaseHealth,
  closeDatabaseClient,
  getDatabaseClient,
  getPool,
  assertDatabaseRuntimeRoleIsRestricted
} from '@cvg-his-v2/shared-database';
import { DatabaseNotificationRepository } from '@cvg-his-v2/module-notifications';
import { DatabaseOutboxRepository } from '@cvg-his-v2/module-event-bus';
import { DatabaseReportRepository } from '@cvg-his-v2/module-reports';
import { CashService, DatabaseCashRepository } from '@cvg-his-v2/module-cash';
import { CommissionsService, DatabaseCommissionRepository } from '@cvg-his-v2/module-commissions';
import { CounterSalesService, DatabaseCounterSalesRepository } from '@cvg-his-v2/module-counter-sales';
import {
  DatabaseEncounterFinancialRepository,
  DatabaseFinancialPayablesRepository,
  FinancialIncomeStatementService
} from '@cvg-his-v2/module-financial';
import type { NotificationRepository } from '@cvg-his-v2/module-notifications';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { ReportRepository } from '@cvg-his-v2/module-reports';
import { createLogger } from '@cvg-his-v2/shared-logging';
import type { AdministrativeExecutiveReportSources } from './runner.js';

const logger = createLogger('worker-bootstrap');

export interface WorkerBootstrapOptions {
  readonly databaseUrl?: string;
  readonly environment?: string;
}

export interface WorkerBootstrapResult {
  readonly databaseHealthy: boolean;
  readonly databaseDetail: string;
  readonly notificationRepository?: NotificationRepository;
  readonly outboxRepository?: OutboxRepository;
  readonly reportRepository?: ReportRepository;
  readonly reportSources?: AdministrativeExecutiveReportSources;
}

export async function bootstrapWorkerServices(
  options: WorkerBootstrapOptions = {}
): Promise<WorkerBootstrapResult> {
  const productionLike = new Set(['production', 'staging', 'prod', 'stage']).has(
    (options.environment ?? '').trim().toLowerCase()
  );

  if (!options.databaseUrl) {
    if (productionLike) {
      throw new Error(
        'Production-like worker startup requires DATABASE_URL; in-memory services are not an allowed fallback'
      );
    }

    return {
      databaseHealthy: false,
      databaseDetail: 'DATABASE_URL not configured'
    };
  }

  try {
    createDatabaseClient(options.databaseUrl);
    const health = await checkDatabaseHealth();

    if (!health.healthy) {
      if (productionLike) {
        throw new Error(
          `Production-like worker startup cannot continue with an unhealthy database: ${health.detail}`
        );
      }

      return {
        databaseHealthy: false,
        databaseDetail: health.detail
      };
    }

    if (productionLike) {
      const runtimeRole = await assertDatabaseRuntimeRoleIsRestricted(getPool());
      logger.info('Worker PostgreSQL runtime role passed least-privilege validation', {
        roleName: runtimeRole.roleName,
        ownedTenantTables: runtimeRole.ownedTenantTables
      });
    }

    const db = getDatabaseClient();
    logger.info('Worker database connection established', {
      detail: health.detail
    });

    return {
      databaseHealthy: true,
      databaseDetail: health.detail,
      notificationRepository: new DatabaseNotificationRepository(db),
      outboxRepository: new DatabaseOutboxRepository(),
      reportRepository: new DatabaseReportRepository(),
      reportSources: createDatabaseReportSources()
    };
  } catch (error) {
    if (productionLike) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Production-like worker database bootstrap failed: ${detail}`);
    }

    return {
      databaseHealthy: false,
      databaseDetail: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function createDatabaseReportSources(): AdministrativeExecutiveReportSources {
  return {
    commercial: new CounterSalesService({
      repository: new DatabaseCounterSalesRepository()
    }),
    financial: new FinancialIncomeStatementService({
      receivables: new DatabaseEncounterFinancialRepository(),
      payables: new DatabaseFinancialPayablesRepository()
    }),
    cash: new CashService({
      repository: new DatabaseCashRepository()
    }),
    commissions: new CommissionsService({
      repository: new DatabaseCommissionRepository()
    })
  };
}

export async function shutdownWorkerServices(): Promise<void> {
  await closeDatabaseClient();
}
