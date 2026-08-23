import { createHash } from 'node:crypto';
import { hostname } from 'node:os';
import type { Pool } from 'pg';

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
import {
  CounterSalesService,
  DatabaseCounterSalesRepository
} from '@cvg-his-v2/module-counter-sales';
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
import {
  PixPaymentDispatchConfigurationError,
  PixPaymentDispatcher
} from './jobs/pix-payment-dispatcher.js';
import { DatabasePixPaymentDispatchRepository } from './pix-payment-dispatch-repository.js';
import { LocalPixPaymentDispatchProvider } from './jobs/local-pix-payment-dispatch-provider.js';
import { PixProviderSettlementConsumer } from './jobs/pix-provider-settlement-consumer.js';
import { DatabasePixProviderEventDeliveryRepository } from './jobs/pix-provider-event-delivery-repository.js';

const logger = createLogger('worker-bootstrap');

export interface WorkerBootstrapOptions {
  readonly databaseUrl?: string;
  readonly environment?: string;
  readonly allowSyntheticPixProvider?: boolean;
  readonly pixDispatcherWorkerId?: string;
  readonly pixProviderSettlementEnabled?: boolean;
  readonly pixSettlementWorkerId?: string;
}

export const PIX_PAYMENT_DISPATCH_DEFAULTS = Object.freeze({
  leaseMs: 60_000,
  retryBaseMs: 1_000,
  providerTimeoutMs: 15_000
});

export const PIX_PROVIDER_SETTLEMENT_DEFAULTS = Object.freeze({ leaseMs: 60_000 });

export interface SyntheticPixPaymentDispatchRuntimeOptions {
  readonly allowSyntheticProviders: boolean;
  readonly environment?: string;
  readonly pool: Pool;
  readonly workerId?: string;
}

export interface WorkerPixPaymentDispatchRuntime {
  readonly dispatcher: PixPaymentDispatcher;
  readonly providerKey: 'local-pix';
  readonly workerId: string;
  readonly leaseMs: number;
  readonly retryBaseMs: number;
  readonly providerTimeoutMs: number;
}

export interface PixProviderSettlementRuntimeOptions {
  readonly enabled: boolean;
  readonly allowSyntheticProviders: boolean;
  readonly pool: Pool;
  readonly workerId?: string;
}

export interface WorkerPixProviderSettlementRuntime {
  readonly consumer: PixProviderSettlementConsumer;
  readonly workerId: string;
  readonly leaseMs: number;
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
  readonly pixPaymentDispatch?: WorkerPixPaymentDispatchRuntime;
  readonly pixProviderSettlement?: WorkerPixProviderSettlementRuntime;
}

function normalizedEnvironment(environment?: string): string {
  const normalized = (environment ?? process.env.NODE_ENV ?? 'production').trim().toLowerCase();
  if (!normalized || normalized.includes('\0') || Buffer.byteLength(normalized, 'utf8') > 32) {
    throw new Error('PIX dispatcher environment is invalid');
  }
  return normalized;
}

function assertSyntheticEnvironment(environment?: string): string {
  const normalized = normalizedEnvironment(environment);
  const processEnvironment = process.env.NODE_ENV
    ? normalizedEnvironment(process.env.NODE_ENV)
    : normalized;
  if (
    normalized === 'production' ||
    normalized === 'prod' ||
    processEnvironment === 'production' ||
    processEnvironment === 'prod'
  ) {
    throw new PixPaymentDispatchConfigurationError(
      'SYNTHETIC_PIX_PROVIDER_DISABLED',
      'Synthetic PIX providers require an explicit non-production environment'
    );
  }
  return normalized;
}

function resolvePixDispatcherWorkerId(workerId?: string): string {
  if (workerId !== undefined) {
    if (
      workerId !== workerId.trim() ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(workerId) ||
      Buffer.byteLength(workerId, 'utf8') > 160
    ) {
      throw new Error('PIX dispatcher worker id is invalid');
    }
    return workerId;
  }

  const hostFingerprint = createHash('sha256')
    .update(hostname(), 'utf8')
    .digest('hex')
    .slice(0, 16);
  return `pix-dispatch-${hostFingerprint}-${process.pid}`;
}

function resolvePixSettlementWorkerId(workerId?: string): string {
  if (workerId !== undefined) {
    if (
      workerId !== workerId.trim() ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(workerId) ||
      Buffer.byteLength(workerId, 'utf8') > 160
    ) {
      throw new Error('PIX settlement worker id is invalid');
    }
    return workerId;
  }
  const hostFingerprint = createHash('sha256')
    .update(hostname(), 'utf8')
    .digest('hex')
    .slice(0, 16);
  return `pix-settlement-${hostFingerprint}-${process.pid}`;
}

export function createPixProviderSettlementRuntime(
  options: PixProviderSettlementRuntimeOptions
): WorkerPixProviderSettlementRuntime | undefined {
  if (!options.enabled) return undefined;
  if (!options.allowSyntheticProviders) {
    throw new PixPaymentDispatchConfigurationError(
      'SYNTHETIC_PIX_PROVIDER_DISABLED',
      'Local PIX settlement requires the explicit synthetic provider capability'
    );
  }
  const workerId = resolvePixSettlementWorkerId(options.workerId);
  const consumer = new PixProviderSettlementConsumer(
    new DatabasePixProviderEventDeliveryRepository(options.pool),
    {
      workerId,
      leaseMs: PIX_PROVIDER_SETTLEMENT_DEFAULTS.leaseMs,
      allowSyntheticProviders: true
    }
  );
  return Object.freeze({ consumer, workerId, ...PIX_PROVIDER_SETTLEMENT_DEFAULTS });
}

export function createSyntheticPixPaymentDispatchRuntime(
  options: SyntheticPixPaymentDispatchRuntimeOptions
): WorkerPixPaymentDispatchRuntime | undefined {
  if (options.allowSyntheticProviders !== true) return undefined;
  const environment = assertSyntheticEnvironment(options.environment);
  const workerId = resolvePixDispatcherWorkerId(options.workerId);
  const provider = new LocalPixPaymentDispatchProvider();
  const dispatcher = new PixPaymentDispatcher(
    new DatabasePixPaymentDispatchRepository(options.pool),
    provider,
    {
      workerId,
      ...PIX_PAYMENT_DISPATCH_DEFAULTS,
      allowSyntheticProviders: true,
      environment
    }
  );
  return Object.freeze({
    dispatcher,
    providerKey: provider.key,
    workerId,
    ...PIX_PAYMENT_DISPATCH_DEFAULTS
  });
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
  if (options.allowSyntheticPixProvider === true) {
    assertSyntheticEnvironment(options.environment);
  }
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
      reportSources: createDatabaseReportSources(),
      pixPaymentDispatch: createSyntheticPixPaymentDispatchRuntime({
        allowSyntheticProviders: options.allowSyntheticPixProvider === true,
        environment: options.environment,
        pool: getPool(),
        workerId: options.pixDispatcherWorkerId
      }),
      pixProviderSettlement: createPixProviderSettlementRuntime({
        enabled: options.pixProviderSettlementEnabled === true,
        allowSyntheticProviders: options.allowSyntheticPixProvider === true,
        pool: getPool(),
        workerId: options.pixSettlementWorkerId
      })
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
