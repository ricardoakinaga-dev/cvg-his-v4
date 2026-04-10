import { AccessControlService } from '@cvg-his-v2/module-access-control';
import {
  AttachmentsService,
  type AttachmentRepository,
  type FileStorage
} from '@cvg-his-v2/module-attachments';
import { AuditService } from '@cvg-his-v2/module-audit';
import type { AuditRepository } from '@cvg-his-v2/module-audit';
import { AuthService, BruteForceProtection } from '@cvg-his-v2/module-auth';
import type { SessionRepository } from '@cvg-his-v2/module-auth';
import { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import { BillingService } from '@cvg-his-v2/module-billing';
import { DiagnosticsService } from '@cvg-his-v2/module-diagnostics';
import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
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
  InpatientProgressRepository
} from '@cvg-his-v2/module-inpatient';
import { InventoryService, createSeedItems } from '@cvg-his-v2/module-inventory';
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
import { OwnersService } from '@cvg-his-v2/module-owners';
import type { OwnerRepository } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type { PatientRepository, OwnerPatientLinkRepository } from '@cvg-his-v2/module-patients';
import { SchedulingService, createSeedAppointments } from '@cvg-his-v2/module-scheduling';
import { StaffService } from '@cvg-his-v2/module-staff';
import type { StaffRepository } from '@cvg-his-v2/module-staff';
import { SurgeryService } from '@cvg-his-v2/module-surgery';
import type { SurgeryCaseRepository } from '@cvg-his-v2/module-surgery';
import { TriageService } from '@cvg-his-v2/module-triage';
import { UsersService } from '@cvg-his-v2/module-users';
import type { DiagnosticOrderRepository } from '@cvg-his-v2/module-diagnostics';
import { DischargesService } from '@cvg-his-v2/module-discharges';
import { CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import { QuotesService } from '@cvg-his-v2/module-quotes';
import { CashService } from '@cvg-his-v2/module-cash';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { ProductsService } from '@cvg-his-v2/module-products';
import { ServicesService } from '@cvg-his-v2/module-services';
import type { DischargeRepository } from '@cvg-his-v2/module-discharges';
import type { CounterSalesRepository } from '@cvg-his-v2/module-counter-sales';
import type { QuotesRepository } from '@cvg-his-v2/module-quotes';
import type { CashRepository } from '@cvg-his-v2/module-cash';
import { PrescriptionExecutionsService } from '@cvg-his-v2/module-prescription-executions';
import type {
  PrescriptionExecutionRepository,
  AdministrationEventRepository
} from '@cvg-his-v2/module-prescription-executions';
import { MfaService, validateMasterKey, type MfaRepository } from '@cvg-his-v2/module-mfa';
import { LgpdService, type ConsentRepository, type DsrRepository } from '@cvg-his-v2/module-lgpd';
import { WebhooksService, type WebhookRepository } from '@cvg-his-v2/module-webhooks';
import { EventBusService, type OutboxRepository } from '@cvg-his-v2/module-event-bus';
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
import { createCorrelationId } from '@cvg-his-v2/shared-utils';

import type { BillingRepository } from '@cvg-his-v2/module-billing';
import type { InventoryRepository } from '@cvg-his-v2/module-inventory';
import type { SchedulingRepository } from '@cvg-his-v2/module-scheduling';
import type { TriageRepository } from '@cvg-his-v2/module-triage';
import type { UsersRepository } from '@cvg-his-v2/module-users';
import type { AccessControlRepository } from '@cvg-his-v2/module-access-control';
import type { ProductsRepository } from '@cvg-his-v2/module-products';
import type { ServicesRepository } from '@cvg-his-v2/module-services';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';

import { createInMemoryRuntimeRepositories } from './runtime-repositories.js';

export interface RuntimeRepositories {
  readonly session?: SessionRepository;
  readonly audit?: AuditRepository;
  readonly owner?: OwnerRepository;
  readonly patient?: PatientRepository;
  readonly ownerPatientLink?: OwnerPatientLinkRepository;
  readonly encounter?: EncounterRepository;
  readonly encounterTimeline?: EncounterTimelineRepository;
  readonly medicalRecord?: MedicalRecordRepository;
  readonly clinicalEntry?: ClinicalEntryRepository;
  readonly clinicalTimeline?: ClinicalTimelineRepository;
  readonly entryRevision?: EntryRevisionRepository;
  readonly attachment?: AttachmentRepository;
  readonly notification?: NotificationRepository;
  readonly inpatientStay?: InpatientStayRepository;
  readonly inpatientProgress?: InpatientProgressRepository;
  readonly surgeryCase?: SurgeryCaseRepository;
  readonly diagnosticOrder?: DiagnosticOrderRepository;
  readonly discharge?: DischargeRepository;
  readonly prescriptionExecution?: PrescriptionExecutionRepository;
  readonly administrationEvent?: AdministrationEventRepository;
  readonly billing?: BillingRepository;
  readonly inventory?: InventoryRepository;
  readonly scheduling?: SchedulingRepository;
  readonly triage?: TriageRepository;
  readonly users?: UsersRepository;
  readonly accessControl?: AccessControlRepository;
  readonly products?: ProductsRepository;
  readonly services?: ServicesRepository;
  readonly counterSales?: CounterSalesRepository;
  readonly quotes?: QuotesRepository;
  readonly cash?: CashRepository;
  readonly staff?: StaffRepository;
  readonly mfa?: MfaRepository;
  readonly consent?: ConsentRepository;
  readonly dsr?: DsrRepository;
  readonly webhook?: WebhookRepository;
  readonly apiKey?: ApiKeyRepository;
  readonly outbox?: OutboxRepository;
}

export interface ApiRuntimeOptions {
  readonly authSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly repositories?: RuntimeRepositories;
  readonly fileStorage?: FileStorage;
  readonly sectorBedOptions?: SectorBedServiceOptions;
  readonly enableMfa?: boolean;
  readonly mfaEncryptionKey?: string;
}

export function createApiRuntime(options: ApiRuntimeOptions) {
  const repos = options.repositories ?? {};
  const inMemoryRepos = createInMemoryRuntimeRepositories();

  const accessControl = new AccessControlService({ repository: repos.accessControl });
  const users = new UsersService({ repository: repos.users });
  const staff = new StaffService({ repository: repos.staff });
  const owners = new OwnersService({ ownerRepository: repos.owner });
  const webhooks = new WebhooksService({ repository: repos.webhook ?? inMemoryRepos.webhook });
  const apiKeys = new ApiKeysService(repos.apiKey ?? inMemoryRepos.apiKey);
  const eventBus = new EventBusService(repos.outbox ?? inMemoryRepos.outbox);

  async function publishEvent(
    moduleName: ModuleName,
    eventType: string,
    payload: Record<string, unknown>
  ) {
    await eventBus.publish({
      correlationId: createCorrelationId('evt') as CorrelationId,
      moduleName,
      eventType,
      payload
    });
  }

  const patients = new PatientsService({
    owners,
    patientRepository: repos.patient,
    ownerPatientLinkRepository: repos.ownerPatientLink,
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
      await webhooks.dispatch(patient.accountId, 'patient.created', {
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
  const scheduling = new SchedulingService(owners, patients, [], {
    repository: repos.scheduling,
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
      await webhooks.dispatch(appointment.accountId, 'appointment.scheduled', {
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
      void appointmentReminderWorkflow.onAppointmentScheduled(appointment);
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
      await webhooks.dispatch(appointment.accountId, 'appointment.status_changed', {
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
  });
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository: repos.encounter,
    encounterTimelineRepository: repos.encounterTimeline,
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
      await webhooks.dispatch(encounter.accountId, 'encounter.created', {
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
      await webhooks.dispatch(encounter.accountId, 'encounter.status_changed', {
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
    sectorBedService
  });
  const surgery = new SurgeryService(encounters, {
    surgeryCaseRepository: repos.surgeryCase
  });
  const diagnostics = new DiagnosticsService(encounters, {
    diagnosticOrderRepository: repos.diagnosticOrder
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
      await webhooks.dispatch(record.accountId, 'billing.record.created', {
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
      await webhooks.dispatch(record.accountId, 'billing.status_changed', {
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
  const inventory = new InventoryService(encounters, createSeedItems(), {
    repository: repos.inventory
  });
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
      await webhooks.dispatch(notification.accountId, 'notification.sent', {
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
    fileStorage: options.fileStorage
  });
  const audit = new AuditService({ auditRepository: repos.audit });
  audit.seedSystemEvent('Phase 8 administrative care bridge initialized');
  const discharges = new DischargesService({ dischargeRepository: repos.discharge });
  const prescriptionExecutions = new PrescriptionExecutionsService({
    executionRepository: repos.prescriptionExecution,
    eventRepository: repos.administrationEvent
  });
  const products = new ProductsService({ repository: repos.products });
  const services = new ServicesService({ repository: repos.services });
  const cash = new CashService({ repository: repos.cash });
  const counterSales = new CounterSalesService({
    repository: repos.counterSales,
    inventoryService: {
      async consumeForSale(accountId: AccountId, codeSnapshot: string, quantity: number) {
        const items = inventory.listItems().filter((i) => i.sku === codeSnapshot);
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
    const encryptionKey = options.mfaEncryptionKey ?? process.env.MFA_SECRET_ENCRYPTION_KEY;
    validateMasterKey(encryptionKey);
    mfa = new MfaService({ repository: repos.mfa, encryptionKey });
  }

  const lgpd = new LgpdService({
    consentRepository: repos.consent,
    dsrRepository: repos.dsr
  });

  const auth = new AuthService({
    secret: options.authSecret,
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
    accessControl,
    users,
    staff,
    owners,
    patients,
    encounters,
    scheduling,
    triage,
    medicalRecords,
    attachments,
    inpatient,
    sectorBedService,
    surgery,
    diagnostics,
    billing,
    inventory,
    notifications,
    audit,
    discharges,
    prescriptionExecutions,
    products,
    services,
    counterSales,
    quotes,
    cash,
    auth,
    lgpd,
    webhooks,
    apiKeys,
    eventBus
  };

  return {
    ...serviceMap,
    async initialize(): Promise<void> {
      await Promise.allSettled([
        accessControl.hydrateFromDatabase('acc_cvg_demo' as never),
        billing.hydrateFromDatabase(),
        inventory.hydrateFromDatabase(),
        scheduling.hydrateFromDatabase(),
        triage.hydrateFromDatabase(undefined as never),
        staff.hydrateFromDatabase(undefined as never),
        users.hydrateFromDatabase(),
        products.hydrateFromDatabase('' as never),
        services.hydrateFromDatabase('' as never),
        counterSales.hydrateFromDatabase('' as never),
        quotes.hydrateFromDatabase('' as never)
      ]);
    }
  };
}
