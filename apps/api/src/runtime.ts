import { AccessControlService } from '@cvg-his-v2/module-access-control';
import {
  AttachmentsService,
  type AttachmentRepository,
  type FileStorage
} from '@cvg-his-v2/module-attachments';
import { AuditService } from '@cvg-his-v2/module-audit';
import type { AuditRepository } from '@cvg-his-v2/module-audit';
import { AuthService } from '@cvg-his-v2/module-auth';
import type { SessionRepository } from '@cvg-his-v2/module-auth';
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
import { InventoryService } from '@cvg-his-v2/module-inventory';
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
import { SchedulingService } from '@cvg-his-v2/module-scheduling';
import { StaffService } from '@cvg-his-v2/module-staff';
import { SurgeryService } from '@cvg-his-v2/module-surgery';
import type { SurgeryCaseRepository } from '@cvg-his-v2/module-surgery';
import { TriageService } from '@cvg-his-v2/module-triage';
import { UsersService } from '@cvg-his-v2/module-users';
import type { DiagnosticOrderRepository } from '@cvg-his-v2/module-diagnostics';
import { DischargesService } from '@cvg-his-v2/module-discharges';
import type { DischargeRepository } from '@cvg-his-v2/module-discharges';
import { PrescriptionExecutionsService } from '@cvg-his-v2/module-prescription-executions';
import type { PrescriptionExecutionRepository, AdministrationEventRepository } from '@cvg-his-v2/module-prescription-executions';

import type { BillingRepository } from '@cvg-his-v2/module-billing';
import type { InventoryRepository } from '@cvg-his-v2/module-inventory';
import type { SchedulingRepository } from '@cvg-his-v2/module-scheduling';
import type { TriageRepository } from '@cvg-his-v2/module-triage';
import type { UsersRepository } from '@cvg-his-v2/module-users';
import type { AccessControlRepository } from '@cvg-his-v2/module-access-control';

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
}

export interface ApiRuntimeOptions {
  readonly authSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly repositories?: RuntimeRepositories;
  readonly fileStorage?: FileStorage;
  readonly sectorBedOptions?: SectorBedServiceOptions;
}

export function createApiRuntime(options: ApiRuntimeOptions) {
  const repos = options.repositories ?? {};

  const accessControl = new AccessControlService();
  const users = new UsersService();
  const staff = new StaffService();
  const owners = new OwnersService({ ownerRepository: repos.owner });
  const patients = new PatientsService({
    owners,
    patientRepository: repos.patient,
    ownerPatientLinkRepository: repos.ownerPatientLink
  });
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository: repos.encounter,
    encounterTimelineRepository: repos.encounterTimeline
  });
  const scheduling = new SchedulingService(owners, patients);
  const triage = new TriageService(encounters);
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
  const billing = new BillingService(encounters);
  const inventory = new InventoryService(encounters);
  const notifications = new NotificationsService({
    encounters,
    patients,
    notificationRepository: repos.notification
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
  const auth = new AuthService({
    secret: options.authSecret,
    accessTokenTtlSeconds: options.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds,
    users,
    staff,
    accessControl,
    audit,
    sessionRepository: repos.session
  });

  return {
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
    auth
  };
}
