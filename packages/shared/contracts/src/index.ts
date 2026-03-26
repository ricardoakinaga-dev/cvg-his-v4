import type { DatabaseStatus } from "@cvg-his-v2/shared-database";
import type {
  AccessProfile,
  AttachmentSummary,
  BillingItemSummary,
  BillingRecordSummary,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  DiagnosticOrderSummary,
  EncounterSummary,
  EncounterTimelineEventSummary,
  InpatientProgressSummary,
  InpatientStaySummary,
  InventoryConsumptionSummary,
  InventoryItemSummary,
  AuditEventSummary,
  NotificationJobSummary,
  NotificationSummary,
  AuthenticatedPrincipal,
  HealthStatus,
  MedicalRecordSummary,
  OwnerPatientLinkSummary,
  OwnerSummary,
  QueueEntrySummary,
  SchedulingAppointmentSummary,
  SurgeryCaseSummary,
  PatientSummary,
  PermissionDefinition,
  RoleDefinition,
  SessionSummary,
  StaffSummary,
  TriageSummary,
  UserSummary,
} from "@cvg-his-v2/shared-types";

export interface HealthResponse extends HealthStatus {
  readonly liveness: {
    readonly live: boolean;
    readonly initialized: boolean;
  };
  readonly readiness: {
    readonly ready: boolean;
    readonly productionReady: boolean;
    readonly persistenceMode: string;
  };
  readonly dependencies: {
    readonly database: DatabaseStatus;
    readonly repositories: {
      readonly state: 'ready' | 'not-ready';
      readonly detail: string;
    };
    readonly worker: {
      readonly state: 'ready' | 'degraded' | 'not-configured';
      readonly detail: string;
    };
  };
}

export interface LoginRequest {
  readonly username: string;
  readonly password: string;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: "Bearer";
}

export interface AuthSessionResponse extends AuthTokens {
  readonly principal: AuthenticatedPrincipal;
}

export interface RefreshSessionRequest {
  readonly refreshToken: string;
}

export interface LogoutRequest {
  readonly refreshToken?: string;
}

export interface UserListResponse {
  readonly items: readonly UserSummary[];
}

export interface UpdateUserRequest {
  readonly displayName?: string;
  readonly email?: string;
  readonly status?: "active" | "inactive";
}

export interface StaffListResponse {
  readonly items: readonly StaffSummary[];
}

export interface AccessControlResponse {
  readonly roles: readonly RoleDefinition[];
  readonly permissions: readonly PermissionDefinition[];
}

export interface SessionStatusResponse {
  readonly session: SessionSummary;
  readonly access: AccessProfile;
}

export interface AuditEventListResponse {
  readonly items: readonly AuditEventSummary[];
}

export interface CreateOwnerRequest {
  readonly fullName: string;
  readonly documentId?: string;
  readonly contacts: readonly {
    readonly label: string;
    readonly value: string;
    readonly type: "phone" | "email" | "whatsapp";
    readonly primary?: boolean;
  }[];
  readonly financialResponsible: boolean;
  readonly administrativeNotes?: string;
}

export interface UpdateOwnerRequest {
  readonly fullName?: string;
  readonly documentId?: string;
  readonly contacts?: readonly {
    readonly label: string;
    readonly value: string;
    readonly type: "phone" | "email" | "whatsapp";
    readonly primary?: boolean;
  }[];
  readonly financialResponsible?: boolean;
  readonly administrativeNotes?: string;
  readonly status?: "active" | "inactive";
}

export interface OwnerListResponse {
  readonly items: readonly OwnerSummary[];
}

export interface CreatePatientRequest {
  readonly name: string;
  readonly species: string;
  readonly breed?: string;
  readonly sex: "male" | "female" | "unknown";
  readonly size?: "small" | "medium" | "large";
  readonly baseWeightKg?: number;
  readonly birthDateApproximate?: string;
  readonly primaryOwnerId: string;
  readonly status?: "active" | "inactive" | "deceased";
}

export interface UpdatePatientRequest {
  readonly name?: string;
  readonly species?: string;
  readonly breed?: string;
  readonly sex?: "male" | "female" | "unknown";
  readonly size?: "small" | "medium" | "large";
  readonly baseWeightKg?: number;
  readonly birthDateApproximate?: string;
  readonly primaryOwnerId?: string;
  readonly status?: "active" | "inactive" | "deceased";
}

export interface PatientListResponse {
  readonly items: readonly PatientSummary[];
}

export interface CreateOwnerPatientLinkRequest {
  readonly ownerId: string;
  readonly patientId: string;
  readonly relationshipType: "primary" | "secondary" | "financial";
  readonly financialResponsible: boolean;
}

export interface OwnerPatientLinkListResponse {
  readonly items: readonly OwnerPatientLinkSummary[];
}

export interface MasterSearchResponse {
  readonly owners: readonly OwnerSummary[];
  readonly patients: readonly PatientSummary[];
  readonly links: readonly OwnerPatientLinkSummary[];
}

export interface CreateAppointmentRequest {
  readonly patientId: string;
  readonly ownerId: string;
  readonly scheduledAt: string;
  readonly visitType: "walk_in" | "scheduled" | "return";
  readonly reason: string;
}

export interface AppointmentListResponse {
  readonly items: readonly SchedulingAppointmentSummary[];
}

export interface CheckInQueueRequest {
  readonly patientId: string;
  readonly ownerId: string;
  readonly appointmentId?: string;
  readonly reason: string;
  readonly priority?: "low" | "medium" | "high" | "critical";
}

export interface QueueListResponse {
  readonly items: readonly QueueEntrySummary[];
}

export interface CreateEncounterRequest {
  readonly patientId: string;
  readonly ownerId: string;
  readonly appointmentId?: string;
  readonly queueEntryId?: string;
  readonly visitType: "walk_in" | "scheduled" | "return";
  readonly origin: "reception" | "schedule" | "return";
  readonly reason: string;
}

export interface TransitionEncounterRequest {
  readonly nextStatus: "reception" | "in_triage" | "in_care" | "observation" | "closed";
}

export interface CloseEncounterRequest {
  readonly closeReason: string;
}

export interface EncounterListResponse {
  readonly items: readonly EncounterSummary[];
}

export interface CreateTriageRequest {
  readonly encounterId: string;
  readonly patientId: string;
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly chiefComplaint: string;
  readonly initialNotes?: string;
  readonly alerts: readonly string[];
  readonly destination: "in_care" | "observation";
}

export interface TriageListResponse {
  readonly items: readonly TriageSummary[];
}

export interface EncounterTimelineResponse {
  readonly items: readonly EncounterTimelineEventSummary[];
}

export interface CreateClinicalEntryRequest {
  readonly encounterId: string;
  readonly patientId: string;
  readonly entryType:
    | "anamnesis"
    | "physical_exam"
    | "progress_note"
    | "assessment"
    | "plan"
    | "prescription"
    | "conduct";
  readonly title: string;
  readonly content: string;
}

export interface MedicalRecordResponse {
  readonly record: MedicalRecordSummary;
  readonly entries: readonly ClinicalEntrySummary[];
}

export interface ClinicalEntryListResponse {
  readonly items: readonly ClinicalEntrySummary[];
}

export interface ClinicalTimelineResponse {
  readonly items: readonly ClinicalTimelineEventSummary[];
}

export interface CreateAttachmentRequest {
  readonly linkedEntityType: "encounter" | "medical_record" | "diagnostic_order";
  readonly linkedEntityId: string;
  readonly category: "image" | "lab" | "document" | "prescription" | "other";
  readonly fileName: string;
  readonly mimeType: string;
  readonly checksum: string;
}

export interface AttachmentListResponse {
  readonly items: readonly AttachmentSummary[];
}

export interface CreateInpatientAdmissionRequest {
  readonly encounterId: string;
  readonly patientId: string;
  readonly unit: string;
  readonly ward: string;
  readonly bed: string;
}

export interface InpatientListResponse {
  readonly items: readonly InpatientStaySummary[];
}

export interface AddInpatientProgressRequest {
  readonly stayId: string;
  readonly note: string;
}

export interface InpatientProgressListResponse {
  readonly items: readonly InpatientProgressSummary[];
}

export interface UpdateInpatientStatusRequest {
  readonly status: "admitted" | "stable" | "discharged";
}

export interface CreateSurgeryCaseRequest {
  readonly encounterId: string;
  readonly patientId: string;
  readonly procedureName: string;
  readonly preparationNotes?: string;
}

export interface SurgeryListResponse {
  readonly items: readonly SurgeryCaseSummary[];
}

export interface UpdateSurgeryStatusRequest {
  readonly status: "requested" | "pre_op" | "in_progress" | "recovery" | "completed" | "cancelled";
  readonly operativeNotes?: string;
}

export interface CreateDiagnosticOrderRequest {
  readonly encounterId: string;
  readonly patientId: string;
  readonly examType: string;
  readonly reason: string;
}

export interface DiagnosticOrderListResponse {
  readonly items: readonly DiagnosticOrderSummary[];
}

export interface RecordDiagnosticResultRequest {
  readonly resultSummary: string;
  readonly status: "resulted";
}

export interface CreateBillingEstimateRequest {
  readonly encounterId: string;
  readonly administrativeNotes?: string;
}

export interface CreateBillingItemRequest {
  readonly encounterId: string;
  readonly itemType:
    | "service"
    | "supply"
    | "procedure"
    | "exam"
    | "daily_rate"
    | "other";
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceAmount: number;
  readonly sourceEntityType?:
    | "encounter"
    | "diagnostic_order"
    | "surgery_case"
    | "inpatient_stay"
    | "prescription";
  readonly sourceEntityId?: string;
}

export interface UpdateBillingStatusRequest {
  readonly status: "draft" | "estimated" | "open" | "settled";
  readonly administrativeNotes?: string;
}

export interface BillingListResponse {
  readonly items: readonly BillingRecordSummary[];
}

export interface BillingItemListResponse {
  readonly items: readonly BillingItemSummary[];
}

export interface CreateInventoryConsumptionRequest {
  readonly encounterId: string;
  readonly inventoryItemId: string;
  readonly quantity: number;
  readonly sourceEntityType:
    | "encounter"
    | "diagnostic_order"
    | "surgery_case"
    | "inpatient_stay"
    | "prescription"
    | "other";
  readonly sourceEntityId?: string;
}

export interface InventoryItemListResponse {
  readonly items: readonly InventoryItemSummary[];
}

export interface InventoryConsumptionListResponse {
  readonly items: readonly InventoryConsumptionSummary[];
}

export interface CreateNotificationRequest {
  readonly category: "billing" | "inventory" | "operations" | "system";
  readonly encounterId?: string;
  readonly patientId?: string;
  readonly recipientRoleCode?: string;
  readonly title: string;
  readonly message: string;
  readonly severity: "low" | "medium" | "high";
}

export interface ProcessNotificationsRequest {
  readonly limit?: number;
}

export interface NotificationListResponse {
  readonly items: readonly NotificationSummary[];
}

export interface NotificationJobListResponse {
  readonly items: readonly NotificationJobSummary[];
}
