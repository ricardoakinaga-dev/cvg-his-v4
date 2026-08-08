import { AccessControlService } from '@cvg-his-v2/module-access-control';
import {
  AttachmentsService,
  type AttachmentRepository,
  type AttachmentSecurityScanner,
  type FileStorage
} from '@cvg-his-v2/module-attachments';
import { AuditService } from '@cvg-his-v2/module-audit';
import type { AuditRepository } from '@cvg-his-v2/module-audit';
import { AuthService, BruteForceProtection } from '@cvg-his-v2/module-auth';
import type { SessionRepository } from '@cvg-his-v2/module-auth';
import { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import { BillingService } from '@cvg-his-v2/module-billing';
import { CommercialService } from '@cvg-his-v2/module-commercial';
import type { CommercialRepository } from '@cvg-his-v2/module-commercial';
import { CommissionsService } from '@cvg-his-v2/module-commissions';
import type { CommissionRepository } from '@cvg-his-v2/module-commissions';
import { PackagesService } from '@cvg-his-v2/module-packages';
import type { PackageRepository } from '@cvg-his-v2/module-packages';
import {
  EncounterFinancialService,
  FinancialIncomeStatementService,
  FinancialPayablesService,
  FinancialLedgerService,
  InMemoryFinancialLedgerRepository,
  InMemoryEncounterFinancialRepository,
  InMemoryFinancialPayablesRepository,
  type EncounterFinancialRepository,
  type FinancialPayablesRepository,
  type FinancialLedgerRepository
} from '@cvg-his-v2/module-financial';
import {
  DiagnosticsService,
  InMemoryLaboratoryCatalogRepository,
  LaboratoryService
} from '@cvg-his-v2/module-diagnostics';
import { ClinicalHandoffsService, EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  ClinicalHandoffRepository,
  EncounterRepository,
  EncounterTimelineRepository
} from '@cvg-his-v2/module-encounters';
import {
  InpatientService,
  SectorBedService,
  type SectorBedServiceOptions
} from '@cvg-his-v2/module-inpatient';
import type {
  InpatientStayRepository,
  InpatientProgressRepository,
  InpatientOccurrenceRepository,
  InpatientDailyChargeRepository
} from '@cvg-his-v2/module-inpatient';
import {
  InventoryService,
  ProcurementService,
  createSeedItems,
  type ProcurementRepository
} from '@cvg-his-v2/module-inventory';
import {
  MedicalRecordsService,
  type MedicalRecordRepository,
  type ClinicalEntryRepository,
  type ClinicalTimelineRepository,
  type EntryRevisionRepository
} from '@cvg-his-v2/module-medical-records';
import {
  NotificationsService,
  type NotificationRepository
} from '@cvg-his-v2/module-notifications';
import { OwnersService, createSeedOwners } from '@cvg-his-v2/module-owners';
import type { OwnerRepository } from '@cvg-his-v2/module-owners';
import { PatientsService, createSeedLinks, createSeedPatients } from '@cvg-his-v2/module-patients';
import type {
  PatientRepository,
  OwnerPatientLinkRepository,
  PatientMergeRepository
} from '@cvg-his-v2/module-patients';
import { SchedulingService, createSeedAppointments } from '@cvg-his-v2/module-scheduling';
import { StaffService, createSeedStaff } from '@cvg-his-v2/module-staff';
import type { StaffRepository, StaffTimeOffRepository } from '@cvg-his-v2/module-staff';
import { SurgeryService } from '@cvg-his-v2/module-surgery';
import type { SurgeryCaseRepository } from '@cvg-his-v2/module-surgery';
import { TriageService } from '@cvg-his-v2/module-triage';
import { UsersService } from '@cvg-his-v2/module-users';
import type {
  DiagnosticOrderRepository,
  LaboratoryCatalogRepository
} from '@cvg-his-v2/module-diagnostics';
import { DischargesService } from '@cvg-his-v2/module-discharges';
import {
  CounterSalesService,
  type CounterSaleCloseResult,
  type CounterSalePaymentSummary
} from '@cvg-his-v2/module-counter-sales';
import { QuotesService } from '@cvg-his-v2/module-quotes';
import { ReportsService, type ReportRepository } from '@cvg-his-v2/module-reports';
import { CashService } from '@cvg-his-v2/module-cash';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { ProductsService } from '@cvg-his-v2/module-products';
import { ServicesService } from '@cvg-his-v2/module-services';
import type { DischargeRepository } from '@cvg-his-v2/module-discharges';
import type { CounterSalesRepository } from '@cvg-his-v2/module-counter-sales';
import type { QuotesRepository } from '@cvg-his-v2/module-quotes';
import type { CashRepository } from '@cvg-his-v2/module-cash';
import { PrescriptionsService } from '@cvg-his-v2/module-prescriptions';
import type { PrescriptionRepository } from '@cvg-his-v2/module-prescriptions';
import { PrescriptionExecutionsService } from '@cvg-his-v2/module-prescription-executions';
import type {
  PrescriptionExecutionRepository,
  AdministrationEventRepository
} from '@cvg-his-v2/module-prescription-executions';
import { MfaService, validateMasterKey, type MfaRepository } from '@cvg-his-v2/module-mfa';
import {
  LgpdService,
  type ConsentRepository,
  type DsrRepository,
  type LgpdDataProvider
} from '@cvg-his-v2/module-lgpd';
import {
  MarketingService,
  type MarketingRepository,
  type MarketingConsentChecker
} from '@cvg-his-v2/module-marketing';
import { WebhooksService, type WebhookRepository } from '@cvg-his-v2/module-webhooks';
import { EventBusService, type OutboxRepository } from '@cvg-his-v2/module-event-bus';
import { ConsumerRegistry } from './consumers/index.js';
import { BillingEventHandlers } from './consumers/billing.consumer.js';
import { PaymentsEventHandlers } from './consumers/payments.consumer.js';
import { WebhooksEventHandlers } from './consumers/webhooks.consumer.js';
import {
  WhatsAppProviderService,
  RuntimeOwnerLookup,
  RuntimePatientLookup,
  RuntimeSettingsLookup,
  EnvNotificationSettingsProvider,
  AppointmentReminderWorkflow,
  type NotificationSettingsProvider,
  type OwnerLookup,
  type PatientLookup,
  type SettingsLookup
} from '@cvg-his-v2/module-notifications-whatsapp';
import type { ApiKeyRepository } from '@cvg-his-v2/module-api-keys';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { getTenantContext, runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { trace as otelTrace } from '@opentelemetry/api';
import {
  withTenantTransaction,
  type JsonValue,
  type TenantUnitOfWork
} from '@cvg-his-v2/shared-database';

import type { BillingRepository } from '@cvg-his-v2/module-billing';
import type { InventoryRepository } from '@cvg-his-v2/module-inventory';
import type { SchedulingRepository } from '@cvg-his-v2/module-scheduling';
import type { AgendaConfigRepository } from './repositories/agenda-config-repository.js';
import type { TriageRepository } from '@cvg-his-v2/module-triage';
import type { UsersRepository } from '@cvg-his-v2/module-users';
import type { AccessControlRepository } from '@cvg-his-v2/module-access-control';
import type { ProductsRepository } from '@cvg-his-v2/module-products';
import type { ServicesRepository } from '@cvg-his-v2/module-services';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import type { FeatureRepository } from '@cvg-his-v2/module-ml';
import type { ModelRepository } from '@cvg-his-v2/module-ml';
import {
  FeatureStoreService,
  ModelRegistryService,
  SmartSchedulingService
} from '@cvg-his-v2/module-ml';

import { createInMemoryRuntimeRepositories } from './runtime-repositories.js';
import {
  InMemoryPixTransactionRepository,
  type PixTransactionRepository
} from './pix-transaction-repository.js';
import {
  InMemoryCardTransactionRepository,
  type CardTransactionRepository
} from './card-transaction-repository.js';
import type { LaboratoryResultImportRepository } from './laboratory-result-import-repository.js';

function sanitizeAuditValue(value: string): string {
  return value.replace(/[;\n\r=]/g, ' ').trim();
}

export interface RuntimeRepositories {
  readonly session?: SessionRepository;
  readonly audit?: AuditRepository;
  readonly owner?: OwnerRepository;
  readonly patient?: PatientRepository;
  readonly ownerPatientLink?: OwnerPatientLinkRepository;
  readonly patientMerge?: PatientMergeRepository;
  readonly encounter?: EncounterRepository;
  readonly encounterTimeline?: EncounterTimelineRepository;
  readonly clinicalHandoff?: ClinicalHandoffRepository;
  readonly medicalRecord?: MedicalRecordRepository;
  readonly clinicalEntry?: ClinicalEntryRepository;
  readonly clinicalTimeline?: ClinicalTimelineRepository;
  readonly entryRevision?: EntryRevisionRepository;
  readonly attachment?: AttachmentRepository;
  readonly notification?: NotificationRepository;
  readonly inpatientStay?: InpatientStayRepository;
  readonly inpatientProgress?: InpatientProgressRepository;
  readonly inpatientOccurrence?: InpatientOccurrenceRepository;
  readonly inpatientDailyCharge?: InpatientDailyChargeRepository;
  readonly surgeryCase?: SurgeryCaseRepository;
  readonly diagnosticOrder?: DiagnosticOrderRepository;
  readonly laboratoryCatalog?: LaboratoryCatalogRepository;
  readonly laboratoryResultImport?: LaboratoryResultImportRepository;
  readonly discharge?: DischargeRepository;
  readonly prescriptionExecution?: PrescriptionExecutionRepository;
  readonly administrationEvent?: AdministrationEventRepository;
  readonly prescription?: PrescriptionRepository;
  readonly billing?: BillingRepository;
  readonly commercial?: CommercialRepository;
  readonly commissions?: CommissionRepository;
  readonly packages?: PackageRepository;
  readonly reports?: ReportRepository;
  readonly inventory?: InventoryRepository;
  readonly procurement?: ProcurementRepository;
  readonly scheduling?: SchedulingRepository;
  readonly agendaConfig?: AgendaConfigRepository;
  readonly triage?: TriageRepository;
  readonly users?: UsersRepository;
  readonly accessControl?: AccessControlRepository;
  readonly products?: ProductsRepository;
  readonly services?: ServicesRepository;
  readonly counterSales?: CounterSalesRepository;
  readonly quotes?: QuotesRepository;
  readonly cash?: CashRepository;
  readonly staff?: StaffRepository;
  readonly staffTimeOff?: StaffTimeOffRepository;
  readonly mfa?: MfaRepository;
  readonly consent?: ConsentRepository;
  readonly dsr?: DsrRepository;
  readonly marketing?: MarketingRepository;
  readonly webhook?: WebhookRepository;
  readonly apiKey?: ApiKeyRepository;
  readonly outbox?: OutboxRepository;
  readonly feature?: FeatureRepository;
  readonly model?: ModelRepository;
  readonly encounterFinancial?: EncounterFinancialRepository;
  readonly financialPayables?: FinancialPayablesRepository;
  readonly ledger?: FinancialLedgerRepository;
  readonly pixTransaction?: PixTransactionRepository;
  readonly cardTransaction?: CardTransactionRepository;
}

export interface ApiRuntimeOptions {
  readonly authSecret: string;
  readonly authVerifierSecrets?: readonly string[];
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly repositories?: RuntimeRepositories;
  readonly fileStorage?: FileStorage;
  readonly attachmentScanner?: AttachmentSecurityScanner;
  readonly sectorBedOptions?: SectorBedServiceOptions;
  readonly enableMfa?: boolean;
  readonly mfaEncryptionKey?: string;
  /** Gates distributed runtime state (Redis-backed session, encounter timeline, etc.) */
  readonly runtimeDistributedStateEnabled?: boolean;
  /** Gates automatic WhatsApp reminder dispatch on appointment creation. */
  readonly notificationsWhatsappRemindersEnabled?: boolean;
  /** Keeps canonical seed principals even when a users repository is configured. */
  readonly preserveSeedUsersWithRepository?: boolean;
  /** Keeps canonical owner/patient registry seeds even when repositories are configured. */
  readonly preserveSeedMasterDataWithRepository?: boolean;
  /** Enforces UUID entity identifiers when runtime repositories target the canonical SQL schema. */
  readonly requireUuidEntityIdentifiers?: boolean;
  readonly unitOfWork?: TenantUnitOfWork;
}

function createRuntimeSeeds<T>(
  repository: unknown,
  fallbackSeeds: readonly T[],
  preserveWithRepository = false
): readonly T[] {
  return repository && !preserveWithRepository ? [] : fallbackSeeds;
}

export function createApiRuntime(options: ApiRuntimeOptions) {
  const repos = options.repositories ?? {};
  const inMemoryRepos = createInMemoryRuntimeRepositories();

  const accessControl = new AccessControlService({ repository: repos.accessControl });
  const users = new UsersService({
    repository: repos.users,
    seedUsersEnabled: repos.users === undefined || options.preserveSeedUsersWithRepository === true
  });
  const preserveSeedMasterDataWithRepository =
    options.preserveSeedMasterDataWithRepository === true;
  const staff = new StaffService(
    { repository: repos.staff, timeOffRepository: repos.staffTimeOff },
    createRuntimeSeeds(repos.staff, createSeedStaff())
  );
  const owners = new OwnersService({
    ownerRepository: repos.owner,
    seedOwners: createRuntimeSeeds(
      repos.owner,
      createSeedOwners(),
      preserveSeedMasterDataWithRepository
    )
  });
  const webhooks = new WebhooksService({ repository: repos.webhook ?? inMemoryRepos.webhook });
  const apiKeys = new ApiKeysService(repos.apiKey ?? inMemoryRepos.apiKey);
  const eventBus = new EventBusService(repos.outbox ?? inMemoryRepos.outbox);

  // ML services — F3-01/F3-02/F3-03 (GAP-09)
  // Priority: SmartSchedulingService (F3-03) is the primary consumer-facing service,
  // backed by ModelRegistryService (F3-02) and FeatureStoreService (F3-01)
  const modelRegistry = new ModelRegistryService(repos.model ?? inMemoryRepos.model);
  const featureStore = new FeatureStoreService(repos.feature ?? inMemoryRepos.feature);
  const smartScheduling = new SmartSchedulingService(modelRegistry);

  async function publishEvent(
    moduleName: ModuleName,
    eventType: string,
    payload: Record<string, unknown>
  ) {
    const tenantContext = getTenantContext();
    const correlationId =
      (tenantContext?.correlationId as CorrelationId | undefined) ??
      (createCorrelationId('evt') as CorrelationId);
    const activeSpan = otelTrace.getActiveSpan();
    const activeSpanContext = activeSpan?.spanContext();
    const traceparent =
      activeSpanContext && otelTrace.isSpanContextValid(activeSpanContext)
        ? `00-${activeSpanContext.traceId}-${activeSpanContext.spanId}-${activeSpanContext.traceFlags
            .toString(16)
            .padStart(2, '0')}`
        : undefined;

    await eventBus.publish({
      correlationId,
      moduleName,
      eventType,
      payload: {
        ...payload,
        _meta: {
          ...(typeof payload._meta === 'object' && payload._meta !== null
            ? (payload._meta as Record<string, unknown>)
            : {}),
          correlationId,
          publishedAt: nowIso(),
          sourceService: 'cvg-his-v2-api',
          tenantId: tenantContext?.tenantId,
          accountId: tenantContext?.accountId,
          traceparent
        }
      }
    });
  }

  const patients = new PatientsService({
    owners,
    patientRepository: repos.patient,
    ownerPatientLinkRepository: repos.ownerPatientLink,
    patientMergeRepository: repos.patientMerge,
    seedPatients: createRuntimeSeeds(
      repos.patient,
      createSeedPatients(),
      preserveSeedMasterDataWithRepository
    ),
    seedLinks: createRuntimeSeeds(
      repos.ownerPatientLink,
      createSeedLinks(),
      preserveSeedMasterDataWithRepository
    ),
    async onPatientCreated(patient) {
      await publishEvent('patients' as ModuleName, 'patient.created', {
        id: patient.id,
        accountId: patient.accountId,
        name: patient.name,
        species: patient.species,
        breed: patient.breed,
        sex: patient.sex,
        size: patient.size,
        primaryOwnerId: patient.primaryOwnerId,
        status: patient.status,
        createdAt: patient.createdAt
      });
    }
  });
  const whatsAppProvider = new WhatsAppProviderService(
    new EnvNotificationSettingsProvider('acc_cvg_demo' as AccountId),
    new RuntimeOwnerLookup(owners),
    new RuntimePatientLookup(patients)
  );
  const settingsLookup = new RuntimeSettingsLookup();
  const appointmentReminderWorkflow = new AppointmentReminderWorkflow(
    whatsAppProvider,
    new RuntimeOwnerLookup(owners),
    new RuntimePatientLookup(patients),
    settingsLookup
  );
  const notificationsWhatsappRemindersEnabled =
    options.notificationsWhatsappRemindersEnabled ?? false;
  const services = new ServicesService({ repository: repos.services });
  const scheduling = new SchedulingService(
    owners,
    patients,
    createRuntimeSeeds(repos.scheduling, createSeedAppointments()),
    {
      repository: repos.scheduling,
      staff,
      timeOff: staff,
      agendaConfig: repos.agendaConfig,
      services,
      async onAppointmentCreated(appointment) {
        await publishEvent('scheduling' as ModuleName, 'appointment.scheduled', {
          id: appointment.id,
          accountId: appointment.accountId,
          patientId: appointment.patientId,
          ownerId: appointment.ownerId,
          scheduledAt: appointment.scheduledAt,
          visitType: appointment.visitType,
          reason: appointment.reason,
          status: appointment.status,
          createdAt: appointment.createdAt
        });
        if (!notificationsWhatsappRemindersEnabled) {
          audit.write({
            actorId: 'system',
            accountId: appointment.accountId,
            module: 'notifications',
            action: 'whatsapp_reminder_skipped_flag_disabled',
            entityType: 'appointment',
            entityId: appointment.id,
            payloadSummary: `Automatic WhatsApp reminder skipped for appointment ${appointment.id} because notifications.whatsapp.reminders.enabled is disabled`,
            riskLevel: 'low'
          });
          return;
        }

        const reminderScheduledAudit = audit.write({
          actorId: 'system',
          accountId: appointment.accountId,
          module: 'notifications',
          action: 'whatsapp_reminder_scheduled',
          entityType: 'appointment',
          entityId: appointment.id,
          payloadSummary: `Automatic WhatsApp reminder scheduled for appointment ${appointment.id}`,
          riskLevel: 'low'
        });
        void appointmentReminderWorkflow
          .onAppointmentScheduled(appointment)
          .then((result) => {
            const action = result.sent ? 'whatsapp_reminder_sent' : 'whatsapp_reminder_failed';
            const outcome = result.sent ? 'sent' : 'failed';
            const metadata = [
              `provider=${sanitizeAuditValue(result.provider ?? 'unknown')}`,
              `messageId=${sanitizeAuditValue(result.messageId ?? '')}`,
              `error=${sanitizeAuditValue(result.error ?? '')}`
            ].join('; ');

            audit.write({
              actorId: 'system',
              accountId: appointment.accountId,
              module: 'notifications',
              action,
              entityType: 'appointment',
              entityId: appointment.id,
              payloadSummary: `WhatsApp reminder ${outcome} for appointment ${appointment.id}; ${metadata}`,
              riskLevel: result.sent ? 'low' : 'medium',
              correlationId: reminderScheduledAudit.correlationId
            });
          })
          .catch((error) => {
            audit.write({
              actorId: 'system',
              accountId: appointment.accountId,
              module: 'notifications',
              action: 'whatsapp_reminder_failed',
              entityType: 'appointment',
              entityId: appointment.id,
              payloadSummary: `WhatsApp reminder failed for appointment ${appointment.id}; provider=unknown; messageId=; error=${sanitizeAuditValue(error instanceof Error ? error.message : 'unknown_error')}`,
              riskLevel: 'medium',
              correlationId: reminderScheduledAudit.correlationId
            });
          });
      },
      async onAppointmentStatusChanged(appointment, previousStatus) {
        await publishEvent('scheduling' as ModuleName, 'appointment.status_changed', {
          id: appointment.id,
          accountId: appointment.accountId,
          patientId: appointment.patientId,
          ownerId: appointment.ownerId,
          previousStatus,
          newStatus: appointment.status,
          reason: appointment.reason,
          updatedAt: appointment.updatedAt
        });
      }
    }
  );
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository: repos.encounter,
    encounterTimelineRepository: repos.encounterTimeline,
    requireUuidIdentifiers: options.requireUuidEntityIdentifiers,
    async onEncounterCreated(encounter) {
      await publishEvent('encounters' as ModuleName, 'encounter.created', {
        id: encounter.id,
        accountId: encounter.accountId,
        patientId: encounter.patientId,
        ownerId: encounter.ownerId,
        status: encounter.status,
        visitType: encounter.visitType,
        origin: encounter.origin,
        reason: encounter.reason,
        openedAt: encounter.openedAt,
        createdByUserId: encounter.createdByUserId
      });
    },
    async onEncounterStatusChanged(encounter, previousStatus) {
      await publishEvent('encounters' as ModuleName, 'encounter.status_changed', {
        id: encounter.id,
        accountId: encounter.accountId,
        patientId: encounter.patientId,
        previousStatus,
        newStatus: encounter.status,
        updatedAt: encounter.updatedAt
      });
    }
  });
  const triage = new TriageService(encounters, { repository: repos.triage });
  const clinicalHandoffs = new ClinicalHandoffsService(encounters, {
    repository: repos.clinicalHandoff,
    async onHandoffSent(handoff) {
      await publishEvent('encounters' as ModuleName, 'clinical_handoff.sent_to_reception', {
        id: handoff.id,
        accountId: handoff.accountId,
        encounterId: handoff.encounterId,
        patientId: handoff.patientId,
        ownerId: handoff.ownerId,
        fromSector: handoff.fromSector,
        toSector: handoff.toSector,
        actorId: handoff.sentBy,
        sentAt: handoff.sentAt
      });
    },
    async onHandoffAcknowledged(handoff, previousStatus) {
      await publishEvent('encounters' as ModuleName, 'clinical_handoff.acknowledged', {
        id: handoff.id,
        accountId: handoff.accountId,
        encounterId: handoff.encounterId,
        previousStatus,
        newStatus: handoff.handoffStatus,
        acknowledgedBy: handoff.acknowledgedBy,
        acknowledgedAt: handoff.acknowledgedAt
      });
    }
  });
  const medicalRecords = new MedicalRecordsService({
    encounters,
    patients,
    medicalRecordRepository: repos.medicalRecord,
    clinicalEntryRepository: repos.clinicalEntry,
    clinicalTimelineRepository: repos.clinicalTimeline,
    entryRevisionRepository: repos.entryRevision
  });
  const sectorBedService = new SectorBedService(options.sectorBedOptions ?? {});
  const inpatient = new InpatientService(encounters, {
    stayRepository: repos.inpatientStay,
    progressRepository: repos.inpatientProgress,
    occurrenceRepository: repos.inpatientOccurrence,
    dailyChargeRepository: repos.inpatientDailyCharge,
    sectorBedService
  });
  const surgery = new SurgeryService(encounters, {
    surgeryCaseRepository: repos.surgeryCase
  });
  const diagnostics = new DiagnosticsService(encounters, {
    diagnosticOrderRepository: repos.diagnosticOrder
  });
  const laboratory = new LaboratoryService(diagnostics, {
    catalogRepository: repos.laboratoryCatalog ?? new InMemoryLaboratoryCatalogRepository()
  });
  const billing = new BillingService(encounters, {
    repository: repos.billing,
    async onRecordCreated(record) {
      await publishEvent('billing' as ModuleName, 'billing.record.created', {
        id: record.id,
        accountId: record.accountId,
        encounterId: record.encounterId,
        patientId: record.patientId,
        ownerId: record.ownerId,
        status: record.status,
        createdAt: record.createdAt
      });
    },
    async onStatusChanged(record, previousStatus) {
      await publishEvent('billing' as ModuleName, 'billing.status_changed', {
        accountId: record.accountId,
        recordId: record.id,
        encounterId: record.encounterId,
        patientId: record.patientId,
        ownerId: record.ownerId,
        previousStatus,
        newStatus: record.status,
        subtotalAmount: record.subtotalAmount,
        currency: record.currency,
        updatedAt: record.updatedAt
      });
    }
  });
  const pixTransactions = repos.pixTransaction ?? new InMemoryPixTransactionRepository();
  const cardTransactions = repos.cardTransaction ?? new InMemoryCardTransactionRepository();
  const cash = new CashService({ repository: repos.cash });
  const encounterFinancialRepository = repos.encounterFinancial ?? new InMemoryEncounterFinancialRepository();
  const ledgerRepository = repos.ledger ?? new InMemoryFinancialLedgerRepository();
  const ledger = new FinancialLedgerService(ledgerRepository);
  const encounterFinancial = new EncounterFinancialService(encounters, billing, patients, owners, {
    repository: encounterFinancialRepository,
    async onReceivablePaid(payment) {
      await ledger.postEntry({
        accountId: payment.accountId,
        sourceType: 'receivable_payment',
        sourceId: payment.id,
        description: `Recebimento do atendimento ${payment.encounterId}`,
        createdByUserId: payment.paidByUserId,
        lines: [
          {
            accountCode:
              payment.externalReferenceType === 'pix_transaction'
                ? '1.1.02-bancos-pix'
                : payment.externalReferenceType === 'billing_record'
                  ? '1.1.03-cartoes-a-receber'
                  : '1.1.01-caixa',
            debit: payment.amountPaid,
            credit: 0
          },
          { accountCode: '3.1.01-receita-clinica', debit: 0, credit: payment.amountPaid }
        ]
      });
      if (
        payment.externalReferenceType !== 'pix_transaction' &&
        payment.externalReferenceType !== 'other'
      ) {
        return;
      }

      if (!payment.externalReferenceId) {
        return;
      }

      if (payment.externalReferenceType === 'pix_transaction') {
        await pixTransactions.updateBillingSettlement({
          transactionId: payment.externalReferenceId,
          billingSettlementStatus: 'applied',
          billingSettledAt: payment.paidAt,
          updatedAt: payment.paidAt
        });
        await pixTransactions.updateCashReconciliation({
          transactionId: payment.externalReferenceId,
          cashReconciliationStatus: 'skipped_no_open_register',
          cashReconciledAt: payment.paidAt,
          updatedAt: payment.paidAt
        });
        return;
      }

      await cardTransactions.updateBillingSettlement({
        transactionId: payment.externalReferenceId,
        billingSettlementStatus: 'applied',
        billingSettledAt: payment.paidAt,
        updatedAt: payment.paidAt
      });
    }
  });
  const financialPayablesRepository = repos.financialPayables ?? new InMemoryFinancialPayablesRepository();
  const financialPayables = new FinancialPayablesService(financialPayablesRepository, {
    async onPayablePaid(event) {
      await ledger.postEntry({
        accountId: event.payable.accountId,
        sourceType: 'payable_payment',
        sourceId: `${event.payable.id}:${event.payable.paidAmount}`,
        description: `Pagamento a ${event.payable.supplierName}`,
        createdByUserId: event.paidByUserId,
        lines: [
          {
            accountCode: event.paymentMethod === 'cash' ? '1.1.01-caixa' : '1.1.02-bancos',
            debit: 0,
            credit: event.amountPaid
          },
          {
            accountCode: `4.1.${event.payable.category.slice(0, 40)}`,
            debit: event.amountPaid,
            credit: 0
          }
        ]
      });
      if (event.paymentMethod !== 'cash') return;
      const openRegister = await cash.findOpenRegister(event.payable.accountId);
      if (!openRegister) return;
      await cash.recordMovement(
        openRegister.id,
        event.payable.accountId,
        {
          movementType: 'withdrawal',
          amount: event.amountPaid,
          reference: event.payable.id,
          notes: event.paymentReference
            ? `Pagamento de conta a pagar: ${event.payable.supplierName} (${event.paymentReference})`
            : `Pagamento de conta a pagar: ${event.payable.supplierName}`
        },
        event.paidByUserId
      );
    }
  });
  const financialStatements = new FinancialIncomeStatementService({
    receivables: encounterFinancialRepository,
    payables: financialPayablesRepository
  });

  // Register all domain event consumers via ConsumerRegistry
  // Order matters: payments must run before billing (payment settlement), then webhooks
  const registry = new ConsumerRegistry();
  registry.add(
    'payments',
    new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions, cardTransactions })
  );
  registry.add('billing', new BillingEventHandlers({ billing }));
  registry.add('webhooks', new WebhooksEventHandlers({ webhooks }));
  registry.registerAll(eventBus);

  const inventory = new InventoryService(
    encounters,
    createRuntimeSeeds(repos.inventory, createSeedItems()),
    {
      repository: repos.inventory
    }
  );
  const tenantTransaction = options.unitOfWork
    ? async <T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> =>
        withTenantTransaction(accountId, async () => operation())
    : undefined;
  const procurement = new ProcurementService(inventory, {
    repository: repos.procurement,
    payableGateway: financialPayables,
    transaction: tenantTransaction
  });
  const commercial = new CommercialService({ repository: repos.commercial });
  const commissions = new CommissionsService({
    repository: repos.commissions,
    payableGateway: financialPayables,
    transaction: tenantTransaction
  });
  const packages = new PackagesService({ repository: repos.packages });
  const notifications = new NotificationsService({
    encounters,
    patients,
    notificationRepository: repos.notification,
    async onNotificationSent(notification) {
      await publishEvent('notifications' as ModuleName, 'notification.sent', {
        id: notification.id,
        accountId: notification.accountId,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        channel: notification.channel,
        sentAt: notification.sentAt
      });
    }
  });
  const attachments = new AttachmentsService({
    encounters,
    medicalRecords,
    diagnostics,
    repository: repos.attachment,
    fileStorage: options.fileStorage,
    scanner: options.attachmentScanner
  });
  const audit = new AuditService({ auditRepository: repos.audit });
  audit.seedSystemEvent('Phase 8 administrative care bridge initialized');
  const discharges = new DischargesService({ dischargeRepository: repos.discharge });
  const prescriptions = new PrescriptionsService({
    prescriptionRepository: repos.prescription
  });
  const prescriptionExecutions = new PrescriptionExecutionsService({
    executionRepository: repos.prescriptionExecution,
    eventRepository: repos.administrationEvent
  });
  const products = new ProductsService({ repository: repos.products });
  const reports = new ReportsService({ repository: repos.reports });
  const closeUnitOfWork = options.unitOfWork;
  const counterSales = new CounterSalesService({
    repository: repos.counterSales,
    onClose: async ({ sale, payments }, result) => {
      const paymentAccountCode: Record<CounterSalePaymentSummary['method'], string> = {
        cash: '1.1.01-caixa',
        pix: '1.1.02-bancos-pix',
        credit_card: '1.1.03-cartoes-a-receber',
        debit_card: '1.1.03-cartoes-a-receber',
        bank_transfer: '1.1.02-bancos',
        check: '1.1.04-cheques',
        insurance: '1.1.05-convenios',
        other: '1.1.09-outros-recebiveis'
      };
      const paymentLines = payments.map((payment) => ({
        accountCode: paymentAccountCode[payment.method],
        debit: payment.amount,
        credit: 0,
        memo: `Comanda ${sale.number} — ${payment.method}`
      }));
      await ledger.postEntry({
        accountId: sale.accountId,
        sourceType: 'counter_sale_revenue',
        sourceId: sale.id,
        description: `Receita da comanda ${sale.number}`,
        createdByUserId: sale.closedByUserId,
        lines: [
          ...paymentLines,
          {
            accountCode: '3.1.01-receita-vendas',
            debit: 0,
            credit: sale.total,
            memo: `Venda ${sale.number}`
          }
        ]
      });

      const costAmount = Number(
        (result.inventoryConsumptions ?? []).reduce((sum, item) => sum + item.costAmount, 0).toFixed(2)
      );
      if (costAmount > 0) {
        await ledger.postEntry({
          accountId: sale.accountId,
          sourceType: 'counter_sale_cogs',
          sourceId: sale.id,
          description: `Custo das mercadorias da comanda ${sale.number}`,
          createdByUserId: sale.closedByUserId,
          lines: [
            {
              accountCode: '5.1.01-cmv',
              debit: costAmount,
              credit: 0,
              memo: `CMV ${sale.number}`
            },
            {
              accountCode: '1.2.01-estoque',
              debit: 0,
              credit: costAmount,
              memo: `Baixa de estoque ${sale.number}`
            }
          ]
        });
      }
    },
    closeTransaction: closeUnitOfWork
      ? async (input, execute) => {
          try {
            const transactionResult = await closeUnitOfWork.execute(
              {
                accountId: input.sale.accountId,
                actorUserId: input.closedByUserId,
                correlationId: createCorrelationId('counter-sale-close'),
                operation: 'counter_sale.close',
                idempotencyKey: input.sale.id
              },
              {
                accountId: input.sale.accountId,
                saleId: input.sale.id,
                closedByUserId: input.closedByUserId
              },
              async (transaction) => {
                const result = await execute();
                await transaction.outbox.append({
                  moduleName: 'counter-sales',
                  eventType: 'counter_sale.closed',
                  payload: {
                    accountId: input.sale.accountId,
                    saleId: result.sale.id,
                    saleNumber: result.sale.number,
                    total: result.sale.total,
                    paidAmount: result.sale.paidAmount,
                    closedByUserId: input.closedByUserId
                  }
                });
                await transaction.audit.append({
                  entityType: 'counter-sale',
                  entityId: result.sale.id,
                  action: 'closed',
                  after: { ...result.sale } as Readonly<Record<string, unknown>>,
                  metadata: {
                    saleNumber: result.sale.number,
                    inventoryConsumptions: result.inventoryConsumptions?.length ?? 0,
                    cashMovements: result.cashMovements?.length ?? 0
                  }
                });
                return JSON.parse(JSON.stringify(result)) as JsonValue;
              }
            );
            return transactionResult.value as unknown as CounterSaleCloseResult;
          } catch (error) {
            await Promise.allSettled([
              inventory.hydrateFromDatabase(input.sale.accountId),
              cash.hydrateFromDatabase(input.sale.accountId)
            ]);
            throw error;
          }
        }
      : undefined,
    inventoryService: {
      async consumeForSale(accountId: AccountId, codeSnapshot: string, quantity: number) {
        const items = inventory.listItems(accountId).filter((i) => i.sku === codeSnapshot);
        if (items.length === 0) {
          throw new Error(`Inventory item not found for code: ${codeSnapshot}`);
        }
        const item = items[0];
        return inventory.consumeForSale(accountId, item.id as never, quantity);
      }
    },
    cashService: {
      async getOpenRegister(accountId: AccountId) {
        const reg = await cash.findOpenRegister(accountId);
        if (!reg) return null;
        const balance = await cash.getCurrentBalance(reg.id);
        return { id: reg.id, runningBalance: balance };
      },
      async recordMovement(
        cashRegisterId,
        accountId,
        movementType,
        amount,
        runningBalance,
        reference,
        notes,
        createdByUserId
      ) {
        const movement = await cash.recordPaymentMovement(
          cashRegisterId,
          accountId,
          amount,
          reference,
          notes,
          createdByUserId
        );
        return {
          id: movement.id,
          cashRegisterId: movement.cashRegisterId,
          movementType: movement.movementType as
            | 'payment'
            | 'opening'
            | 'closing'
            | 'supply'
            | 'withdrawal'
            | 'adjustment',
          amount: movement.amount,
          runningBalance: movement.runningBalance,
          reference: movement.reference,
          notes: movement.notes
        };
      }
    }
  });
  const quotes = new QuotesService({ repository: repos.quotes });

  let mfa: MfaService | undefined;
  if (options.enableMfa === true) {
    const encryptionKey = options.mfaEncryptionKey;
    validateMasterKey(encryptionKey);
    mfa = new MfaService({ repository: repos.mfa, encryptionKey });
  }

  const lgpd = new LgpdService({
    consentRepository: repos.consent,
    dsrRepository: repos.dsr,
    dataProviders: {
      owners: (async (_subjectId, context) => {
        const ownerRows =
          context.subjectType === 'owner'
            ? owners.list(context.subjectId)
            : context.subjectType === 'patient'
              ? owners.list().filter((owner) => {
                  const patient = patients.getOrThrow(context.subjectId as never);
                  return owner.id === patient.primaryOwnerId;
                })
              : [];

        return {
          source: 'OwnersService',
          rows: ownerRows.filter((owner) => owner.accountId === context.accountId)
        };
      }) satisfies LgpdDataProvider,
      patients: (async (_subjectId, context) => {
        const patientRows =
          context.subjectType === 'patient'
            ? patients.list(context.subjectId)
            : context.subjectType === 'owner'
              ? patients.list().filter((patient) => patient.primaryOwnerId === context.subjectId)
              : [];

        return {
          source: 'PatientsService',
          rows: patientRows.filter((patient) => patient.accountId === context.accountId)
        };
      }) satisfies LgpdDataProvider,
      encounters: (async (_subjectId, context) => {
        const encounterRows = encounters.listAll().filter((encounter) => {
          if (encounter.accountId !== context.accountId) return false;
          if (context.subjectType === 'patient') return encounter.patientId === context.subjectId;
          if (context.subjectType === 'owner') return encounter.ownerId === context.subjectId;
          return false;
        });
        const timelines = await Promise.all(
          encounterRows.map(async (encounter) => ({
            encounterId: encounter.id,
            events: await encounters.listTimelineAsync(encounter.id)
          }))
        );

        return { source: 'EncountersService', rows: encounterRows, timelines };
      }) satisfies LgpdDataProvider,
      financial: (async (_subjectId, context) => ({
        source: 'BillingService',
        billingRecords: billing.list({
          accountId: context.accountId,
          patientId: context.subjectType === 'patient' ? context.subjectId : undefined,
          ownerId: context.subjectType === 'owner' ? context.subjectId : undefined
        })
      })) satisfies LgpdDataProvider,
      laboratory: (async (_subjectId, context) => {
        const encounterIds = encounters
          .listAll()
          .filter((encounter) => {
            if (encounter.accountId !== context.accountId) return false;
            if (context.subjectType === 'patient') return encounter.patientId === context.subjectId;
            if (context.subjectType === 'owner') return encounter.ownerId === context.subjectId;
            return false;
          })
          .map((encounter) => encounter.id);
        const orders = await laboratory.listOrders(context.accountId as AccountId);

        return {
          source: 'LaboratoryService',
          rows: orders.filter((order) => encounterIds.includes(order.encounterId))
        };
      }) satisfies LgpdDataProvider,
      attachments: (async (_subjectId, context) => {
        const subjectEncounters = encounters.listAll().filter((encounter) => {
          if (encounter.accountId !== context.accountId) return false;
          if (context.subjectType === 'patient') return encounter.patientId === context.subjectId;
          if (context.subjectType === 'owner') return encounter.ownerId === context.subjectId;
          return false;
        });
        const clinicalRecords = await medicalRecords.listAll(context.accountId as AccountId);
        const diagnosticOrders = diagnostics.listByAccount(context.accountId as AccountId);
        const attachmentGroups = await Promise.all([
          ...subjectEncounters.map((encounter) =>
            attachments.listByLinkedEntity('encounter', encounter.id)
          ),
          ...clinicalRecords
            .filter(({ record }) =>
              subjectEncounters.some((encounter) => encounter.id === record.encounterId)
            )
            .map(({ record }) => attachments.listByLinkedEntity('medical_record', record.id)),
          ...diagnosticOrders
            .filter((order) =>
              subjectEncounters.some((encounter) => encounter.id === order.encounterId)
            )
            .map((order) => attachments.listByLinkedEntity('diagnostic_order', order.id))
        ]);

        return { source: 'AttachmentsService', rows: attachmentGroups.flat() };
      }) satisfies LgpdDataProvider
    }
  });
  const consentChecker: MarketingConsentChecker | undefined = repos.consent
    ? {
        async hasActiveConsent(accountId, ownerId, purpose) {
          const active = await repos.consent!.findActiveBySubject(accountId, ownerId, 'owner');
          return active.some((record) =>
            record.purpose === purpose ||
            (purpose === 'marketing' && record.purpose === 'notifications')
          );
        }
      }
    : undefined;
  const marketing = new MarketingService({
    repository: repos.marketing,
    consentChecker,
    requireConsentChecker: Boolean(repos.marketing)
  });

  const auth = new AuthService({
    secret: options.authSecret,
    verifierSecrets: options.authVerifierSecrets,
    accessTokenTtlSeconds: options.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds,
    users,
    staff,
    accessControl,
    audit,
    mfa,
    sessionRepository: repos.session
  });

  const serviceMap = {
    unitOfWork: options.unitOfWork,
    accessControl,
    users,
    staff,
    owners,
    patients,
    encounters,
    clinicalHandoffs,
    scheduling,
    triage,
    medicalRecords,
    attachments,
    inpatient,
    sectorBedService,
    surgery,
    diagnostics,
    laboratory,
    billing,
    encounterFinancial,
    financialPayables,
    ledger,
    financialStatements,
    commercial,
    commissions,
    packages,
    inventory,
    procurement,
    notifications,
    audit,
    discharges,
    prescriptions,
    prescriptionExecutions,
    products,
    reports,
    services,
    counterSales,
    quotes,
    cash,
    auth,
    lgpd,
    marketing,
    webhooks,
    apiKeys,
    eventBus,
    pixTransactions,
    cardTransactions,
    whatsAppProvider,
    // ML services — F3-01/F3-02/F3-03
    modelRegistry,
    featureStore,
    smartScheduling
  };

  return {
    ...serviceMap,
    async initialize(): Promise<void> {
      await users.hydrateFromDatabase();
      await auth.hydrateFromRepository(users.list().map((user) => user.id));

      const accountIds = Array.from(
        new Set<AccountId>([
          ...users.list().map((user) => user.accountId),
          ...staff.list().map((member) => member.accountId),
          ...owners.list().map((owner) => owner.accountId),
          ...patients.list().map((patient) => patient.accountId)
        ])
      ).filter((accountId) => accountId.length > 0);

      if (accountIds.length === 0) {
        await billing.hydrateFromDatabase();
        return;
      }

      for (const accountId of accountIds) {
        await runWithTenantContext(
          {
            tenantId: '00000000-0000-0000-0000-000000000001',
            accountId,
            correlationId: createCorrelationId('boot')
          },
          () =>
            Promise.all([
              staff.hydrateFromDatabase(accountId),
              owners.hydrateFromDatabase(accountId),
              patients.hydrateFromDatabase(accountId),
              encounters.hydrateFromDatabase(accountId),
              clinicalHandoffs.hydrateFromDatabase(accountId),
              accessControl.hydrateFromDatabase(accountId),
              diagnostics.hydrateFromDatabase(accountId),
              laboratory.hydrateCatalog(accountId),
              commercial.hydrateFromDatabase(accountId),
              commissions.hydrateFromDatabase(accountId),
              packages.hydrateFromDatabase(accountId),
              inventory.hydrateFromDatabase(accountId),
              procurement.hydrateFromDatabase(accountId),
              scheduling.hydrateFromDatabase(accountId),
              triage.hydrateFromDatabase(accountId),
              products.hydrateFromDatabase(accountId),
              services.hydrateFromDatabase(accountId),
              counterSales.hydrateFromDatabase(accountId),
              quotes.hydrateFromDatabase(accountId),
              cash.hydrateFromDatabase(accountId),
              reports.hydrateFromDatabase(accountId),
              marketing.hydrateFromDatabase(accountId),
              prescriptions.hydrateFromDatabase(accountId),
              prescriptionExecutions.hydrateFromDatabase(accountId),
              discharges.hydrateFromDatabase(accountId),
              inpatient.hydrateAccount(accountId),
              surgery.hydrateAccount(accountId),
              billing.hydrateFromDatabase(accountId)
            ])
        );
      }
    }
  };
}
