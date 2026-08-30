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
import { AuditService, DatabaseAuditRepository } from '@cvg-his-v2/module-audit';
import { DatabaseFiscalRepository, FiscalService } from '@cvg-his-v2/module-fiscal';
import { CashService, DatabaseCashRepository } from '@cvg-his-v2/module-cash';
import { DatabaseCommissionCalculationsReportSource } from '@cvg-his-v2/module-commissions';
import {
  DatabaseInventoryInvoicesReportSource,
  DatabaseInventoryProductsReportSource,
  DatabaseInventoryStockReportSource,
  DatabaseInventoryMovementsReportSource
} from '@cvg-his-v2/module-inventory';
import {
  CounterSalesService,
  DatabaseCounterSalesRepository
} from '@cvg-his-v2/module-counter-sales';
import {
  DatabaseEncounterFinancialRepository,
  DatabaseFinancialPayablesRepository,
  DatabaseAdvancePaymentsReportSource,
  DatabaseFinanceCatalogReportSource,
  DatabaseFinancialReceivablesReportSource,
  FinancialIncomeStatementService,
  EncounterFinancialService
} from '@cvg-his-v2/module-financial';
import { BillingService, DatabaseBillingRepository } from '@cvg-his-v2/module-billing';
import {
  EncountersService,
  DatabaseEncounterRepository,
  DatabaseEncounterTimelineRepository
} from '@cvg-his-v2/module-encounters';
import {
  OwnersService,
  DatabaseOwnerRepository,
  DatabaseOwnersReportSource
} from '@cvg-his-v2/module-owners';
import { DatabaseServicesReportSource } from '@cvg-his-v2/module-services';
import {
  PatientsService,
  DatabasePatientRepository,
  DatabaseOwnerPatientLinkRepository,
  DatabasePatientMergeRepository,
  DatabasePatientsReportSource
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
  readonly environment?: string;
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
  readonly audit?: AuditService;
  readonly advancePaymentsReportSchemaReady?: boolean;
  readonly pixPaymentDispatch?: WorkerPixPaymentDispatchRuntime;
  readonly pixProviderSettlement?: WorkerPixProviderSettlementRuntime;
  readonly eventConsumers?: WorkerEventConsumerRuntime;
  readonly eventConsumerSchemaReady?: boolean;
  readonly webhookDeliveryExecutor?: WebhooksService;
  readonly webhookDeliverySchemaReady?: boolean;
}

const ADVANCE_PAYMENT_REPORT_TABLES = ['advance_payments', 'advance_payment_allocations'] as const;
const ADVANCE_PAYMENT_REPORT_PAYMENT_COLUMNS = [
  'id',
  'account_id',
  'owner_id',
  'amount_cents',
  'source_type',
  'notes',
  'issued_at'
] as const;
const ADVANCE_PAYMENT_REPORT_ALLOCATION_COLUMNS = [
  'account_id',
  'advance_payment_id',
  'amount_cents',
  'allocation_type'
] as const;
const ADVANCE_PAYMENT_REPORT_POLICIES = [
  'advance_payments_tenant_select',
  'advance_payments_tenant_insert',
  'advance_payment_allocations_tenant_select',
  'advance_payment_allocations_tenant_insert'
] as const;
const ADVANCE_PAYMENT_REPORT_TRIGGERS = [
  'advance_payments_immutability_trigger',
  'advance_payment_allocations_immutability_trigger',
  'advance_payment_allocations_prevent_overallocation'
] as const;

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
  if (isProductionLikeEnvironment(normalized) || isProductionLikeEnvironment(processEnvironment)) {
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
  assertSyntheticEnvironment(options.environment);
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

async function checkPixProviderSettlementSchema(): Promise<boolean> {
  const result = await getPool().query<{ readonly ready: boolean }>(
    `WITH required_tables(table_name) AS (
       VALUES
         ('pix_provider_events'),
         ('pix_provider_event_deliveries'),
         ('account_service_principals'),
         ('users'),
         ('encounter_payment_attempts'),
         ('pix_transactions')
     ),
     table_state AS (
       SELECT required.table_name, relation.oid,
              relation.relrowsecurity, relation.relforcerowsecurity
         FROM required_tables AS required
         LEFT JOIN pg_class AS relation
           ON relation.relname = required.table_name
          AND relation.relnamespace = 'public'::regnamespace
     ),
     required_privileges(table_name, privilege_type) AS (
       VALUES
         ('pix_provider_events', 'SELECT'),
         ('pix_provider_event_deliveries', 'SELECT'),
         ('pix_provider_event_deliveries', 'UPDATE'),
         ('account_service_principals', 'SELECT'),
         ('encounter_payment_attempts', 'SELECT'),
         ('pix_transactions', 'SELECT')
     ),
     required_policies(table_name, policy_name, policy_command, expected_qual, expected_with_check) AS (
       VALUES
         ('pix_provider_events', 'pix_provider_events_tenant_isolation', 'ALL', '(account_id = app.current_account_id())', '(account_id = app.current_account_id())'),
         ('pix_provider_event_deliveries', 'pix_provider_event_deliveries_tenant_isolation', 'ALL', '(account_id = app.current_account_id())', '(account_id = app.current_account_id())'),
         ('account_service_principals', 'account_service_principals_tenant_isolation', 'ALL', '(account_id = app.current_account_id())', '(account_id = app.current_account_id())'),
         ('users', 'users_tenant_isolation', 'ALL', '(account_id = app.current_account_id())', '(account_id = app.current_account_id())'),
         ('encounter_payment_attempts', 'encounter_payment_attempts_tenant_isolation', 'ALL', '(account_id = app.current_account_id())', '(account_id = app.current_account_id())'),
         ('pix_transactions', 'pix_transactions_tenant_isolation', 'ALL', '(account_id = app.current_account_id())', '(account_id = app.current_account_id())')
     ),
     required_columns(table_name, column_name) AS (
       VALUES
         ('pix_provider_events', 'id'),
         ('pix_provider_events', 'account_id'),
         ('pix_provider_events', 'provider'),
         ('pix_provider_events', 'provider_event_id'),
         ('pix_provider_events', 'event_type'),
         ('pix_provider_events', 'payment_attempt_id'),
         ('pix_provider_events', 'provider_transaction_id'),
         ('pix_provider_events', 'amount_cents'),
         ('pix_provider_events', 'currency'),
         ('pix_provider_events', 'confirmed_at'),
         ('pix_provider_events', 'correlation_id'),
         ('pix_provider_event_deliveries', 'id'),
         ('pix_provider_event_deliveries', 'account_id'),
         ('pix_provider_event_deliveries', 'event_id'),
         ('pix_provider_event_deliveries', 'state'),
         ('pix_provider_event_deliveries', 'attempts'),
         ('pix_provider_event_deliveries', 'max_attempts'),
         ('pix_provider_event_deliveries', 'next_attempt_at'),
         ('pix_provider_event_deliveries', 'lease_owner'),
         ('pix_provider_event_deliveries', 'lease_token'),
         ('pix_provider_event_deliveries', 'lease_version'),
         ('pix_provider_event_deliveries', 'lease_expires_at'),
         ('pix_provider_event_deliveries', 'last_error_code'),
         ('pix_provider_event_deliveries', 'last_error_class'),
         ('pix_provider_event_deliveries', 'applied_at'),
         ('pix_provider_event_deliveries', 'created_at'),
         ('pix_provider_event_deliveries', 'updated_at'),
         ('account_service_principals', 'account_id'),
         ('account_service_principals', 'purpose'),
         ('account_service_principals', 'user_id'),
         ('account_service_principals', 'is_active'),
         ('account_service_principals', 'created_at'),
         ('users', 'id'),
         ('users', 'account_id'),
         ('users', 'is_active'),
         ('users', 'principal_kind'),
         ('users', 'interactive_login_enabled'),
         ('encounter_payment_attempts', 'id'),
         ('encounter_payment_attempts', 'account_id'),
         ('encounter_payment_attempts', 'state'),
         ('encounter_payment_attempts', 'provider_key'),
         ('encounter_payment_attempts', 'provider_transaction_id'),
         ('encounter_payment_attempts', 'amount_cents'),
         ('encounter_payment_attempts', 'currency'),
         ('encounter_payment_attempts', 'billing_record_id'),
         ('pix_transactions', 'transaction_id'),
         ('pix_transactions', 'provider'),
         ('pix_transactions', 'account_id'),
         ('pix_transactions', 'billing_record_id'),
         ('pix_transactions', 'payment_attempt_id'),
         ('pix_transactions', 'amount'),
         ('pix_transactions', 'currency'),
         ('pix_transactions', 'provider_transaction_id')
     ),
     required_constraints(table_name, constraint_name) AS (
       VALUES
         ('pix_provider_events', 'pix_provider_events_account_provider_event_unique'),
         ('pix_provider_events', 'pix_provider_events_account_attempt_fk'),
         ('pix_provider_events', 'pix_provider_events_provider_chk'),
         ('pix_provider_events', 'pix_provider_events_type_chk'),
         ('pix_provider_events', 'pix_provider_events_amount_cents_chk'),
         ('pix_provider_events', 'pix_provider_events_currency_chk'),
         ('pix_provider_event_deliveries', 'pix_provider_event_deliveries_account_event_unique'),
         ('pix_provider_event_deliveries', 'pix_provider_event_deliveries_account_event_fk'),
         ('pix_provider_event_deliveries', 'pix_provider_event_deliveries_state_chk'),
         ('pix_provider_event_deliveries', 'pix_provider_event_deliveries_lease_state_chk'),
         ('pix_provider_event_deliveries', 'pix_provider_event_deliveries_next_attempt_chk'),
         ('account_service_principals', 'account_service_principals_account_user_fk'),
         ('account_service_principals', 'account_service_principals_purpose_chk'),
         ('users', 'users_principal_kind_chk'),
         ('users', 'users_service_principal_interactive_login_chk'),
         ('encounter_payment_attempts', 'encounter_payment_attempts_account_id_id_unique'),
         ('encounter_payment_attempts', 'encounter_payment_attempts_provider_idempotency_key_unique'),
         ('encounter_payment_attempts', 'encounter_payment_attempts_state_chk'),
         ('encounter_payment_attempts', 'encounter_payment_attempts_amount_cents_positive_chk'),
         ('encounter_payment_attempts', 'encounter_payment_attempts_currency_brl_chk'),
         ('pix_transactions', 'pix_transactions_account_payment_attempt_fk')
     ),
     required_indexes(table_name, index_name) AS (
       VALUES
         ('pix_provider_events', 'pix_provider_events_account_received_idx'),
         ('pix_provider_event_deliveries', 'pix_provider_event_deliveries_claim_idx'),
         ('pix_provider_event_deliveries', 'pix_provider_event_deliveries_event_idx'),
         ('account_service_principals', 'account_service_principals_active_purpose_unique'),
         ('encounter_payment_attempts', 'uidx_encounter_payment_attempts_provider_transaction'),
         ('pix_transactions', 'uidx_pix_transactions_account_payment_attempt')
     )
     SELECT
       (SELECT COUNT(*) = 6
          FROM table_state
         WHERE oid IS NOT NULL)
       AND (SELECT COALESCE(BOOL_AND(relrowsecurity AND relforcerowsecurity), false)
              FROM table_state)
       AND NOT EXISTS (
             SELECT 1
               FROM required_policies AS required
              WHERE NOT EXISTS (
                SELECT 1
                  FROM pg_policies AS policy
                 WHERE policy.schemaname = 'public'
                   AND policy.tablename = required.table_name
                   AND policy.policyname = required.policy_name
                   AND policy.cmd = required.policy_command
                   AND policy.qual = required.expected_qual
                   AND policy.with_check = required.expected_with_check
              )
           )
       AND (SELECT COUNT(*) = 6
              FROM required_privileges AS required
              JOIN table_state
                ON table_state.table_name = required.table_name
             WHERE table_state.oid IS NOT NULL
               AND has_table_privilege(current_user, table_state.oid, required.privilege_type))
       AND NOT EXISTS (
             SELECT 1
               FROM required_columns AS required
              WHERE NOT EXISTS (
                SELECT 1
                  FROM information_schema.columns AS column_info
                 WHERE column_info.table_schema = 'public'
                   AND column_info.table_name = required.table_name
                   AND column_info.column_name = required.column_name
                   AND has_column_privilege(
                     current_user,
                     format('%I.%I', column_info.table_schema, column_info.table_name),
                     required.column_name,
                     'SELECT'
                   )
              )
           )
       AND NOT EXISTS (
             SELECT 1
               FROM required_constraints AS required
              WHERE NOT EXISTS (
                SELECT 1
                  FROM pg_constraint AS constraint_row
                  JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
                  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
                 WHERE namespace.nspname = 'public'
                   AND relation.relname = required.table_name
                   AND constraint_row.conname = required.constraint_name
              )
           )
       AND NOT EXISTS (
             SELECT 1
               FROM required_indexes AS required
              WHERE NOT EXISTS (
                SELECT 1
                  FROM pg_indexes AS index_row
                 WHERE index_row.schemaname = 'public'
                   AND index_row.tablename = required.table_name
                   AND index_row.indexname = required.index_name
              )
           ) AS ready`
  );
  return result.rows[0]?.ready === true;
}

async function checkAdvancePaymentsReportSchema(): Promise<boolean> {
  const result = await getPool().query<{ readonly ready: boolean }>(
    `SELECT
       (
         SELECT COUNT(*) = 2
                AND COALESCE(BOOL_AND(c.relrowsecurity AND c.relforcerowsecurity), false)
           FROM pg_class AS c
           JOIN pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = ANY($1::text[])
       )
       AND (
         SELECT COUNT(*) = 11
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND (
              (table_name = 'advance_payments'
               AND column_name = ANY($4::text[]))
              OR
              (table_name = 'advance_payment_allocations'
               AND column_name = ANY($5::text[]))
            )
       )
       AND (
         SELECT COUNT(*) = 4
                AND COALESCE(
                  BOOL_AND(
                    POSITION('app.current_account_id()' IN
                      LOWER(COALESCE(qual, '') || ' ' || COALESCE(with_check, ''))) > 0
                  ),
                  false
                )
           FROM pg_policies
          WHERE schemaname = 'public'
            AND policyname = ANY($2::text[])
            AND tablename = ANY($1::text[])
       )
       AND (
         SELECT COUNT(*) = 3
           FROM pg_trigger AS t
           JOIN pg_class AS c ON c.oid = t.tgrelid
           JOIN pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = ANY($1::text[])
            AND t.tgname = ANY($3::text[])
            AND NOT t.tgisinternal
       ) AS ready`,
    [
      ADVANCE_PAYMENT_REPORT_TABLES,
      ADVANCE_PAYMENT_REPORT_POLICIES,
      ADVANCE_PAYMENT_REPORT_TRIGGERS,
      ADVANCE_PAYMENT_REPORT_PAYMENT_COLUMNS,
      ADVANCE_PAYMENT_REPORT_ALLOCATION_COLUMNS
    ]
  );
  return result.rows[0]?.ready === true;
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
    if (options.pixProviderSettlementEnabled === true) {
      const pixProviderSettlementSchemaReady = await checkPixProviderSettlementSchema();
      if (!pixProviderSettlementSchemaReady) {
        throw new Error('Worker PIX provider settlement schema or ACL is not ready');
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

    const advancePaymentsReportSchemaReady = await checkAdvancePaymentsReportSchema();
    if (!advancePaymentsReportSchemaReady && productionLike) {
      throw new Error('Worker advance-payment report schema is not ready');
    }

    const webhookDeliverySchema = await getPool().query<{ ready: boolean }>(
      `SELECT
         to_regclass('public.webhooks') IS NOT NULL
         AND to_regclass('public.webhook_deliveries') IS NOT NULL
         AND (
           SELECT COUNT(*) = 7
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'webhook_deliveries'
             AND column_name = ANY(ARRAY[
               'max_attempts', 'response_error', 'dead_lettered_at',
               'lease_owner', 'lease_token', 'lease_version', 'lease_expires_at'
             ])
         )
         AND (
           SELECT COUNT(*) = 4
           FROM pg_constraint
           WHERE conname = ANY(ARRAY[
             'webhook_deliveries_status_check',
             'webhook_deliveries_attempts_check',
             'webhook_deliveries_lease_version_check',
             'webhook_deliveries_lease_state_check'
           ])
         )
         AND (
           SELECT COUNT(*) = 2 AND BOOL_AND(c.relrowsecurity AND c.relforcerowsecurity)
           FROM pg_class AS c
           JOIN pg_namespace AS n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname = ANY(ARRAY['webhooks', 'webhook_deliveries'])
         )
         AND (
           SELECT COUNT(*) = 2
           FROM pg_policies
           WHERE schemaname = 'public'
             AND policyname = ANY(ARRAY[
               'webhooks_tenant_isolation',
               'webhook_deliveries_tenant_isolation'
             ])
         ) AS ready`
    );
    const webhookDeliverySchemaReady = webhookDeliverySchema.rows[0]?.ready === true;
    if (!webhookDeliverySchemaReady && productionLike) {
      throw new Error('Worker webhook delivery executor schema is not ready');
    }

    const webhookDeliveryExecutor = webhookDeliverySchemaReady
      ? new WebhooksService({ repository: new DatabaseWebhookRepository(db) })
      : undefined;

    const eventConsumers =
      eventConsumerSchemaReady && webhookDeliveryExecutor
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
              webhooks: webhookDeliveryExecutor,
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
      audit: new AuditService({ auditRepository: new DatabaseAuditRepository(db) }),
      reportSources: createDatabaseReportSources(advancePaymentsReportSchemaReady),
      advancePaymentsReportSchemaReady,
      pixPaymentDispatch: createSyntheticPixPaymentDispatchRuntime({
        allowSyntheticProviders: options.allowSyntheticPixProvider === true,
        environment: options.environment,
        pool: getPool(),
        workerId: options.pixDispatcherWorkerId
      }),
      pixProviderSettlement: createPixProviderSettlementRuntime({
        enabled: options.pixProviderSettlementEnabled === true,
        allowSyntheticProviders: options.allowSyntheticPixProvider === true,
        environment: options.environment,
        pool: getPool(),
        workerId: options.pixSettlementWorkerId
      }),
      eventConsumers,
      eventConsumerSchemaReady,
      webhookDeliveryExecutor,
      webhookDeliverySchemaReady
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

function createDatabaseReportSources(
  advancePaymentsReportSchemaReady = true
): AdministrativeExecutiveReportSources {
  const counterSales = new CounterSalesService({
    repository: new DatabaseCounterSalesRepository()
  });
  const payablesRepository = new DatabaseFinancialPayablesRepository();
  const fiscalRepository = new DatabaseFiscalRepository();
  const receivablesReportSource = new DatabaseFinancialReceivablesReportSource();

  return {
    cheques: counterSales,
    commercial: counterSales,
    commercialDeletedSales: counterSales,
    financial: new FinancialIncomeStatementService({
      receivables: new DatabaseEncounterFinancialRepository(),
      payables: new DatabaseFinancialPayablesRepository()
    }),
    cash: new CashService({
      repository: new DatabaseCashRepository()
    }),
    commissions: new DatabaseCommissionCalculationsReportSource(),
    payables: {
      listPayables: (accountId, filters) =>
        payablesRepository.listPayables({
          accountId,
          ...(filters?.status ? { status: filters.status } : {})
        })
    },
    ...(advancePaymentsReportSchemaReady
      ? { advancePayments: new DatabaseAdvancePaymentsReportSource() }
      : {}),
    receivables: receivablesReportSource,
    services: new DatabaseServicesReportSource(),
    suppliers: new DatabaseFinanceCatalogReportSource(),
    owners: new DatabaseOwnersReportSource(),
    patients: new DatabasePatientsReportSource(),
    inventoryProducts: new DatabaseInventoryProductsReportSource(),
    inventoryStock: new DatabaseInventoryStockReportSource(),
    inventoryMovements: new DatabaseInventoryMovementsReportSource(),
    inventoryInvoices: new DatabaseInventoryInvoicesReportSource(),
    fiscal: {
      listNfseDocuments: (accountId, filters) =>
        new FiscalService(fiscalRepository, accountId).listNfseDocuments(filters)
    }
  };
}

export async function shutdownWorkerServices(): Promise<void> {
  await closeDatabaseClient();
}
