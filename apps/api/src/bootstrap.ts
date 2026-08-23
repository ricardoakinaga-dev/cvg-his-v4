import {
  createDatabaseClient,
  closeDatabaseClient,
  checkDatabaseHealth,
  checkDatabaseRuntimeRole,
  getDatabaseClient,
  getPool,
  createTenantUnitOfWork,
  type DatabaseClient,
  type TenantUnitOfWork
} from '@cvg-his-v2/shared-database';
import { createLogger } from '@cvg-his-v2/shared-logging';
import {
  DatabaseMfaLoginChallengeRepository,
  DatabaseSessionRepository,
  type PersistedSessionRecord,
  type RotateRefreshNonceParams,
  type SessionRepository,
  type UpdateSessionParams
} from '@cvg-his-v2/module-auth';
import { DatabaseAuditRepository } from '@cvg-his-v2/module-audit';
import type { AuditRepository } from '@cvg-his-v2/module-audit';
import { DatabaseApiKeyRepository } from '@cvg-his-v2/module-api-keys';
import { DatabaseOwnerRepository } from '@cvg-his-v2/module-owners';
import type { OwnerRepository } from '@cvg-his-v2/module-owners';
import {
  DatabasePatientRepository,
  DatabaseOwnerPatientLinkRepository,
  DatabasePatientMergeRepository
} from '@cvg-his-v2/module-patients';
import type {
  PatientRepository,
  OwnerPatientLinkRepository
} from '@cvg-his-v2/module-patients';
import { DatabaseLaboratoryResultImportRepository } from './laboratory-result-import-repository.js';
import {
  DatabaseClinicalHandoffRepository,
  DatabaseEncounterRepository,
  DatabaseEncounterTimelineRepository,
  InMemoryClinicalHandoffRepository
} from '@cvg-his-v2/module-encounters';
import type {
  EncounterRepository,
  EncounterTimelineRepository
} from '@cvg-his-v2/module-encounters';
import {
  DatabaseMedicalRecordRepository,
  DatabaseClinicalEntryRepository,
  DatabaseClinicalTimelineRepository,
  DatabaseEntryRevisionRepository
} from '@cvg-his-v2/module-medical-records';
import type {
  MedicalRecordRepository,
  ClinicalEntryRepository,
  ClinicalTimelineRepository,
  EntryRevisionRepository
} from '@cvg-his-v2/module-medical-records';
import {
  DatabaseAttachmentRepository,
  LocalFileStorage,
  createMemoryFileStorage,
  type AttachmentRepository,
  type FileStorage
} from '@cvg-his-v2/module-attachments';
import { DatabaseNotificationRepository } from '@cvg-his-v2/module-notifications';
import type { NotificationRepository } from '@cvg-his-v2/module-notifications';
import {
  DatabaseInpatientStayRepository,
  DatabaseInpatientProgressRepository,
  DatabaseInpatientOccurrenceRepository,
  DatabaseInpatientDailyChargeRepository
} from '@cvg-his-v2/module-inpatient';
import {
  DatabaseSurgeryCaseRepository,
  type SurgeryCaseRepository
} from '@cvg-his-v2/module-surgery';
import {
  DatabaseDiagnosticOrderRepository,
  DatabaseLaboratoryCatalogRepository,
  type DiagnosticOrderRepository
} from '@cvg-his-v2/module-diagnostics';
import type { LaboratoryCatalogRepository } from '@cvg-his-v2/module-diagnostics';
import {
  DatabaseDischargeRepository,
  type DischargeRepository
} from '@cvg-his-v2/module-discharges';
import {
  DatabasePrescriptionExecutionRepository,
  DatabaseAdministrationEventRepository,
  type PrescriptionExecutionRepository,
  type AdministrationEventRepository
} from '@cvg-his-v2/module-prescription-executions';
import { DatabaseBillingRepository } from '@cvg-his-v2/module-billing';
import { DatabaseCommissionRepository } from '@cvg-his-v2/module-commissions';
import { DatabasePackageRepository } from '@cvg-his-v2/module-packages';
import { DatabaseReportRepository } from '@cvg-his-v2/module-reports';
import { DatabaseMarketingRepository } from '@cvg-his-v2/module-marketing';
import { DatabaseCommercialRepository } from '@cvg-his-v2/module-commercial';
import { DatabaseCashRepository } from '@cvg-his-v2/module-cash';
import { DatabaseCounterSalesRepository } from '@cvg-his-v2/module-counter-sales';
import { DatabaseProductsRepository } from '@cvg-his-v2/module-products';
import { DatabaseServicesRepository } from '@cvg-his-v2/module-services';
import { DatabaseQuotesRepository } from '@cvg-his-v2/module-quotes';
import {
  DatabaseEncounterFinancialRepository,
  DatabaseFinancialPayablesRepository,
  DatabaseFinancialLedgerRepository
} from '@cvg-his-v2/module-financial';
import {
  DatabaseInventoryRepository,
  DatabaseProcurementRepository
} from '@cvg-his-v2/module-inventory';
import { DatabaseSchedulingRepository } from '@cvg-his-v2/module-scheduling';
import {
  DatabaseStaffRepository,
  DatabaseStaffTimeOffRepository
} from '@cvg-his-v2/module-staff';
import { DatabaseUsersRepository } from '@cvg-his-v2/module-users';
import { DatabaseTriageRepository } from '@cvg-his-v2/module-triage';
import { DatabaseAccessControlRepository } from '@cvg-his-v2/module-access-control';
import { DatabaseMfaRepository } from '@cvg-his-v2/module-mfa';
import type { MfaRepository } from '@cvg-his-v2/module-mfa';
import { DatabaseConsentRepository, DatabaseDsrRepository } from '@cvg-his-v2/module-lgpd';
import type { ConsentRepository, DsrRepository } from '@cvg-his-v2/module-lgpd';
import { DatabaseWebhookRepository } from '@cvg-his-v2/module-webhooks';
import type { WebhookRepository } from '@cvg-his-v2/module-webhooks';
import { DatabaseOutboxRepository } from '@cvg-his-v2/module-event-bus';
import type {
  AccountId,
  AuditEventId,
  AuditEventSummary,
  SessionId,
  SessionSummary,
  WebhookDeliveryId,
  WebhookDeliverySummary,
  WebhookId,
  WebhookSummary
} from '@cvg-his-v2/shared-types';
import {
  DatabaseAgendaConfigRepository
} from './repositories/database-agenda-config.repository.js';
import { InMemoryAgendaConfigRepository } from './repositories/agenda-config-repository.js';
import type {
  OwnerId,
  OwnerSummary,
  PatientId,
  PatientSummary,
  OwnerPatientLinkId,
  OwnerPatientLinkSummary
} from '@cvg-his-v2/shared-types';
import type {
  EncounterId,
  EncounterSummary,
  EncounterTimelineEventSummary,
  MedicalRecordId,
  MedicalRecordSummary,
  ClinicalEntryId,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  EntryRevisionSummary,
  AttachmentSummary,
  NotificationId,
  NotificationJobId,
  NotificationJobSummary,
  NotificationSummary
} from '@cvg-his-v2/shared-types';

import type { RuntimeRepositories } from './runtime.js';
import type { PersistenceMode } from './app-state.js';
import { DatabasePixTransactionRepository } from './pix-transaction-repository.js';
import { DatabaseEncounterCashReceiptRepository } from './encounter-cash-receipt-repository.js';
import { DatabaseEncounterPixPaymentAttemptRepository } from './encounter-pix-payment-attempt-repository.js';
import { DatabasePixProviderSettlementDlqRepository } from './pix-provider-settlement-dlq-repository.js';
import type { PixProviderSettlementDlqRepository } from './routes/pix-provider-settlement-routes.js';
import { DatabasePrescriptionRepository } from './repositories/database-prescription.repository.js';

export interface BootstrapOptions {
  databaseUrl?: string;
  fileStoragePath?: string;
  skipDatabase?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface BootstrapResult {
  databaseHealthy: boolean;
  databaseDetail: string;
  repositoriesUseDatabase: boolean;
  repositories: RuntimeRepositories;
  fileStorage: FileStorage;
  unitOfWork?: TenantUnitOfWork;
  /** Set only when the durable PIX settlement DLQ schema/function is ready. */
  pixProviderSettlementDlqRepository?: PixProviderSettlementDlqRepository;
}

const logger = createLogger('bootstrap');

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(
  databaseUrl: string,
  maxRetries: number = 3,
  retryDelayMs: number = 1000
): Promise<{ healthy: boolean; detail: string }> {
  let lastError: string = 'Unknown error';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('Attempting database connection', { attempt, maxRetries });

      createDatabaseClient(databaseUrl);
      const health = await checkDatabaseHealth();

      if (health.healthy) {
        logger.info('Database connection successful', { attempt });
        return health;
      }

      lastError = health.detail;
      logger.info('Database health check failed, will retry', { attempt, detail: health.detail });

      if (attempt < maxRetries) {
        await sleep(retryDelayMs * attempt);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      logger.info('Database connection attempt failed, will retry', { attempt, error: lastError });

      if (attempt < maxRetries) {
        await sleep(retryDelayMs * attempt);
      }
    }
  }

  return { healthy: false, detail: `Failed after ${maxRetries} attempts: ${lastError}` };
}

async function databaseTableExists(tableName: string): Promise<boolean> {
  const result = await getPool().query<{ exists: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`public.${tableName}`]
  );
  return result.rows[0]?.exists === true;
}

async function databaseFunctionExists(signature: string): Promise<boolean> {
  const result = await getPool().query<{ exists: boolean }>(
    'SELECT to_regprocedure($1) IS NOT NULL AS exists',
    [signature]
  );
  return result.rows[0]?.exists === true;
}

export const mfaCredentialRequiredColumns = [
  'id',
  'account_id',
  'user_id',
  'setup_expires_at',
  'secret_key_version'
] as const;

export function hasRequiredDatabaseColumns(
  availableColumns: Iterable<string>,
  requiredColumns: readonly string[]
): boolean {
  const available = new Set(availableColumns);
  return requiredColumns.every((column) => available.has(column));
}

async function databaseTableHasColumns(
  tableName: string,
  requiredColumns: readonly string[]
): Promise<boolean> {
  const result = await getPool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return hasRequiredDatabaseColumns(
    result.rows.map((row) => row.column_name),
    requiredColumns
  );
}

export interface DependencyCheckResult {
  name: string;
  healthy: boolean;
  detail: string;
}

export async function validateDependencies(): Promise<readonly DependencyCheckResult[]> {
  const results: DependencyCheckResult[] = [];

  try {
    const dbHealth = await checkDatabaseHealth();
    results.push({
      name: 'database',
      healthy: dbHealth.healthy,
      detail: dbHealth.detail
    });
  } catch (error) {
    results.push({
      name: 'database',
      healthy: false,
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

export type OwnerPatientLinkPersistence = 'database' | 'derived-from-patient';

const criticalRepositoryKeys = [
  'session',
  'audit',
  'owner',
  'patient',
  'encounter',
  'encounterTimeline',
  'medicalRecord',
  'clinicalEntry',
  'clinicalTimeline',
  'entryRevision',
  'attachment',
  'notification'
] as const satisfies readonly (keyof RuntimeRepositories)[];

export interface ProductionReadinessStatus {
  productionReady: boolean;
  criticalRepositoriesReady: boolean;
  missingCriticalRepositories: readonly string[];
  ownerPatientLinkPersistence: OwnerPatientLinkPersistence;
}

/**
 * Repositories that must never be replaced by an in-memory Map when the API
 * is running against PostgreSQL in a production-like environment.
 *
 * The list is intentionally explicit: adding a repository-backed service
 * without adding it here would make the bootstrap contract silently weaker.
 */
export const productionDatabaseRepositoryKeys = [
  'session',
  'audit',
  'owner',
  'patient',
  'ownerPatientLink',
  'encounter',
  'encounterTimeline',
  'clinicalHandoff',
  'medicalRecord',
  'clinicalEntry',
  'clinicalTimeline',
  'entryRevision',
  'attachment',
  'notification',
  'inpatientStay',
  'inpatientProgress',
  'inpatientOccurrence',
  'inpatientDailyCharge',
  'surgeryCase',
  'diagnosticOrder',
  'laboratoryCatalog',
  'discharge',
  'prescriptionExecution',
  'administrationEvent',
  'prescription',
  'billing',
  'commercial',
  'commissions',
  'packages',
  'reports',
  'inventory',
  'procurement',
  'scheduling',
  'triage',
  'users',
  'accessControl',
  'products',
  'services',
  'counterSales',
  'quotes',
  'cash',
  'staff',
  'staffTimeOff',
  'mfa',
  'mfaLoginChallenge',
  'consent',
  'dsr',
  'marketing',
  'webhook',
  'apiKey',
  'outbox',
  'encounterFinancial',
  'financialPayables',
  'ledger',
  'pixTransaction',
  'encounterCashReceipt',
  'encounterPixPaymentAttempt'
] as const satisfies readonly (keyof RuntimeRepositories)[];

export function isProductionLikeEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env
): boolean {
  return (
    environment.NODE_ENV === 'production' ||
    environment.DATABASE_REQUIRE_RLS_ROLE === '1' ||
    environment.DATABASE_REQUIRE_SCHEMA === '1'
  );
}

export function findMissingProductionRepositories(
  repositories: RuntimeRepositories
): readonly string[] {
  return productionDatabaseRepositoryKeys.filter((repositoryKey) => !repositories[repositoryKey]);
}

export function assertProductionDatabaseReadiness(options: {
  repositories: RuntimeRepositories;
  unitOfWork?: TenantUnitOfWork;
}): void {
  const missingRepositories = findMissingProductionRepositories(options.repositories);
  const missingContracts = [
    ...(missingRepositories.length > 0
      ? [`repositories=${missingRepositories.join(',')}`]
      : []),
    ...(!options.unitOfWork ? ['unitOfWork'] : [])
  ];

  if (missingContracts.length > 0) {
    throw new Error(
      `Production database runtime is not ready; refusing in-memory fallback (${missingContracts.join('; ')})`
    );
  }
}

export function resolveProductionReadiness(options: {
  persistenceMode: PersistenceMode;
  workerReady: boolean;
  repositories: RuntimeRepositories;
}): ProductionReadinessStatus {
  const missingCriticalRepositories = criticalRepositoryKeys.filter(
    (repositoryKey) => !options.repositories[repositoryKey]
  );
  const criticalRepositoriesReady = missingCriticalRepositories.length === 0;
  const ownerPatientLinkPersistence: OwnerPatientLinkPersistence = options.repositories
    .ownerPatientLink
    ? 'database'
    : 'derived-from-patient';

  return {
    productionReady:
      options.persistenceMode === 'database' && options.workerReady && criticalRepositoriesReady,
    criticalRepositoriesReady,
    missingCriticalRepositories,
    ownerPatientLinkPersistence
  };
}

// InMemory Repository implementations
class InMemorySessionRepository {
  readonly #sessions = new Map<SessionId, PersistedSessionRecord>();
  async create(session: PersistedSessionRecord): Promise<void> {
    this.#sessions.set(session.sessionId, session);
  }
  async update(session: PersistedSessionRecord | UpdateSessionParams): Promise<void> {
    const existing = this.#sessions.get(session.sessionId);
    if (!existing) {
      return;
    }
    if ('active' in session && session.active === false) {
      this.#sessions.delete(session.sessionId);
      return;
    }
    this.#sessions.set(session.sessionId, { ...existing, ...session } as PersistedSessionRecord);
  }
  async rotateRefreshNonce(
    params: RotateRefreshNonceParams
  ): Promise<PersistedSessionRecord | null> {
    const existing = this.#sessions.get(params.sessionId);
    if (
      !existing
      || !existing.active
      || existing.revokedAt
      || existing.refreshNonce !== params.expectedRefreshNonce
    ) {
      return null;
    }

    const rotated: PersistedSessionRecord = {
      ...existing,
      refreshNonce: params.refreshNonce,
      expiresAt: params.expiresAt,
      refreshExpiresAt: params.refreshExpiresAt
    };
    this.#sessions.set(params.sessionId, rotated);
    return rotated;
  }
  async findById(id: SessionId): Promise<PersistedSessionRecord | null> {
    return this.#sessions.get(id) ?? null;
  }
  async findByUserId(userId: string): Promise<readonly PersistedSessionRecord[]> {
    return Array.from(this.#sessions.values()).filter((s) => s.userId === userId);
  }
  async delete(id: SessionId): Promise<void> {
    this.#sessions.delete(id);
  }
}

class InMemoryAuditRepository {
  readonly #events: AuditEventSummary[] = [];
  async create(event: AuditEventSummary): Promise<void> {
    this.#events.unshift(event);
  }
  async list(accountId?: AccountId, limit = 100): Promise<readonly AuditEventSummary[]> {
    const filtered = accountId
      ? this.#events.filter((e) => e.accountId === accountId)
      : this.#events;
    return filtered.slice(0, limit);
  }
  async findById(id: AuditEventId): Promise<AuditEventSummary | null> {
    return this.#events.find((e) => e.eventId === id) ?? null;
  }
}

class InMemoryOwnerRepository {
  readonly #owners = new Map<OwnerId, OwnerSummary>();
  async create(owner: OwnerSummary): Promise<void> {
    this.#owners.set(owner.id, owner);
  }
  async update(owner: OwnerSummary): Promise<void> {
    this.#owners.set(owner.id, owner);
  }
  async findById(id: OwnerId): Promise<OwnerSummary | null> {
    return this.#owners.get(id) ?? null;
  }
  async findByAccountId(accountId: AccountId, search?: string): Promise<readonly OwnerSummary[]> {
    return Array.from(this.#owners.values())
      .filter((o) => o.accountId === accountId)
      .filter((o) => !search || o.fullName.toLowerCase().includes(search.toLowerCase()));
  }
  async delete(id: OwnerId): Promise<void> {
    this.#owners.delete(id);
  }
}

class InMemoryPatientRepository {
  readonly #patients = new Map<PatientId, PatientSummary>();
  async create(patient: PatientSummary): Promise<void> {
    this.#patients.set(patient.id, patient);
  }
  async update(patient: PatientSummary): Promise<void> {
    this.#patients.set(patient.id, patient);
  }
  async findById(id: PatientId): Promise<PatientSummary | null> {
    return this.#patients.get(id) ?? null;
  }
  async findByAccountId(accountId: AccountId, search?: string): Promise<readonly PatientSummary[]> {
    return Array.from(this.#patients.values())
      .filter((p) => p.accountId === accountId)
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  }
  async delete(id: PatientId): Promise<void> {
    this.#patients.delete(id);
  }
}

class InMemoryOwnerPatientLinkRepository {
  readonly #links = new Map<OwnerPatientLinkId, OwnerPatientLinkSummary>();
  async create(link: OwnerPatientLinkSummary): Promise<void> {
    this.#links.set(link.id, link);
  }
  async update(link: OwnerPatientLinkSummary): Promise<void> {
    this.#links.set(link.id, link);
  }
  async findById(id: OwnerPatientLinkId): Promise<OwnerPatientLinkSummary | null> {
    return this.#links.get(id) ?? null;
  }
  async findByPatientId(patientId: PatientId): Promise<readonly OwnerPatientLinkSummary[]> {
    return Array.from(this.#links.values()).filter((l) => l.patientId === patientId);
  }
  async findByOwnerId(ownerId: OwnerId): Promise<readonly OwnerPatientLinkSummary[]> {
    return Array.from(this.#links.values()).filter((l) => l.ownerId === ownerId);
  }
  async delete(id: OwnerPatientLinkId): Promise<void> {
    this.#links.delete(id);
  }
}

class InMemoryEncounterRepository {
  readonly #encounters = new Map<EncounterId, EncounterSummary>();
  async create(encounter: EncounterSummary): Promise<void> {
    this.#encounters.set(encounter.id, encounter);
  }
  async update(encounter: EncounterSummary): Promise<void> {
    this.#encounters.set(encounter.id, encounter);
  }
  async findById(id: EncounterId): Promise<EncounterSummary | null> {
    return this.#encounters.get(id) ?? null;
  }
  async findActiveByPatientId(patientId: PatientId): Promise<EncounterSummary | null> {
    return (
      Array.from(this.#encounters.values()).find(
        (e) => e.patientId === patientId && e.status !== 'closed'
      ) ?? null
    );
  }
  async findAll(accountId: AccountId): Promise<readonly EncounterSummary[]> {
    return Array.from(this.#encounters.values()).filter((e) => e.accountId === accountId);
  }
  async findActive(accountId: AccountId): Promise<readonly EncounterSummary[]> {
    return Array.from(this.#encounters.values()).filter(
      (e) => e.accountId === accountId && e.status !== 'closed'
    );
  }
  async delete(id: EncounterId): Promise<void> {
    this.#encounters.delete(id);
  }
}

class InMemoryEncounterTimelineRepository {
  readonly #timeline = new Map<EncounterId, EncounterTimelineEventSummary[]>();
  async create(event: EncounterTimelineEventSummary): Promise<void> {
    const existing = this.#timeline.get(event.encounterId) ?? [];
    existing.unshift(event);
    this.#timeline.set(event.encounterId, existing);
  }
  async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly EncounterTimelineEventSummary[]> {
    return this.#timeline.get(encounterId) ?? [];
  }
}

class InMemoryMedicalRecordRepository {
  readonly #records = new Map<MedicalRecordId, MedicalRecordSummary>();
  readonly #recordsByEncounter = new Map<EncounterId, MedicalRecordId>();

  async create(record: MedicalRecordSummary): Promise<void> {
    this.#records.set(record.id, record);
    this.#recordsByEncounter.set(record.encounterId, record.id);
  }

  async update(record: MedicalRecordSummary): Promise<void> {
    if (!this.#records.has(record.id)) {
      throw new Error(`Medical record not found: ${record.id}`);
    }
    this.#records.set(record.id, record);
  }

  async findById(id: MedicalRecordId): Promise<MedicalRecordSummary | null> {
    return this.#records.get(id) ?? null;
  }

  async findByEncounterId(encounterId: EncounterId): Promise<MedicalRecordSummary | null> {
    const id = this.#recordsByEncounter.get(encounterId);
    return id ? (this.#records.get(id) ?? null) : null;
  }

  async findAll(accountId: AccountId): Promise<readonly MedicalRecordSummary[]> {
    return [...this.#records.values()].filter((r) => r.accountId === accountId);
  }

  clear(): void {
    this.#records.clear();
    this.#recordsByEncounter.clear();
  }

  getAll(): readonly MedicalRecordSummary[] {
    return Array.from(this.#records.values());
  }
}

class InMemoryClinicalEntryRepository {
  readonly #entries = new Map<MedicalRecordId, ClinicalEntrySummary[]>();

  async create(entry: ClinicalEntrySummary): Promise<void> {
    const existing = this.#entries.get(entry.medicalRecordId) ?? [];
    existing.unshift(entry);
    this.#entries.set(entry.medicalRecordId, existing);
  }

  async update(entry: ClinicalEntrySummary): Promise<void> {
    const existing = this.#entries.get(entry.medicalRecordId) ?? [];
    const idx = existing.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      existing[idx] = entry;
    }
  }

  async findById(entryId: ClinicalEntryId): Promise<ClinicalEntrySummary | null> {
    for (const entries of this.#entries.values()) {
      const found = entries.find((e) => e.id === entryId);
      if (found) return found;
    }
    return null;
  }

  async findByMedicalRecordId(
    medicalRecordId: MedicalRecordId
  ): Promise<readonly ClinicalEntrySummary[]> {
    return this.#entries.get(medicalRecordId) ?? [];
  }

  clear(): void {
    this.#entries.clear();
  }
}

class InMemoryClinicalTimelineRepository {
  readonly #timeline = new Map<MedicalRecordId, ClinicalTimelineEventSummary[]>();

  async create(event: ClinicalTimelineEventSummary): Promise<void> {
    const existing = this.#timeline.get(event.medicalRecordId) ?? [];
    existing.unshift(event);
    this.#timeline.set(event.medicalRecordId, existing);
  }

  async findByMedicalRecordId(
    medicalRecordId: MedicalRecordId
  ): Promise<readonly ClinicalTimelineEventSummary[]> {
    return this.#timeline.get(medicalRecordId) ?? [];
  }

  clear(): void {
    this.#timeline.clear();
  }
}

class InMemoryEntryRevisionRepository {
  readonly #revisions = new Map<ClinicalEntryId, EntryRevisionSummary[]>();

  async create(revision: EntryRevisionSummary): Promise<void> {
    const existing = this.#revisions.get(revision.entryId) ?? [];
    existing.push(revision);
    this.#revisions.set(revision.entryId, existing);
  }

  async findByEntryId(entryId: ClinicalEntryId): Promise<readonly EntryRevisionSummary[]> {
    return this.#revisions.get(entryId) ?? [];
  }
}

class InMemoryAttachmentRepository {
  readonly #attachments = new Map<string, AttachmentSummary>();

  async create(attachment: AttachmentSummary): Promise<void> {
    this.#attachments.set(attachment.id, attachment);
  }

  async findById(id: string): Promise<AttachmentSummary | null> {
    return this.#attachments.get(id) ?? null;
  }

  async findByLinkedEntity(
    linkedEntityType: 'encounter' | 'medical_record' | 'diagnostic_order',
    linkedEntityId: string
  ): Promise<readonly AttachmentSummary[]> {
    return Array.from(this.#attachments.values()).filter(
      (attachment) =>
        attachment.linkedEntityType === linkedEntityType &&
        attachment.linkedEntityId === linkedEntityId
    );
  }

  async deleteById(id: string): Promise<boolean> {
    return this.#attachments.delete(id);
  }
}

class InMemoryNotificationRepository {
  readonly #notifications = new Map<NotificationId, NotificationSummary>();
  readonly #jobs = new Map<NotificationJobId, NotificationJobSummary>();

  async createNotification(notification: NotificationSummary): Promise<void> {
    this.#notifications.set(notification.id, notification);
  }

  async updateNotification(notification: NotificationSummary): Promise<void> {
    this.#notifications.set(notification.id, notification);
  }

  async findNotificationById(id: NotificationId): Promise<NotificationSummary | null> {
    return this.#notifications.get(id) ?? null;
  }

  async findNotifications(
    accountId?: NotificationSummary['accountId'],
    status?: NotificationSummary['status']
  ): Promise<readonly NotificationSummary[]> {
    return Array.from(this.#notifications.values()).filter(
      (n) => (!accountId || n.accountId === accountId) && (!status || n.status === status)
    );
  }

  async createJob(job: NotificationJobSummary): Promise<void> {
    this.#jobs.set(job.id, job);
  }

  async updateJob(job: NotificationJobSummary): Promise<void> {
    this.#jobs.set(job.id, job);
  }

  async findJobById(id: NotificationJobId): Promise<NotificationJobSummary | null> {
    return this.#jobs.get(id) ?? null;
  }

  async findJobs(
    accountId?: NotificationJobSummary['accountId'],
    status?: NotificationJobSummary['status']
  ): Promise<readonly NotificationJobSummary[]> {
    return Array.from(this.#jobs.values()).filter(
      (job) => (!accountId || job.accountId === accountId) && (!status || job.status === status)
    );
  }

  async findQueuedJobs(
    limit: number,
    accountId?: NotificationJobSummary['accountId']
  ): Promise<readonly NotificationJobSummary[]> {
    return Array.from(this.#jobs.values())
      .filter((j) => j.status === 'queued' && (!accountId || j.accountId === accountId))
      .slice(0, limit);
  }

  clear(): void {
    this.#notifications.clear();
    this.#jobs.clear();
  }

  getNotifications(): readonly NotificationSummary[] {
    return Array.from(this.#notifications.values());
  }

  getJobs(): readonly NotificationJobSummary[] {
    return Array.from(this.#jobs.values());
  }
}

class InMemoryWebhookRepository {
  readonly #webhooks = new Map<WebhookId, WebhookSummary>();
  readonly #deliveries = new Map<WebhookDeliveryId, WebhookDeliverySummary>();

  async create(webhook: WebhookSummary): Promise<void> {
    this.#webhooks.set(webhook.id, webhook);
  }

  async update(webhook: WebhookSummary): Promise<void> {
    this.#webhooks.set(webhook.id, webhook);
  }

  async delete(accountId: AccountId, webhookId: WebhookId): Promise<void> {
    const webhook = this.#webhooks.get(webhookId);
    if (webhook?.accountId === accountId) {
      this.#webhooks.delete(webhookId);
    }
  }

  async findById(accountId: AccountId, id: WebhookId): Promise<WebhookSummary | null> {
    const webhook = this.#webhooks.get(id);
    return webhook?.accountId === accountId ? webhook : null;
  }

  async findByAccount(accountId: AccountId): Promise<readonly WebhookSummary[]> {
    return Array.from(this.#webhooks.values())
      .filter((webhook) => webhook.accountId === accountId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findActiveByEvent(accountId: AccountId, event: string): Promise<readonly WebhookSummary[]> {
    return Array.from(this.#webhooks.values()).filter(
      (webhook) =>
        webhook.accountId === accountId && webhook.isActive && webhook.events.includes(event)
    );
  }

  async createDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    this.#deliveries.set(delivery.id, delivery);
  }

  async updateDelivery(delivery: WebhookDeliverySummary): Promise<void> {
    this.#deliveries.set(delivery.id, delivery);
  }

  async deleteDeliveriesByWebhook(accountId: AccountId, webhookId: WebhookId): Promise<void> {
    for (const [deliveryId, delivery] of this.#deliveries.entries()) {
      if (delivery.accountId === accountId && delivery.webhookId === webhookId) {
        this.#deliveries.delete(deliveryId);
      }
    }
  }

  async findDeliveriesByWebhook(
    accountId: AccountId,
    webhookId: WebhookId
  ): Promise<readonly WebhookDeliverySummary[]> {
    return Array.from(this.#deliveries.values())
      .filter((delivery) => delivery.accountId === accountId && delivery.webhookId === webhookId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findPendingDeliveries(
    accountId: AccountId,
    limit: number
  ): Promise<readonly WebhookDeliverySummary[]> {
    return Array.from(this.#deliveries.values())
      .filter((delivery) => delivery.accountId === accountId && delivery.status === 'pending')
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  }
}

export async function bootstrapServices(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const results: BootstrapResult = {
    databaseHealthy: false,
    databaseDetail: 'Not initialized',
    repositoriesUseDatabase: false,
    repositories: {},
    fileStorage: createMemoryFileStorage()
  };

  // Default to in-memory repositories
  results.repositories = {
    session: new InMemorySessionRepository(),
    audit: new InMemoryAuditRepository(),
    owner: new InMemoryOwnerRepository(),
    patient: new InMemoryPatientRepository(),
    ownerPatientLink: new InMemoryOwnerPatientLinkRepository(),
    encounter: new InMemoryEncounterRepository(),
    encounterTimeline: new InMemoryEncounterTimelineRepository(),
    clinicalHandoff: new InMemoryClinicalHandoffRepository(),
    medicalRecord: new InMemoryMedicalRecordRepository(),
    clinicalEntry: new InMemoryClinicalEntryRepository(),
    clinicalTimeline: new InMemoryClinicalTimelineRepository(),
    entryRevision: new InMemoryEntryRevisionRepository(),
    attachment: new InMemoryAttachmentRepository(),
    notification: new InMemoryNotificationRepository() as NotificationRepository,
    webhook: new InMemoryWebhookRepository(),
    agendaConfig: new InMemoryAgendaConfigRepository()
  };

  if (options.skipDatabase || !options.databaseUrl) {
    logger.info(
      'Database initialization skipped (no DATABASE_URL provided), using in-memory repositories'
    );
    results.databaseDetail = 'Using in-memory repositories';
    return results;
  }

  try {
    logger.info('Initializing database connection with retry', {
      url: options.databaseUrl.replace(/\/\/.*:.*@/, '//***:***@'),
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000
    });

    const health = await connectWithRetry(
      options.databaseUrl,
      options.maxRetries ?? 3,
      options.retryDelayMs ?? 1000
    );

    results.databaseHealthy = health.healthy;
    results.databaseDetail = health.detail;

    if (health.healthy) {
      const productionLike = isProductionLikeEnvironment();
      if (productionLike) {
        const runtimeRole = await checkDatabaseRuntimeRole();
        if (!runtimeRole.safe) {
          throw new Error(`Unsafe PostgreSQL runtime role: ${runtimeRole.detail}`);
        }
      }
      logger.info('Database connection established, using real database repositories', {
        detail: health.detail
      });

      if (process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS === '1') {
        if (productionLike) {
          throw new Error(
            'Database runtime repositories cannot be disabled in a production-like environment'
          );
        }
        results.databaseDetail =
          'Database healthy, but runtime repositories were explicitly disabled by API_DISABLE_INCOMPATIBLE_DB_REPOS';
        logger.warn('Database runtime repositories disabled by explicit configuration', {
          detail: results.databaseDetail
        });
        return results;
      }

      // Get the database client and create real repositories
      const db = getDatabaseClient();
      const deliveryGuaranteesReady =
        (await databaseTableExists('idempotency_requests')) &&
        (await databaseTableExists('inbox_events'));
      if (deliveryGuaranteesReady) {
        results.unitOfWork = createTenantUnitOfWork(getPool());
      }
      const ownerPatientLinksReady = await databaseTableExists('owner_patient_links');
      const clinicalEntriesReady = await databaseTableExists('clinical_entries');
      const billingTablesReady =
        (await databaseTableExists('billing_records')) &&
        (await databaseTableExists('billing_items'));
      const packagesTablesReady =
        (await databaseTableExists('customer_packages')) &&
        (await databaseTableExists('customer_package_items')) &&
        (await databaseTableExists('customer_package_consumptions'));
      const commissionsTablesReady =
        (await databaseTableExists('commission_rules')) &&
        (await databaseTableExists('commission_calculations')) &&
        (await databaseTableExists('commission_lines'));
      const reportsTablesReady =
        (await databaseTableExists('report_executions')) &&
        (await databaseTableExists('report_exports')) &&
        (await databaseTableExists('report_schedules'));
      const marketingTablesReady =
        (await databaseTableExists('marketing_segments')) &&
        (await databaseTableExists('marketing_templates')) &&
        (await databaseTableExists('marketing_campaigns')) &&
        (await databaseTableExists('marketing_campaign_deliveries'));
      const financialPayablesReady = await databaseTableExists('financial_payables');
      const ledgerTablesReady =
        (await databaseTableExists('financial_journal_entries')) &&
        (await databaseTableExists('financial_journal_lines'));
      const inpatientOccurrenceReady = await databaseTableExists('inpatient_occurrences');
      const inpatientDailyChargesReady = await databaseTableExists('inpatient_daily_charges');
      const inpatientStayRepositoryReady = await databaseTableHasColumns('inpatient_stays', [
        'unit',
        'ward',
        'bed',
        'sector_id'
      ]);
      const inpatientProgressReady = await databaseTableHasColumns('inpatient_progress', [
        'account_id',
        'stay_id',
        'encounter_id',
        'note',
        'authored_by_user_id'
      ]);
      const surgeryCasesReady = await databaseTableHasColumns('surgery_cases', [
        'account_id',
        'encounter_id',
        'patient_id',
        'procedure_name',
        'status'
      ]);
      const inventoryStockMovementsReady = await databaseTableExists('inventory_stock_movements');
      const clinicalHandoffsReady = await databaseTableExists('clinical_handoffs');
      const commercialTablesReady = (
        await Promise.all(
          [
            'loyalty_programs',
            'loyalty_points',
            'loyalty_redemptions',
            'price_tables',
            'price_table_items',
            'pos_sync_jobs'
          ].map((table) => databaseTableExists(table))
        )
      ).every(Boolean);
      const catalogTablesReady =
        (await databaseTableExists('products')) && (await databaseTableExists('services'));
      const cashTablesReady =
        (await databaseTableExists('cash_registers')) &&
        (await databaseTableExists('cash_movements'));
      const counterSalesTablesReady =
        (await databaseTableExists('counter_sales')) &&
        (await databaseTableExists('counter_sale_items')) &&
        (await databaseTableExists('counter_sale_payments'));
      const quotesTablesReady =
        (await databaseTableExists('quotes')) && (await databaseTableExists('quote_items'));
      const inventoryTablesReady =
        (await databaseTableExists('inventory_items')) &&
        (await databaseTableExists('inventory_consumptions')) &&
        (await databaseTableExists('inventory_lots'));
      const procurementTablesReady =
        (await databaseTableExists('inventory_purchases')) &&
        (await databaseTableExists('inventory_purchase_lines')) &&
        (await databaseTableExists('inventory_transfers'));
      const staffTimeOffTableReady =
        (await databaseTableExists('staff')) && (await databaseTableExists('staff_time_off'));
      const schedulingTablesReady =
        (await databaseTableExists('appointments')) &&
        (await databaseTableExists('scheduling_queue_entries')) &&
        (await databaseTableExists('scheduling_queue_transfers'));
      const triageTablesReady =
        (await databaseTableExists('triage_records')) &&
        (await databaseTableExists('triage_record_versions'));
      const usersTablesReady =
        (await databaseTableExists('users')) &&
        (await databaseTableExists('roles')) &&
        (await databaseTableExists('permissions')) &&
        (await databaseTableExists('user_roles')) &&
        (await databaseTableExists('role_permissions'));
      const accessControlTablesReady =
        usersTablesReady &&
        (await databaseTableExists('access_teams')) &&
        (await databaseTableExists('access_sectors')) &&
        (await databaseTableExists('access_team_memberships')) &&
        (await databaseTableExists('access_sector_memberships')) &&
        (await databaseTableExists('access_user_permissions')) &&
        (await databaseTableExists('access_team_permissions')) &&
        (await databaseTableExists('access_sector_permissions'));
      const encounterFinancialTablesReady =
        (await databaseTableExists('encounter_financial_accounts')) &&
        (await databaseTableExists('encounter_receivables')) &&
        (await databaseTableExists('encounter_receivable_payments'));
      const prescriptionExecutionTablesReady =
        (await databaseTableExists('prescription_executions')) &&
        (await databaseTableExists('administration_events'));
      const dischargeTableReady = await databaseTableExists('discharges');
      const consentTablesReady =
        (await databaseTableExists('consent_records')) &&
        (await databaseTableExists('data_subject_requests'));
      const webhookTablesReady =
        (await databaseTableExists('webhooks')) &&
        (await databaseTableExists('webhook_deliveries'));
      const apiKeyTablesReady =
        (await databaseTableExists('api_keys')) &&
        (await databaseTableExists('api_key_usage')) &&
        (await databaseTableExists('api_key_rate_limits'));
      const mfaTablesReady =
        (await databaseTableExists('mfa_credentials')) &&
        (await databaseTableHasColumns('mfa_credentials', mfaCredentialRequiredColumns));
      const mfaLoginChallengesReady = await databaseTableExists(
        'auth_mfa_login_challenges'
      );
      const outboxTablesReady = await databaseTableExists('outbox_events');
      const pixTablesReady = await databaseTableExists('pix_transactions');
      const pixProviderSettlementDlqReady =
        (await databaseTableExists('pix_provider_events')) &&
        (await databaseTableExists('pix_provider_event_deliveries')) &&
        (await databaseFunctionExists(
          'app.redrive_pix_provider_event_delivery(uuid,uuid,uuid,text,text)'
        ));
      const encounterCashReceiptsReady = await databaseTableExists('encounter_cash_receipts');
      const encounterPixPaymentAttemptsReady = await databaseTableExists(
        'encounter_payment_attempts'
      );
      const laboratoryResultImportsReady = await databaseTableExists('laboratory_result_imports');

      results.repositories = {
        session: new DatabaseSessionRepository(db),
        audit: new DatabaseAuditRepository(db),
        owner: new DatabaseOwnerRepository(db),
        patient: new DatabasePatientRepository(db),
        ownerPatientLink: ownerPatientLinksReady
          ? new DatabaseOwnerPatientLinkRepository(db)
          : undefined,
        patientMerge: (await databaseTableExists('patient_merges'))
          ? new DatabasePatientMergeRepository(db)
          : undefined,
        laboratoryResultImport: laboratoryResultImportsReady
          ? new DatabaseLaboratoryResultImportRepository(db)
          : undefined,
        encounter: new DatabaseEncounterRepository(db),
        encounterTimeline: new DatabaseEncounterTimelineRepository(db),
        clinicalHandoff: clinicalHandoffsReady
          ? new DatabaseClinicalHandoffRepository()
          : productionLike
            ? undefined
            : new InMemoryClinicalHandoffRepository(),
        medicalRecord: new DatabaseMedicalRecordRepository(db),
        clinicalEntry: new DatabaseClinicalEntryRepository(db),
        clinicalTimeline: new DatabaseClinicalTimelineRepository(db),
        entryRevision: new DatabaseEntryRevisionRepository(db),
        attachment: new DatabaseAttachmentRepository(db),
        notification: new DatabaseNotificationRepository(db) as NotificationRepository,
        inpatientStay: inpatientStayRepositoryReady
          ? new DatabaseInpatientStayRepository(db)
          : undefined,
        inpatientProgress:
          inpatientStayRepositoryReady && inpatientProgressReady
            ? new DatabaseInpatientProgressRepository(db)
            : undefined,
        inpatientOccurrence: inpatientOccurrenceReady
          ? new DatabaseInpatientOccurrenceRepository(db)
          : undefined,
        inpatientDailyCharge: inpatientDailyChargesReady
          ? new DatabaseInpatientDailyChargeRepository(db)
          : undefined,
        surgeryCase: surgeryCasesReady ? new DatabaseSurgeryCaseRepository(db) : undefined,
        diagnosticOrder: new DatabaseDiagnosticOrderRepository(db),
        laboratoryCatalog: new DatabaseLaboratoryCatalogRepository(
          db
        ) as LaboratoryCatalogRepository,
        discharge: dischargeTableReady ? new DatabaseDischargeRepository() : undefined,
        prescriptionExecution: prescriptionExecutionTablesReady
          ? new DatabasePrescriptionExecutionRepository()
          : undefined,
        administrationEvent: prescriptionExecutionTablesReady
          ? new DatabaseAdministrationEventRepository()
          : undefined,
        prescription: clinicalEntriesReady ? new DatabasePrescriptionRepository(db) : undefined,
        billing: billingTablesReady ? new DatabaseBillingRepository() : undefined,
        commercial: commercialTablesReady ? new DatabaseCommercialRepository() : undefined,
        commissions: commissionsTablesReady ? new DatabaseCommissionRepository() : undefined,
        packages: packagesTablesReady ? new DatabasePackageRepository() : undefined,
        reports: reportsTablesReady ? new DatabaseReportRepository() : undefined,
        marketing: marketingTablesReady ? new DatabaseMarketingRepository() : undefined,
        encounterFinancial: encounterFinancialTablesReady
          ? new DatabaseEncounterFinancialRepository()
          : undefined,
        financialPayables: financialPayablesReady
          ? new DatabaseFinancialPayablesRepository()
          : undefined,
        ledger: ledgerTablesReady ? new DatabaseFinancialLedgerRepository() : undefined,
        inventory: inventoryTablesReady
          ? new DatabaseInventoryRepository({
              stockMovementsEnabled: inventoryStockMovementsReady
          })
          : undefined,
        procurement: procurementTablesReady ? new DatabaseProcurementRepository() : undefined,
        scheduling: schedulingTablesReady ? new DatabaseSchedulingRepository() : undefined,
        agendaConfig: schedulingTablesReady ? new DatabaseAgendaConfigRepository() : undefined,
        triage: triageTablesReady ? new DatabaseTriageRepository() : undefined,
        users: usersTablesReady ? new DatabaseUsersRepository() : undefined,
        accessControl: accessControlTablesReady ? new DatabaseAccessControlRepository() : undefined,
        products: catalogTablesReady ? new DatabaseProductsRepository() : undefined,
        services: catalogTablesReady ? new DatabaseServicesRepository() : undefined,
        counterSales: counterSalesTablesReady ? new DatabaseCounterSalesRepository() : undefined,
        quotes: quotesTablesReady ? new DatabaseQuotesRepository() : undefined,
        cash: cashTablesReady ? new DatabaseCashRepository() : undefined,
        staff: await databaseTableExists('staff') ? new DatabaseStaffRepository() : undefined,
        staffTimeOff: staffTimeOffTableReady
          ? new DatabaseStaffTimeOffRepository()
          : undefined,
        mfa: mfaTablesReady ? new DatabaseMfaRepository(db) : undefined,
        mfaLoginChallenge: mfaLoginChallengesReady
          ? new DatabaseMfaLoginChallengeRepository(db)
          : undefined,
        consent: consentTablesReady ? new DatabaseConsentRepository(db) : undefined,
        dsr: consentTablesReady ? new DatabaseDsrRepository(db) : undefined,
        webhook: webhookTablesReady ? new DatabaseWebhookRepository(db) : undefined,
        apiKey: apiKeyTablesReady ? new DatabaseApiKeyRepository() : undefined,
        outbox: outboxTablesReady ? new DatabaseOutboxRepository() : undefined,
        pixTransaction: pixTablesReady ? new DatabasePixTransactionRepository() : undefined,
        encounterCashReceipt: encounterCashReceiptsReady
          ? new DatabaseEncounterCashReceiptRepository()
          : undefined,
        encounterPixPaymentAttempt: encounterPixPaymentAttemptsReady
          ? new DatabaseEncounterPixPaymentAttemptRepository()
          : undefined
      };
      results.pixProviderSettlementDlqRepository = pixProviderSettlementDlqReady
        ? new DatabasePixProviderSettlementDlqRepository()
        : undefined;
      if (productionLike) {
        assertProductionDatabaseReadiness({
          repositories: results.repositories,
          unitOfWork: results.unitOfWork
        });
      }
      results.repositoriesUseDatabase = true;
      results.fileStorage = new LocalFileStorage({
        basePath: options.fileStoragePath ?? '/tmp/cvg-his-v2-attachments'
      });
      logger.info('Database repositories initialized for critical auth/encounter runtime', {
        auditPersistence: 'database',
    sessionPersistence: 'database',
        ownerPatientLinkPersistence: ownerPatientLinksReady ? 'database' : 'derived-from-patient',
        prescriptionPersistence: clinicalEntriesReady ? 'database' : 'in-memory',
        billingPersistence: billingTablesReady ? 'database' : 'in-memory',
        commissionsPersistence: commissionsTablesReady ? 'database' : 'in-memory',
        packagesPersistence: packagesTablesReady ? 'database' : 'in-memory',
        reportsPersistence: reportsTablesReady ? 'database' : 'in-memory',
        marketingPersistence: marketingTablesReady ? 'database' : 'in-memory',
        financialPayablesPersistence: financialPayablesReady ? 'database' : 'in-memory',
        inventoryStockMovementsPersistence: inventoryStockMovementsReady ? 'database' : 'disabled',
        procurementPersistence: procurementTablesReady ? 'database' : 'in-memory',
        staffTimeOffPersistence: staffTimeOffTableReady ? 'database' : 'in-memory',
        inpatientStayPersistence: inpatientStayRepositoryReady ? 'database' : 'in-memory',
        inpatientProgressPersistence:
          inpatientStayRepositoryReady && inpatientProgressReady ? 'database' : 'in-memory',
        surgeryPersistence: surgeryCasesReady ? 'database' : 'in-memory',
        encounterTimelinePersistence: 'database'
      });
    } else {
      logger.error('Database connection failed after retries, using in-memory repositories', {
        detail: health.detail
      });
    }
  } catch (error) {
    if (isProductionLikeEnvironment()) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.databaseDetail = message;
    logger.error('Database initialization failed, using in-memory repositories', {
      error: message
    });
  }

  return results;
}

export async function shutdownServices(): Promise<void> {
  try {
    await closeDatabaseClient();
    logger.info('Database connection closed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error closing database', { error: message });
  }
}
