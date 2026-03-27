export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type AccountId = Brand<string, 'AccountId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;
export type ModuleName = Brand<string, 'ModuleName'>;
export type UserId = Brand<string, 'UserId'>;
export type StaffId = Brand<string, 'StaffId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type RoleId = Brand<string, 'RoleId'>;
export type PermissionId = Brand<string, 'PermissionId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type OwnerId = Brand<string, 'OwnerId'>;
export type PatientId = Brand<string, 'PatientId'>;
export type OwnerPatientLinkId = Brand<string, 'OwnerPatientLinkId'>;
export type AppointmentId = Brand<string, 'AppointmentId'>;
export type QueueEntryId = Brand<string, 'QueueEntryId'>;
export type EncounterId = Brand<string, 'EncounterId'>;
export type TriageRecordId = Brand<string, 'TriageRecordId'>;
export type EncounterTimelineEventId = Brand<string, 'EncounterTimelineEventId'>;
export type MedicalRecordId = Brand<string, 'MedicalRecordId'>;
export type ClinicalEntryId = Brand<string, 'ClinicalEntryId'>;
export type AttachmentId = Brand<string, 'AttachmentId'>;
export type InpatientStayId = Brand<string, 'InpatientStayId'>;
export type InpatientProgressId = Brand<string, 'InpatientProgressId'>;
export type SurgeryCaseId = Brand<string, 'SurgeryCaseId'>;
export type DiagnosticOrderId = Brand<string, 'DiagnosticOrderId'>;
export type BillingRecordId = Brand<string, 'BillingRecordId'>;
export type BillingItemId = Brand<string, 'BillingItemId'>;
export type InventoryItemId = Brand<string, 'InventoryItemId'>;
export type InventoryConsumptionId = Brand<string, 'InventoryConsumptionId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type NotificationJobId = Brand<string, 'NotificationJobId'>;
export type SectorId = Brand<string, 'SectorId'>;
export type BedId = Brand<string, 'BedId'>;

export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly environment: string;
}

export interface HealthStatus {
  readonly ok: boolean;
  readonly service: string;
  readonly version: string;
  readonly environment: string;
  readonly timestamp: string;
  readonly correlationId: string;
}

export interface UserSummary {
  readonly id: UserId;
  readonly accountId: AccountId;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly staffId?: StaffId;
}

export interface StaffSummary {
  readonly id: StaffId;
  readonly accountId: AccountId;
  readonly userId?: UserId;
  readonly employeeCode: string;
  readonly fullName: string;
  readonly department: string;
  readonly jobTitle: string;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PermissionDefinition {
  readonly id: PermissionId;
  readonly code: string;
  readonly module: string;
  readonly description: string;
}

export interface RoleDefinition {
  readonly id: RoleId;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly permissionCodes: readonly string[];
}

export interface AccessProfile {
  readonly roleCodes: readonly string[];
  readonly permissionCodes: readonly string[];
  readonly capabilities: readonly string[];
}

export interface SessionSummary {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly accountId: AccountId;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly authTime: string;
  readonly refreshExpiresAt: string;
  readonly active: boolean;
}

export interface AuthenticatedPrincipal {
  readonly user: UserSummary;
  readonly staff?: StaffSummary;
  readonly session: SessionSummary;
  readonly access: AccessProfile;
}

export interface AuditEventSummary {
  readonly eventId: AuditEventId;
  readonly occurredAt: string;
  readonly actorId: string;
  readonly accountId: AccountId;
  readonly module: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly correlationId: string;
  readonly payloadSummary: string;
  readonly riskLevel: 'low' | 'medium' | 'high';
}

export interface OwnerContact {
  readonly label: string;
  readonly value: string;
  readonly type: 'phone' | 'email' | 'whatsapp';
  readonly primary: boolean;
}

export interface OwnerSummary {
  readonly id: OwnerId;
  readonly accountId: AccountId;
  readonly fullName: string;
  readonly documentId?: string;
  readonly contacts: readonly OwnerContact[];
  readonly financialResponsible: boolean;
  readonly administrativeNotes?: string;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PatientSummary {
  readonly id: PatientId;
  readonly accountId: AccountId;
  readonly name: string;
  readonly species: string;
  readonly breed?: string;
  readonly sex: 'male' | 'female' | 'unknown';
  readonly size?: 'small' | 'medium' | 'large';
  readonly baseWeightKg?: number;
  readonly birthDateApproximate?: string;
  readonly primaryOwnerId: OwnerId;
  readonly status: 'active' | 'inactive' | 'deceased';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OwnerPatientLinkSummary {
  readonly id: OwnerPatientLinkId;
  readonly accountId: AccountId;
  readonly ownerId: OwnerId;
  readonly patientId: PatientId;
  readonly relationshipType: 'primary' | 'secondary' | 'financial';
  readonly financialResponsible: boolean;
  readonly createdAt: string;
}

export interface SchedulingAppointmentSummary {
  readonly id: AppointmentId;
  readonly accountId: AccountId;
  readonly patientId: PatientId;
  readonly ownerId: OwnerId;
  readonly scheduledAt: string;
  readonly visitType: 'walk_in' | 'scheduled' | 'return';
  readonly reason: string;
  readonly status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QueueEntrySummary {
  readonly id: QueueEntryId;
  readonly accountId: AccountId;
  readonly patientId: PatientId;
  readonly ownerId: OwnerId;
  readonly appointmentId?: AppointmentId;
  readonly encounterId?: EncounterId;
  readonly reason: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly status:
    | 'waiting'
    | 'called'
    | 'in_triage'
    | 'in_care'
    | 'observation'
    | 'completed'
    | 'cancelled';
  readonly checkedInAt: string;
  readonly calledAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EncounterSummary {
  readonly id: EncounterId;
  readonly accountId: AccountId;
  readonly patientId: PatientId;
  readonly ownerId: OwnerId;
  readonly appointmentId?: AppointmentId;
  readonly queueEntryId?: QueueEntryId;
  readonly visitType: 'walk_in' | 'scheduled' | 'return';
  readonly status: 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed';
  readonly origin: 'reception' | 'schedule' | 'return';
  readonly reason: string;
  readonly openedAt: string;
  readonly closedAt?: string;
  readonly closeReason?: string;
  readonly createdByUserId: UserId;
  readonly updatedAt: string;
}

export interface TriageSummary {
  readonly id: TriageRecordId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly chiefComplaint: string;
  readonly initialNotes?: string;
  readonly alerts: readonly string[];
  readonly destination: 'in_care' | 'observation';
  readonly triagedByUserId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EncounterTimelineEventSummary {
  readonly id: EncounterTimelineEventId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly eventType:
    | 'encounter_opened'
    | 'status_changed'
    | 'queue_checked_in'
    | 'queue_called'
    | 'triage_recorded'
    | 'encounter_closed';
  readonly summary: string;
  readonly actorUserId: UserId;
  readonly occurredAt: string;
}

export interface MedicalRecordSummary {
  readonly id: MedicalRecordId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly status: 'open' | 'completed';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClinicalEntrySummary {
  readonly id: ClinicalEntryId;
  readonly accountId: AccountId;
  readonly medicalRecordId: MedicalRecordId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly entryType:
    | 'anamnesis'
    | 'physical_exam'
    | 'progress_note'
    | 'assessment'
    | 'plan'
    | 'prescription'
    | 'conduct';
  readonly title: string;
  readonly content: string;
  readonly authoredByUserId: UserId;
  readonly version: number;
  readonly deletedAt?: string;
  readonly deletedByUserId?: UserId;
  readonly deleteReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EntryRevisionSummary {
  readonly id: Brand<string, 'EntryRevisionId'>;
  readonly entryId: ClinicalEntryId;
  readonly version: number;
  readonly title: string;
  readonly content: string;
  readonly authorUserId: UserId;
  readonly reason?: string;
  readonly createdAt: string;
}

export type EntryRevisionId = Brand<string, 'EntryRevisionId'>;

export interface ClinicalTimelineEventSummary {
  readonly id: Brand<string, 'ClinicalTimelineEventId'>;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly medicalRecordId: MedicalRecordId;
  readonly clinicalEntryId?: ClinicalEntryId;
  readonly attachmentId?: AttachmentId;
  readonly eventType:
    | 'record_created'
    | 'entry_added'
    | 'entry_updated'
    | 'entry_archived'
    | 'attachment_added'
    | 'inpatient_admitted'
    | 'inpatient_progressed'
    | 'surgery_requested'
    | 'surgery_status_changed'
    | 'diagnostic_requested'
    | 'diagnostic_collected'
    | 'diagnostic_resulted'
    | 'inpatient_transferred'
    | 'inpatient_discharged'
    | 'surgery_pre_op'
    | 'surgery_in_progress';
  readonly summary: string;
  readonly actorUserId: UserId;
  readonly occurredAt: string;
}

export interface AttachmentSummary {
  readonly id: AttachmentId;
  readonly accountId: AccountId;
  readonly linkedEntityType: 'encounter' | 'medical_record' | 'diagnostic_order';
  readonly linkedEntityId: string;
  readonly category: 'image' | 'lab' | 'document' | 'prescription' | 'other';
  readonly fileName: string;
  readonly storageKey: string;
  readonly mimeType: string;
  readonly checksum: string;
  readonly sizeBytes?: number;
  readonly source: 'upload';
  readonly uploadedByUserId: UserId;
  readonly createdAt: string;
}

export interface InpatientStaySummary {
  readonly id: InpatientStayId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly unit: string;
  readonly ward: string;
  readonly bed: string;
  readonly sectorId?: SectorId;
  readonly bedId?: BedId;
  readonly status: 'admitted' | 'stable' | 'transferred' | 'discharged';
  readonly admittedAt: string;
  readonly dischargedAt?: string;
  readonly dischargeReason?: string;
  readonly transferToUnit?: string;
  readonly transferToWard?: string;
  readonly transferToSectorId?: SectorId;
  readonly transferToBedId?: BedId;
  readonly updatedAt: string;
}

export interface InpatientProgressSummary {
  readonly id: InpatientProgressId;
  readonly accountId: AccountId;
  readonly stayId: InpatientStayId;
  readonly encounterId: EncounterId;
  readonly note: string;
  readonly authoredByUserId: UserId;
  readonly createdAt: string;
}

export interface SurgeryCaseSummary {
  readonly id: SurgeryCaseId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly procedureName: string;
  readonly status: 'requested' | 'pre_op' | 'in_progress' | 'recovery' | 'completed' | 'cancelled';
  readonly surgeonUserId?: string;
  readonly surgicalTeam?: readonly string[];
  readonly preparationNotes?: string;
  readonly operativeNotes?: string;
  readonly scheduledAt?: string;
  readonly startedAt?: string;
  readonly endedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DiagnosticOrderSummary {
  readonly id: DiagnosticOrderId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly examType: string;
  readonly examCatalogId?: string;
  readonly reason: string;
  readonly status: 'requested' | 'collected' | 'resulted' | 'cancelled';
  readonly collectedAt?: string;
  readonly collectedByUserId?: string;
  readonly resultSummary?: string;
  readonly resultAttachmentId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ExamCatalogEntry {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly description?: string;
  readonly requiresPreparation?: boolean;
  readonly preparationInstructions?: string;
}

export interface BillingRecordSummary {
  readonly id: BillingRecordId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly ownerId: OwnerId;
  readonly status: 'draft' | 'estimated' | 'open' | 'settled';
  readonly subtotalAmount: number;
  readonly currency: 'BRL';
  readonly administrativeNotes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BillingItemSummary {
  readonly id: BillingItemId;
  readonly billingRecordId: BillingRecordId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly itemType: 'service' | 'supply' | 'procedure' | 'exam' | 'daily_rate' | 'other';
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceAmount: number;
  readonly totalAmount: number;
  readonly sourceEntityType?:
    | 'encounter'
    | 'diagnostic_order'
    | 'surgery_case'
    | 'inpatient_stay'
    | 'prescription';
  readonly sourceEntityId?: string;
  readonly createdByUserId: UserId;
  readonly createdAt: string;
}

export interface InventoryItemSummary {
  readonly id: InventoryItemId;
  readonly accountId: AccountId;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly onHandQuantity: number;
  readonly reorderLevel: number;
  readonly unitCostAmount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryConsumptionSummary {
  readonly id: InventoryConsumptionId;
  readonly accountId: AccountId;
  readonly inventoryItemId: InventoryItemId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly quantity: number;
  readonly unit: string;
  readonly costAmount: number;
  readonly sourceEntityType:
    | 'encounter'
    | 'diagnostic_order'
    | 'surgery_case'
    | 'inpatient_stay'
    | 'prescription'
    | 'other';
  readonly sourceEntityId?: string;
  readonly recordedByUserId: UserId;
  readonly createdAt: string;
}

export interface NotificationSummary {
  readonly id: NotificationId;
  readonly accountId: AccountId;
  readonly channel: 'internal';
  readonly category: 'billing' | 'inventory' | 'operations' | 'system';
  readonly encounterId?: EncounterId;
  readonly patientId?: PatientId;
  readonly recipientRoleCode?: string;
  readonly title: string;
  readonly message: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly status: 'queued' | 'sent' | 'read';
  readonly createdByUserId: UserId;
  readonly createdAt: string;
  readonly sentAt?: string;
}

export interface NotificationJobSummary {
  readonly id: NotificationJobId;
  readonly accountId: AccountId;
  readonly notificationId: NotificationId;
  readonly status: 'queued' | 'processed' | 'failed';
  readonly attempts: number;
  readonly scheduledAt: string;
  readonly processedAt?: string;
}

export interface SectorSummary {
  readonly id: SectorId;
  readonly accountId: AccountId;
  readonly code: string;
  readonly name: string;
  readonly kind: 'clinic' | 'surgery' | 'icu' | 'isolation' | 'observation' | 'other';
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BedSummary {
  readonly id: BedId;
  readonly accountId: AccountId;
  readonly sectorId: SectorId;
  readonly code: string;
  readonly name: string;
  readonly status: 'available' | 'occupied' | 'maintenance';
  readonly supportsSpecies?: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
