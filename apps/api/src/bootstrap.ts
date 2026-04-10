import {
  createDatabaseClient,
  closeDatabaseClient,
  checkDatabaseHealth,
  getDatabaseClient,
  type DatabaseClient
} from '@cvg-his-v2/shared-database';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { DatabaseSessionRepository } from '@cvg-his-v2/module-auth';
import type { SessionRepository } from '@cvg-his-v2/module-auth';
import { DatabaseAuditRepository } from '@cvg-his-v2/module-audit';
import type { AuditRepository } from '@cvg-his-v2/module-audit';
import { DatabaseOwnerRepository } from '@cvg-his-v2/module-owners';
import type { OwnerRepository } from '@cvg-his-v2/module-owners';
import {
  DatabasePatientRepository,
  DatabaseOwnerPatientLinkRepository
} from '@cvg-his-v2/module-patients';
import type { PatientRepository, OwnerPatientLinkRepository } from '@cvg-his-v2/module-patients';
import {
  DatabaseEncounterRepository,
  DatabaseEncounterTimelineRepository
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
  type InpatientStayRepository,
  type InpatientProgressRepository
} from '@cvg-his-v2/module-inpatient';
import {
  DatabaseSurgeryCaseRepository,
  type SurgeryCaseRepository
} from '@cvg-his-v2/module-surgery';
import {
  DatabaseDiagnosticOrderRepository,
  type DiagnosticOrderRepository
} from '@cvg-his-v2/module-diagnostics';
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
import { DatabaseInventoryRepository } from '@cvg-his-v2/module-inventory';
import { DatabaseSchedulingRepository } from '@cvg-his-v2/module-scheduling';
import { DatabaseStaffRepository } from '@cvg-his-v2/module-staff';
import { DatabaseUsersRepository } from '@cvg-his-v2/module-users';
import { DatabaseTriageRepository } from '@cvg-his-v2/module-triage';
import { DatabaseAccessControlRepository } from '@cvg-his-v2/module-access-control';
import { DatabaseMfaRepository } from '@cvg-his-v2/module-mfa';
import type { MfaRepository } from '@cvg-his-v2/module-mfa';
import { DatabaseConsentRepository, DatabaseDsrRepository } from '@cvg-his-v2/module-lgpd';
import type { ConsentRepository, DsrRepository } from '@cvg-his-v2/module-lgpd';
import { DatabaseWebhookRepository } from '@cvg-his-v2/module-webhooks';
import type { WebhookRepository } from '@cvg-his-v2/module-webhooks';
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

export interface BootstrapOptions {
  databaseUrl?: string;
  skipDatabase?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface BootstrapResult {
  databaseHealthy: boolean;
  databaseDetail: string;
  repositories: RuntimeRepositories;
  fileStorage: FileStorage;
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

// InMemory Repository implementations
class InMemorySessionRepository {
  readonly #sessions = new Map<SessionId, SessionSummary>();
  async create(session: SessionSummary): Promise<void> {
    this.#sessions.set(session.sessionId, session);
  }
  async update(session: SessionSummary | { sessionId: SessionId }): Promise<void> {
    const existing = this.#sessions.get(session.sessionId);
    if (existing)
      this.#sessions.set(session.sessionId, { ...existing, ...session } as SessionSummary);
  }
  async findById(id: SessionId): Promise<SessionSummary | null> {
    return this.#sessions.get(id) ?? null;
  }
  async findByUserId(userId: string): Promise<readonly SessionSummary[]> {
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

  async findById(id: WebhookId): Promise<WebhookSummary | null> {
    return this.#webhooks.get(id) ?? null;
  }

  async findByAccount(accountId: AccountId): Promise<readonly WebhookSummary[]> {
    return Array.from(this.#webhooks.values())
      .filter((webhook) => webhook.accountId === accountId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findActiveByEvent(
    accountId: AccountId,
    event: string
  ): Promise<readonly WebhookSummary[]> {
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

  async findDeliveriesByWebhook(
    webhookId: WebhookId
  ): Promise<readonly WebhookDeliverySummary[]> {
    return Array.from(this.#deliveries.values())
      .filter((delivery) => delivery.webhookId === webhookId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findPendingDeliveries(limit: number): Promise<readonly WebhookDeliverySummary[]> {
    return Array.from(this.#deliveries.values())
      .filter((delivery) => delivery.status === 'pending')
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  }
}

export async function bootstrapServices(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const results: BootstrapResult = {
    databaseHealthy: false,
    databaseDetail: 'Not initialized',
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
    medicalRecord: new InMemoryMedicalRecordRepository(),
    clinicalEntry: new InMemoryClinicalEntryRepository(),
    clinicalTimeline: new InMemoryClinicalTimelineRepository(),
    entryRevision: new InMemoryEntryRevisionRepository(),
    attachment: new InMemoryAttachmentRepository(),
    notification: new InMemoryNotificationRepository() as NotificationRepository,
    webhook: new InMemoryWebhookRepository()
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
      logger.info('Database connection established, using real database repositories', {
        detail: health.detail
      });

      // Get the database client and create real repositories
      const db = getDatabaseClient();

      results.repositories = {
        session: new DatabaseSessionRepository(db),
        audit: new DatabaseAuditRepository(db),
        owner: new DatabaseOwnerRepository(db),
        patient: new DatabasePatientRepository(db),
        ownerPatientLink: new DatabaseOwnerPatientLinkRepository(db),
        encounter: new DatabaseEncounterRepository(db),
        encounterTimeline: new InMemoryEncounterTimelineRepository(),
        medicalRecord: new DatabaseMedicalRecordRepository(db),
        clinicalEntry: new DatabaseClinicalEntryRepository(db),
        clinicalTimeline: new DatabaseClinicalTimelineRepository(db),
        entryRevision: new DatabaseEntryRevisionRepository(db),
        attachment: new DatabaseAttachmentRepository(db),
        notification: new DatabaseNotificationRepository(db) as NotificationRepository,
        inpatientStay: new DatabaseInpatientStayRepository(db),
        inpatientProgress: new DatabaseInpatientProgressRepository(db),
        surgeryCase: new DatabaseSurgeryCaseRepository(db),
        diagnosticOrder: new DatabaseDiagnosticOrderRepository(db),
        discharge: new DatabaseDischargeRepository(),
        prescriptionExecution: new DatabasePrescriptionExecutionRepository(),
        administrationEvent: new DatabaseAdministrationEventRepository(),
        billing: new DatabaseBillingRepository(),
        inventory: new DatabaseInventoryRepository(),
        scheduling: new DatabaseSchedulingRepository(),
        triage: new DatabaseTriageRepository(),
        users: new DatabaseUsersRepository(),
        accessControl: new DatabaseAccessControlRepository(),
        staff: new DatabaseStaffRepository(),
        mfa: new DatabaseMfaRepository(db),
        consent: new DatabaseConsentRepository(db),
        dsr: new DatabaseDsrRepository(db),
        webhook: new DatabaseWebhookRepository(db)
      };
      results.fileStorage = new LocalFileStorage({
        basePath: process.env.FILE_STORAGE_PATH ?? '/tmp/cvg-his-v2-attachments'
      });
    } else {
      logger.error('Database connection failed after retries, using in-memory repositories', {
        detail: health.detail
      });
    }
  } catch (error) {
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

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}
