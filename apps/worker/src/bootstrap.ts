import {
  createDatabaseClient,
  checkDatabaseHealth,
  checkDatabaseRuntimeRole,
  closeDatabaseClient,
  createTenantUnitOfWork,
  getDatabaseClient,
  getPool,
  type TenantUnitOfWork
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
}

export interface WorkerBootstrapResult {
  readonly databaseHealthy: boolean;
  readonly databaseDetail: string;
  readonly accountIds?: readonly string[];
  readonly loadAccountIds?: () => Promise<readonly string[]>;
  readonly notificationRepository?: NotificationRepository;
  readonly outboxRepository?: OutboxRepository;
  readonly unitOfWork?: TenantUnitOfWork;
  readonly reportRepository?: ReportRepository;
  readonly reportSources?: AdministrativeExecutiveReportSources;
}

async function loadPersistedAccountIds(): Promise<readonly string[]> {
  const configured = (process.env.WORKER_ACCOUNT_IDS ?? process.env.WORKER_ACCOUNT_ID ?? '')
    .split(',')
    .map((accountId) => accountId.trim())
    .filter(Boolean);
  if (configured.length > 0) return [...new Set(configured)];
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WORKER_ACCOUNT_IDS is required in production');
  }
  const result = await getPool().query<{ id: string }>('SELECT id::text FROM accounts ORDER BY id');
  return result.rows.map((account) => account.id);
}

export async function bootstrapWorkerServices(
  options: WorkerBootstrapOptions = {}
): Promise<WorkerBootstrapResult> {
  if (!options.databaseUrl) {
    return {
      databaseHealthy: false,
      databaseDetail: 'DATABASE_URL not configured'
    };
  }

  try {
    createDatabaseClient(options.databaseUrl);
    const health = await checkDatabaseHealth();

    if (!health.healthy) {
      return {
        databaseHealthy: false,
        databaseDetail: health.detail
      };
    }
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_REQUIRE_RLS_ROLE === '1') {
      const runtimeRole = await checkDatabaseRuntimeRole();
      if (!runtimeRole.safe) {
        throw new Error(`Unsafe PostgreSQL runtime role: ${runtimeRole.detail}`);
      }
    }

    const db = getDatabaseClient();
    const deliveryGuarantees = await getPool().query<{ ready: boolean }>(
      `SELECT
         to_regclass('public.idempotency_requests') IS NOT NULL
         AND to_regclass('public.inbox_events') IS NOT NULL
         AND (
           SELECT COUNT(*) = 5 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'outbox_events'
             AND column_name = ANY(ARRAY[
               'lease_owner', 'lease_token', 'lease_version', 'lease_expires_at', 'last_attempt_at'
             ])
         )
         AND (
           SELECT COUNT(*) = 6
           FROM pg_constraint
           WHERE conname = ANY(ARRAY[
             'idempotency_requests_scope_unique',
             'inbox_events_delivery_unique',
             'outbox_events_status_check',
             'outbox_events_attempts_check',
             'outbox_events_lease_version_check',
             'outbox_events_lease_state_check'
           ])
         )
         AND (
           SELECT COUNT(*) = 3 AND BOOL_AND(c.relrowsecurity AND c.relforcerowsecurity)
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname = ANY(ARRAY['outbox_events', 'inbox_events', 'idempotency_requests'])
         )
         AND (
           SELECT COUNT(*) = 3
           FROM pg_policies
           WHERE schemaname = 'public'
             AND policyname = ANY(ARRAY[
               'outbox_events_tenant_isolation',
               'inbox_events_tenant_isolation',
               'idempotency_requests_tenant_isolation'
             ])
         ) AS ready`
    );
    const deliveryGuaranteesReady = deliveryGuarantees.rows[0]?.ready === true;
    if (!deliveryGuaranteesReady && process.env.NODE_ENV === 'production') {
      throw new Error('Worker delivery guarantee schema is not ready');
    }
    const accountIds = await loadPersistedAccountIds();
    logger.info('Worker database connection established', {
      detail: health.detail
    });

    return {
      databaseHealthy: true,
      databaseDetail: health.detail,
      accountIds,
      loadAccountIds: loadPersistedAccountIds,
      notificationRepository: new DatabaseNotificationRepository(db),
      outboxRepository: new DatabaseOutboxRepository(),
      unitOfWork: deliveryGuaranteesReady ? createTenantUnitOfWork(getPool()) : undefined,
      reportRepository: new DatabaseReportRepository(),
      reportSources: createDatabaseReportSources()
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_REQUIRE_RLS_ROLE === '1') {
      throw error;
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
