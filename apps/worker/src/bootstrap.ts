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
  FinancialIncomeStatementService,
  EncounterFinancialService
} from '@cvg-his-v2/module-financial';
import { BillingService, DatabaseBillingRepository } from '@cvg-his-v2/module-billing';
import {
  EncountersService,
  DatabaseEncounterRepository,
  DatabaseEncounterTimelineRepository
} from '@cvg-his-v2/module-encounters';
import { OwnersService, DatabaseOwnerRepository } from '@cvg-his-v2/module-owners';
import {
  PatientsService,
  DatabasePatientRepository,
  DatabaseOwnerPatientLinkRepository,
  DatabasePatientMergeRepository
} from '@cvg-his-v2/module-patients';
import { DatabaseWebhookRepository, WebhooksService } from '@cvg-his-v2/module-webhooks';
import {
  DatabaseCardTransactionRepository,
  DatabasePixTransactionRepository
} from '@cvg-his-v2/module-payments';
import type { WorkerEventConsumerRuntime } from './consumer-composition.js';
import { createWorkerEventConsumerRuntime } from './consumer-composition.js';
import type { NotificationRepository } from '@cvg-his-v2/module-notifications';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { ReportRepository } from '@cvg-his-v2/module-reports';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { isProductionLikeEnvironment } from '@cvg-his-v2/shared-config';
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
  readonly countReconciliationRequired: (accountId: string) => Promise<number>;
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
  readonly eventConsumers?: WorkerEventConsumerRuntime;
  readonly eventConsumerSchemaReady?: boolean;
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
  const repository = new DatabasePixProviderEventDeliveryRepository(options.pool);
  const consumer = new PixProviderSettlementConsumer(repository, {
    workerId,
    leaseMs: PIX_PROVIDER_SETTLEMENT_DEFAULTS.leaseMs,
    allowSyntheticProviders: true
  });
  return Object.freeze({
    consumer,
    workerId,
    countReconciliationRequired: (accountId: string) =>
      repository.countReconciliationRequired(accountId),
    ...PIX_PROVIDER_SETTLEMENT_DEFAULTS
  });
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

async function loadPersistedAccountIds(productionLike: boolean): Promise<readonly string[]> {
  const configured = (process.env.WORKER_ACCOUNT_IDS ?? process.env.WORKER_ACCOUNT_ID ?? '')
    .split(',')
    .map((accountId) => accountId.trim())
    .filter(Boolean);
  if (configured.length > 0) return [...new Set(configured)];
  if (productionLike) {
    throw new Error('WORKER_ACCOUNT_IDS is required in production-like environments');
  }
  const result = await getPool().query<{ id: string }>('SELECT id::text FROM accounts ORDER BY id');
  return result.rows.map((account) => account.id);
}

export async function bootstrapWorkerServices(
  options: WorkerBootstrapOptions = {}
): Promise<WorkerBootstrapResult> {
  const productionLike =
    isProductionLikeEnvironment(process.env.NODE_ENV) ||
    isProductionLikeEnvironment(options.environment) ||
    process.env.DATABASE_REQUIRE_RLS_ROLE === '1' ||
    process.env.DATABASE_REQUIRE_SCHEMA === '1';
  if (options.allowSyntheticPixProvider === true) {
    assertSyntheticEnvironment(options.environment);
  }
  if (!options.databaseUrl) {
    if (productionLike) {
      throw new Error(
        'Production-like worker runtime requires DATABASE_URL; refusing degraded startup'
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
          `Production-like worker database is unavailable; refusing degraded startup (${health.detail})`
        );
      }
      return {
        databaseHealthy: false,
        databaseDetail: health.detail
      };
    }
    if (productionLike) {
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
    if (!deliveryGuaranteesReady && productionLike) {
      throw new Error('Worker delivery guarantee schema is not ready');
    }
    const accountIds = await loadPersistedAccountIds(productionLike);
    const eventConsumerSchema = await getPool().query<{ ready: boolean }>(
      `SELECT
         to_regclass('public.owners') IS NOT NULL
         AND to_regclass('public.patients') IS NOT NULL
         AND to_regclass('public.owner_patient_links') IS NOT NULL
         AND to_regclass('public.patient_merges') IS NOT NULL
         AND to_regclass('public.encounters') IS NOT NULL
         AND to_regclass('public.encounter_timeline') IS NOT NULL
         AND to_regclass('public.billing_records') IS NOT NULL
         AND to_regclass('public.billing_items') IS NOT NULL
         AND to_regclass('public.encounter_financial_accounts') IS NOT NULL
         AND to_regclass('public.encounter_receivables') IS NOT NULL
         AND to_regclass('public.encounter_receivable_payments') IS NOT NULL
         AND to_regclass('public.pix_transactions') IS NOT NULL
         AND to_regclass('public.card_transactions') IS NOT NULL
         AND to_regclass('public.webhooks') IS NOT NULL
         AND to_regclass('public.webhook_deliveries') IS NOT NULL AS ready`
    );
    const eventConsumerSchemaReady = eventConsumerSchema.rows[0]?.ready === true;
    if (!eventConsumerSchemaReady && productionLike) {
      throw new Error('Worker event consumer schema is not ready');
    }

    const eventConsumers = eventConsumerSchemaReady
      ? (() => {
          const owners = new OwnersService({
            ownerRepository: new DatabaseOwnerRepository(db),
            seedOwners: []
          });
          const patients = new PatientsService({
            owners,
            patientRepository: new DatabasePatientRepository(db),
            ownerPatientLinkRepository: new DatabaseOwnerPatientLinkRepository(db),
            patientMergeRepository: new DatabasePatientMergeRepository(db),
            seedPatients: [],
            seedLinks: []
          });
          const encounters = new EncountersService({
            owners,
            patients,
            encounterRepository: new DatabaseEncounterRepository(db),
            encounterTimelineRepository: new DatabaseEncounterTimelineRepository(db),
            requireUuidIdentifiers: true
          });
          const billing = new BillingService(encounters, {
            repository: new DatabaseBillingRepository()
          });
          const encounterFinancial = new EncounterFinancialService(
            encounters,
            billing,
            patients,
            owners,
            { repository: new DatabaseEncounterFinancialRepository() }
          );
          return createWorkerEventConsumerRuntime({
            billing,
            encounterFinancial,
            pixTransactions: new DatabasePixTransactionRepository(),
            cardTransactions: new DatabaseCardTransactionRepository(),
            webhooks: new WebhooksService({ repository: new DatabaseWebhookRepository(db) }),
            hydrateAccount: async (accountId) => {
              await owners.hydrateFromDatabase(accountId);
              await patients.hydrateFromDatabase(accountId);
              await encounters.hydrateFromDatabase(accountId);
              await billing.hydrateFromDatabase(accountId);
            }
          });
        })()
      : undefined;
    logger.info('Worker database connection established', {
      detail: health.detail
    });

    return {
      databaseHealthy: true,
      databaseDetail: health.detail,
      accountIds,
      loadAccountIds: () => loadPersistedAccountIds(productionLike),
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
      }),
      eventConsumers,
      eventConsumerSchemaReady
    };
  } catch (error) {
    if (productionLike) {
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
