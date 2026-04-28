import type { DatabaseStatus } from '@cvg-his-v2/shared-database';
import type {
  AccessProfile,
  AttachmentSummary,
  BedSummary,
  BillingItemSummary,
  BillingRecordSummary,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  DiagnosticOrderSummary,
  ExamCatalogEntry,
  EncounterSummary,
  EncounterTimelineEventSummary,
  EntryRevisionSummary,
  InpatientProgressSummary,
  InpatientStaySummary,
  InventoryConsumptionSummary,
  InventoryItemSummary,
  InventoryLotSummary,
  LaboratoryEquipmentSummary,
  LaboratoryReferenceValueSummary,
  LaboratoryReportTypeSummary,
  AuditEventSummary,
  NotificationJobSummary,
  NotificationSummary,
  SectorSummary,
  AuthenticatedPrincipal,
  HealthStatus,
  MedicalRecordSummary,
  OwnerPatientLinkSummary,
  OwnerSummary,
  QueueEntrySummary,
  SchedulingConflictSummary,
  SchedulingOperationalBlockSummary,
  SchedulingAppointmentOperationalSummary,
  SchedulingAppointmentSummary,
  SurgeryCaseSummary,
  PatientSummary,
  PermissionDefinition,
  RoleDefinition,
  SessionSummary,
  StaffSummary,
  TriageSummary,
  TriageVersionSummary,
  UserSummary
} from '@cvg-his-v2/shared-types';

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
    readonly secretsManager?: {
      readonly state: 'configured' | 'not-configured';
      readonly detail: string;
    };
    /** ML services status — populated when AI/ML module is wired to the runtime (GAP-09) */
    readonly ml?: {
      readonly state: 'ready' | 'not-configured';
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
  readonly tokenType: 'Bearer';
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

export interface SessionListResponse {
  readonly items: readonly SessionSummary[];
}

export interface UserListResponse {
  readonly items: readonly UserSummary[];
}

export interface UpdateUserRequest {
  readonly displayName?: string;
  readonly email?: string;
  readonly status?: 'active' | 'inactive';
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

export interface WhatsAppAppointmentReportResponse {
  readonly appointmentId: string;
  readonly deliveryStatus:
    | 'not_scheduled'
    | 'scheduled'
    | 'sent'
    | 'failed'
    | 'confirmed'
    | 'cancelled'
    | 'reschedule_requested';
  readonly vendorProvider: 'twilio' | '360dialog' | null;
  readonly vendorMessageId: string | null;
  readonly lastError: string | null;
  readonly correlationIds: readonly string[];
  readonly events: readonly AuditEventSummary[];
}

export interface CreateOwnerRequest {
  readonly fullName: string;
  readonly documentId?: string;
  readonly contacts: readonly {
    readonly label: string;
    readonly value: string;
    readonly type: 'phone' | 'email' | 'whatsapp';
    readonly primary?: boolean;
  }[];
  readonly address?: {
    readonly zipCode?: string;
    readonly street?: string;
    readonly number?: string;
    readonly complement?: string;
    readonly state?: string;
    readonly city?: string;
    readonly district?: string;
    readonly reference?: string;
    readonly cityCode?: string;
  };
  readonly profile?: {
    readonly birthDate?: string;
    readonly sex?: 'female' | 'male' | 'other' | 'unknown';
    readonly group?: string;
    readonly receiveSms?: boolean;
    readonly personType?: 'individual' | 'company';
    readonly rg?: string;
  };
  readonly financialProfile?: {
    readonly allowedDebtLimit?: number;
    readonly creditBalance?: number;
    readonly availablePoints?: number;
    readonly blockedPoints?: number;
  };
  readonly financialResponsible: boolean;
  readonly administrativeNotes?: string;
  readonly legacyVetusId?: string;
  readonly originalCreatedAt?: string;
}

export interface UpdateOwnerRequest {
  readonly fullName?: string;
  readonly documentId?: string;
  readonly contacts?: readonly {
    readonly label: string;
    readonly value: string;
    readonly type: 'phone' | 'email' | 'whatsapp';
    readonly primary?: boolean;
  }[];
  readonly address?: {
    readonly zipCode?: string;
    readonly street?: string;
    readonly number?: string;
    readonly complement?: string;
    readonly state?: string;
    readonly city?: string;
    readonly district?: string;
    readonly reference?: string;
    readonly cityCode?: string;
  };
  readonly profile?: {
    readonly birthDate?: string;
    readonly sex?: 'female' | 'male' | 'other' | 'unknown';
    readonly group?: string;
    readonly receiveSms?: boolean;
    readonly personType?: 'individual' | 'company';
    readonly rg?: string;
  };
  readonly financialProfile?: {
    readonly allowedDebtLimit?: number;
    readonly creditBalance?: number;
    readonly availablePoints?: number;
    readonly blockedPoints?: number;
  };
  readonly financialResponsible?: boolean;
  readonly administrativeNotes?: string;
  readonly legacyVetusId?: string;
  readonly originalCreatedAt?: string;
  readonly status?: 'active' | 'inactive';
}

export interface OwnerListResponse {
  readonly items: readonly OwnerSummary[];
}

export interface CreatePatientRequest {
  readonly name: string;
  readonly species: string;
  readonly breed?: string;
  readonly sex: 'male' | 'female' | 'unknown';
  readonly size?: 'small' | 'medium' | 'large';
  readonly baseWeightKg?: number;
  readonly birthDateApproximate?: string;
  readonly isNeutered?: boolean;
  readonly microchip?: string;
  readonly pedigreeNumber?: string;
  readonly color?: string;
  readonly chronicDisease?: string;
  readonly allergy?: string;
  readonly temperament?: string;
  readonly generalNotes?: string;
  readonly legacyVetusId?: string;
  readonly originalCreatedAt?: string;
  readonly primaryOwnerId: string;
  readonly status?: 'active' | 'inactive' | 'deceased';
}

export interface UpdatePatientRequest {
  readonly name?: string;
  readonly species?: string;
  readonly breed?: string;
  readonly sex?: 'male' | 'female' | 'unknown';
  readonly size?: 'small' | 'medium' | 'large';
  readonly baseWeightKg?: number;
  readonly birthDateApproximate?: string;
  readonly isNeutered?: boolean;
  readonly microchip?: string;
  readonly pedigreeNumber?: string;
  readonly color?: string;
  readonly chronicDisease?: string;
  readonly allergy?: string;
  readonly temperament?: string;
  readonly generalNotes?: string;
  readonly legacyVetusId?: string;
  readonly originalCreatedAt?: string;
  readonly primaryOwnerId?: string;
  readonly status?: 'active' | 'inactive' | 'deceased';
}

export interface PatientListResponse {
  readonly items: readonly PatientSummary[];
}

export interface CreateOwnerPatientLinkRequest {
  readonly ownerId: string;
  readonly patientId: string;
  readonly relationshipType: 'primary' | 'secondary' | 'financial';
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
  readonly durationMinutes?: number;
  readonly visitType?: 'walk_in' | 'scheduled' | 'return';
  readonly reason: string;
  readonly practitionerStaffId?: string;
  readonly serviceId?: string;
  readonly unit?: string;
  readonly specialty?: string;
  readonly resourceLabel?: string;
  readonly smartSchedulingRecommendationId?: string;
}

export interface AppointmentListResponse {
  readonly items: readonly SchedulingAppointmentSummary[];
}

export type SchedulingViewMode = 'day' | 'week' | 'month';

export interface SchedulingProfessionalSummary {
  readonly id: string;
  readonly fullName: string;
  readonly department: string;
  readonly jobTitle: string;
  readonly specialty?: string;
  readonly unit?: string;
  readonly status: 'active' | 'inactive';
}

export interface SmartSchedulingRecommendationRequest {
  readonly patientId: string;
  readonly scheduledAt: string;
  readonly visitType?: 'walk_in' | 'scheduled' | 'return';
  readonly reason?: string;
  readonly practitionerStaffId?: string;
  readonly serviceId?: string;
  readonly specialty?: string;
  readonly unit?: string;
  readonly resourceLabel?: string;
}

export interface SmartSchedulingRecommendationResponse {
  readonly recommendationId: string;
  readonly predictedDurationMinutes: number;
  readonly confidence: number;
  readonly historicalAverageMinutes: number;
  readonly suggestedBufferMinutes: number;
  readonly factors: readonly string[];
  readonly basedOn: {
    readonly patientId: string;
    readonly previousVisits: number;
    readonly visitType: 'walk_in' | 'scheduled' | 'return';
  };
}

export interface SchedulingFilterOptions {
  readonly units: readonly string[];
  readonly specialties: readonly string[];
  readonly statuses: readonly SchedulingAppointmentSummary['status'][];
}

export interface SchedulingCockpitAppointmentSummary extends SchedulingAppointmentSummary {
  readonly endsAt: string;
  readonly practitionerName?: string;
  readonly serviceName?: string;
  readonly conflicts: readonly SchedulingConflictSummary[];
  readonly operational: SchedulingAppointmentOperationalSummary;
}

export interface SchedulingOverviewResponse {
  readonly viewMode: SchedulingViewMode;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly stats: {
    readonly total: number;
    readonly scheduled: number;
    readonly checkedIn: number;
    readonly completed: number;
    readonly cancelled: number;
    readonly conflicts: number;
    readonly unassigned: number;
  };
  readonly professionals: readonly SchedulingProfessionalSummary[];
  readonly blocks: readonly SchedulingOperationalBlockSummary[];
  readonly filterOptions: SchedulingFilterOptions;
  readonly items: readonly SchedulingCockpitAppointmentSummary[];
}

export interface SchedulingAvailabilityResponse {
  readonly available: boolean;
  readonly requestedSlot: {
    readonly startsAt: string;
    readonly endsAt: string;
    readonly durationMinutes: number;
  };
  readonly conflicts: readonly SchedulingConflictSummary[];
  readonly blocks: readonly SchedulingOperationalBlockSummary[];
  readonly suggestions: readonly {
    readonly startsAt: string;
    readonly endsAt: string;
    readonly available: boolean;
    readonly reason: string;
  }[];
}

export interface CheckInQueueRequest {
  readonly patientId: string;
  readonly ownerId: string;
  readonly appointmentId?: string;
  readonly reason: string;
  readonly priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface QueueListResponse {
  readonly items: readonly QueueEntrySummary[];
}

export type FiscalTaxRegime = 'simples_nacional' | 'lucro_presumido' | 'lucro_real';

export interface FiscalDashboardAlert {
  readonly variant: 'info' | 'warning';
  readonly title: string;
  readonly message: string;
}

export interface FiscalDashboardSummary {
  readonly activeTaxes: number;
  readonly cfopCount: number;
  readonly nfseLayouts: number;
  readonly icmsRules: number;
  readonly pisCofinsRules: number;
  readonly ncmEntries: number;
  readonly readOnly: boolean;
  readonly backendScope: string;
  readonly pendingScopes: readonly string[];
  readonly alerts: readonly FiscalDashboardAlert[];
}

export interface FiscalIcmsRuleSummary {
  readonly id: string;
  readonly ufOrigin: string;
  readonly ufDestination: string;
  readonly ncm: string;
  readonly rate: number;
  readonly cst: string;
  readonly operationType: 'interna' | 'interestadual';
}

export interface FiscalIcmsTableSummary {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly percent: number;
}

export interface CreateFiscalIcmsTableRequest {
  readonly code: string;
  readonly description?: string;
  readonly percent: number;
}

export interface UpdateFiscalIcmsTableRequest {
  readonly code?: string;
  readonly description?: string;
  readonly percent?: number;
}

export interface FiscalIpiTableSummary {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly percent: number;
}

export interface CreateFiscalIpiTableRequest {
  readonly code: string;
  readonly description?: string;
  readonly percent: number;
}

export interface UpdateFiscalIpiTableRequest {
  readonly code?: string;
  readonly description?: string;
  readonly percent?: number;
}

export interface FiscalPisTableSummary {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly percent: number;
}

export interface CreateFiscalPisTableRequest {
  readonly code: string;
  readonly description?: string;
  readonly percent: number;
}

export interface UpdateFiscalPisTableRequest {
  readonly code?: string;
  readonly description?: string;
  readonly percent?: number;
}

export interface FiscalCofinsTableSummary {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly percent: number;
}

export interface CreateFiscalCofinsTableRequest {
  readonly code: string;
  readonly description?: string;
  readonly percent: number;
}

export interface UpdateFiscalCofinsTableRequest {
  readonly code?: string;
  readonly description?: string;
  readonly percent?: number;
}

export interface FiscalPisCofinsRuleSummary {
  readonly id: string;
  readonly regime: FiscalTaxRegime;
  readonly appliesTo: 'mercadoria' | 'servico' | 'ambos';
  readonly pisRate: number;
  readonly cofinsRate: number;
  readonly notes: string;
}

export interface FiscalCfopSummary {
  readonly code: string;
  readonly description: string;
  readonly section: 'entrada' | 'saida';
  readonly category: string;
  readonly applicableTo: readonly ('nfe' | 'nfce' | 'nfse' | 'cte')[];
  readonly icmsRelevant: boolean;
  readonly pisCofinsRelevant: boolean;
  readonly ipiRelevant: boolean;
  readonly documentTypesLabel: string;
}

export interface CreateFiscalCfopRequest {
  readonly code: string;
  readonly description: string;
  readonly section?: 'entrada' | 'saida';
  readonly category?: string;
  readonly applicableTo?: readonly ('nfe' | 'nfce' | 'nfse' | 'cte')[];
  readonly icmsRelevant?: boolean;
  readonly pisCofinsRelevant?: boolean;
  readonly ipiRelevant?: boolean;
}

export interface UpdateFiscalCfopRequest {
  readonly code?: string;
  readonly description?: string;
  readonly section?: 'entrada' | 'saida';
  readonly category?: string;
  readonly applicableTo?: readonly ('nfe' | 'nfce' | 'nfse' | 'cte')[];
  readonly icmsRelevant?: boolean;
  readonly pisCofinsRelevant?: boolean;
  readonly ipiRelevant?: boolean;
}

export interface FiscalNcmEntrySummary {
  readonly id: string;
  readonly ncm: string;
  readonly category: string;
  readonly ipiRate: number;
  readonly source: string;
  readonly notes: string;
}

export type FiscalNfseProvider = 'abrasf' | 'iss_sp' | 'iss_net' | 'nota_rio';

export type FiscalNfseDocumentStatus = 'draft' | 'issued' | 'cancelled' | 'error';

export interface FiscalNfseCustomerSummary {
  readonly type: 'cpf' | 'cnpj';
  readonly document: string;
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
}

export interface FiscalNfseServiceLineSummary {
  readonly description: string;
  readonly codigoServico: string;
  readonly cnae: string;
  readonly quantity: number;
  readonly unitValue: number;
  readonly totalValue: number;
  readonly issRate: number;
  readonly issValue: number;
  readonly pisValue: number;
  readonly cofinsValue: number;
  readonly csllValue: number;
  readonly irrfValue?: number;
  readonly inssValue?: number;
}

export interface FiscalNfseDocumentSummary {
  readonly id: string;
  readonly serie: string;
  readonly numero: number;
  readonly competencia: string;
  readonly provider: FiscalNfseProvider;
  readonly customer: FiscalNfseCustomerSummary;
  readonly services: readonly FiscalNfseServiceLineSummary[];
  readonly subtotal: number;
  readonly totalIss: number;
  readonly totalPis: number;
  readonly totalCofins: number;
  readonly totalCsll: number;
  readonly totalIrrf?: number;
  readonly totalInss?: number;
  readonly totalDocument: number;
  readonly observations?: string;
  readonly createdAt: string;
  readonly status: FiscalNfseDocumentStatus;
  readonly authorizationCode?: string;
  readonly verificationUrl?: string;
}

export interface CreateFiscalNfseDocumentRequest {
  readonly competencia?: string;
  readonly serie?: string;
  readonly numero?: number;
  readonly provider?: FiscalNfseProvider;
  readonly municipalityCode?: string;
  readonly apiUrl?: string;
  readonly customer: FiscalNfseCustomerSummary;
  readonly services: readonly FiscalNfseServiceLineSummary[];
  readonly observations?: string;
}

export interface CancelFiscalNfseDocumentRequest {
  readonly reason: string;
}

export interface FiscalNfseDocumentFilters {
  readonly status?: FiscalNfseDocumentStatus;
  readonly customerSearch?: string;
}

export interface FiscalIcmsMatrixRowSummary {
  readonly id: string;
  readonly ufOrigin: string;
  readonly ufDestination: string;
  readonly rate: number;
  readonly operationType: 'interna' | 'interestadual';
}

export interface FiscalNfseLayoutSummary {
  readonly id: string;
  readonly city: string;
  readonly state: string;
  readonly municipalityCode: string;
  readonly provider: string;
  readonly version: string;
  readonly active: boolean;
  readonly environment: 'producao' | 'homologacao';
  readonly serviceCode: string;
  readonly serviceFocus: string;
}

export interface CreateFiscalNfseLayoutRequest {
  readonly city: string;
  readonly state: string;
  readonly municipalityCode?: string;
  readonly provider: string;
  readonly version: string;
  readonly active?: boolean;
  readonly environment: 'producao' | 'homologacao';
  readonly serviceCode?: string;
  readonly serviceFocus?: string;
}

export interface UpdateFiscalNfseLayoutRequest {
  readonly city?: string;
  readonly state?: string;
  readonly municipalityCode?: string;
  readonly provider?: string;
  readonly version?: string;
  readonly active?: boolean;
  readonly environment?: 'producao' | 'homologacao';
  readonly serviceCode?: string;
  readonly serviceFocus?: string;
}

export interface FiscalTaxPreview {
  readonly mercadoria: {
    readonly baseValue: number;
    readonly totalTaxValue: number;
    readonly totalWithTax: number;
  };
  readonly servico: {
    readonly baseValue: number;
    readonly totalTaxValue: number;
    readonly totalWithTax: number;
  };
}

export interface FiscalIcmsRuleListResponse {
  readonly items: readonly FiscalIcmsRuleSummary[];
}

export interface FiscalIcmsTableListResponse {
  readonly items: readonly FiscalIcmsTableSummary[];
}

export interface FiscalIpiTableListResponse {
  readonly items: readonly FiscalIpiTableSummary[];
}

export interface FiscalPisTableListResponse {
  readonly items: readonly FiscalPisTableSummary[];
}

export interface FiscalCofinsTableListResponse {
  readonly items: readonly FiscalCofinsTableSummary[];
}

export interface FiscalPisCofinsRuleListResponse {
  readonly items: readonly FiscalPisCofinsRuleSummary[];
}

export interface FiscalCfopListResponse {
  readonly items: readonly FiscalCfopSummary[];
}

export interface FiscalNcmEntryListResponse {
  readonly items: readonly FiscalNcmEntrySummary[];
}

export interface FiscalIcmsMatrixListResponse {
  readonly items: readonly FiscalIcmsMatrixRowSummary[];
}

export interface FiscalNfseLayoutListResponse {
  readonly items: readonly FiscalNfseLayoutSummary[];
}

export interface FiscalNfseDocumentListResponse {
  readonly items: readonly FiscalNfseDocumentSummary[];
}

export interface CreateEncounterRequest {
  readonly patientId: string;
  readonly ownerId: string;
  readonly appointmentId?: string;
  readonly queueEntryId?: string;
  readonly visitType: 'walk_in' | 'scheduled' | 'return';
  readonly origin: 'reception' | 'schedule' | 'return';
  readonly reason: string;
}

export interface TransitionEncounterRequest {
  readonly nextStatus: 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed';
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
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly chiefComplaint: string;
  readonly initialNotes?: string;
  readonly alerts: readonly string[];
  readonly destination: 'in_care' | 'observation';
}

export interface UpdateTriageRequest {
  readonly priority?: 'low' | 'medium' | 'high' | 'critical';
  readonly chiefComplaint?: string;
  readonly initialNotes?: string;
  readonly alerts?: readonly string[];
  readonly destination?: 'in_care' | 'observation';
}

export interface TriageListResponse {
  readonly items: readonly TriageSummary[];
}

export interface TriageHistoryResponse {
  readonly items: readonly TriageVersionSummary[];
}

export interface EncounterTimelineResponse {
  readonly items: readonly EncounterTimelineEventSummary[];
}

export interface CreateClinicalEntryRequest {
  readonly encounterId: string;
  readonly patientId: string;
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
}

export interface UpdateClinicalEntryRequest {
  readonly title?: string;
  readonly content?: string;
  readonly reason?: string;
  readonly expectedVersion?: number;
}

export interface ArchiveClinicalEntryRequest {
  readonly reason: string;
  readonly expectedVersion?: number;
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

export interface EntryRevisionListResponse {
  readonly items: readonly EntryRevisionSummary[];
}

export interface CreateAttachmentRequest {
  readonly linkedEntityType: 'encounter' | 'medical_record' | 'diagnostic_order';
  readonly linkedEntityId: string;
  readonly category: 'image' | 'lab' | 'document' | 'prescription' | 'other';
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
  readonly sectorId?: string;
  readonly bedId?: string;
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

export interface InpatientHandoverPreviewItem {
  readonly stayId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly unit: string;
  readonly ward: string;
  readonly bed: string;
  readonly status: 'admitted' | 'stable' | 'transferred' | 'discharged';
  readonly latestProgressNote: string | null;
  readonly latestProgressAt: string | null;
  readonly transferTarget: {
    readonly unit: string | null;
    readonly ward: string | null;
  };
  readonly requiresAttention: boolean;
}

export interface InpatientHandoverPreviewResponse {
  readonly generatedAt: string;
  readonly totalActiveStays: number;
  readonly items: readonly InpatientHandoverPreviewItem[];
}

export interface UpdateInpatientStatusRequest {
  readonly status: 'admitted' | 'stable' | 'transferred' | 'discharged';
  readonly dischargeReason?: string;
  readonly transferToUnit?: string;
  readonly transferToWard?: string;
  readonly transferToSectorId?: string;
  readonly transferToBedId?: string;
}

export interface CreateSurgeryCaseRequest {
  readonly encounterId: string;
  readonly patientId: string;
  readonly procedureName: string;
  readonly surgeonUserId?: string;
  readonly surgicalTeam?: readonly string[];
  readonly scheduledAt?: string;
  readonly preparationNotes?: string;
}

export interface SurgeryListResponse {
  readonly items: readonly SurgeryCaseSummary[];
}

export interface UpdateSurgeryStatusRequest {
  readonly status: 'requested' | 'pre_op' | 'in_progress' | 'recovery' | 'completed' | 'cancelled';
  readonly operativeNotes?: string;
}

export interface CreateDiagnosticOrderRequest {
  readonly encounterId: string;
  readonly patientId: string;
  readonly examType: string;
  readonly examCatalogId?: string;
  readonly reason: string;
}

export interface DiagnosticOrderListResponse {
  readonly items: readonly DiagnosticOrderSummary[];
}

export interface ExamCatalogListResponse {
  readonly items: readonly ExamCatalogEntry[];
}

export interface LaboratoryEquipmentListResponse {
  readonly items: readonly LaboratoryEquipmentSummary[];
}

export interface CreateLaboratoryEquipmentRequest {
  readonly name: string;
  readonly type: string;
  readonly serialNumber: string;
  readonly status?: 'active' | 'maintenance';
  readonly lastCalibrationAt: string;
}

export type UpdateLaboratoryEquipmentRequest = Partial<CreateLaboratoryEquipmentRequest>;

export interface LaboratoryReportTypeListResponse {
  readonly items: readonly LaboratoryReportTypeSummary[];
}

export interface CreateLaboratoryReportTypeRequest {
  readonly name: string;
  readonly code: string;
  readonly category: string;
  readonly description: string;
  readonly active?: boolean;
}

export type UpdateLaboratoryReportTypeRequest = Partial<CreateLaboratoryReportTypeRequest>;

export interface LaboratoryReferenceValueListResponse {
  readonly items: readonly LaboratoryReferenceValueSummary[];
}

export interface CreateLaboratoryReferenceValueRequest {
  readonly parameter: string;
  readonly examType: string;
  readonly minValue: number;
  readonly maxValue: number;
  readonly unit: string;
}

export type UpdateLaboratoryReferenceValueRequest = Partial<CreateLaboratoryReferenceValueRequest>;

export interface RecordDiagnosticResultRequest {
  readonly status: 'collected' | 'resulted' | 'cancelled';
  readonly resultSummary?: string;
  readonly resultAttachmentId?: string;
  readonly collectedByUserId?: string;
}

export interface CreateBillingEstimateRequest {
  readonly encounterId: string;
  readonly administrativeNotes?: string;
}

export interface CreateBillingItemRequest {
  readonly encounterId: string;
  readonly itemType: 'service' | 'supply' | 'procedure' | 'exam' | 'daily_rate' | 'other';
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceAmount: number;
  readonly sourceEntityType?:
    | 'encounter'
    | 'diagnostic_order'
    | 'surgery_case'
    | 'inpatient_stay'
    | 'prescription';
  readonly sourceEntityId?: string;
}

export interface UpdateBillingStatusRequest {
  readonly status: 'draft' | 'estimated' | 'open' | 'settled';
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
    | 'encounter'
    | 'diagnostic_order'
    | 'surgery_case'
    | 'inpatient_stay'
    | 'prescription'
    | 'other';
  readonly sourceEntityId?: string;
}

export interface InventoryItemListResponse {
  readonly items: readonly InventoryItemSummary[];
}

export interface CreateInventoryItemRequest {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly onHandQuantity: number;
  readonly reorderLevel: number;
  readonly unitCostAmount: number;
}

export interface UpdateInventoryItemRequest {
  readonly name?: string;
  readonly unit?: string;
  readonly onHandQuantity?: number;
  readonly reorderLevel?: number;
  readonly unitCostAmount?: number;
}

export interface InventoryConsumptionListResponse {
  readonly items: readonly InventoryConsumptionSummary[];
}

export interface InventoryLotListResponse {
  readonly items: readonly InventoryLotSummary[];
}

export interface CreateNotificationRequest {
  readonly category: 'billing' | 'inventory' | 'operations' | 'system';
  readonly encounterId?: string;
  readonly patientId?: string;
  readonly recipientRoleCode?: string;
  readonly title: string;
  readonly message: string;
  readonly severity: 'low' | 'medium' | 'high';
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

export interface CreateSectorRequest {
  readonly code: string;
  readonly name: string;
  readonly kind: 'clinic' | 'surgery' | 'icu' | 'isolation' | 'observation' | 'other';
}

export interface CreateBedRequest {
  readonly sectorId: string;
  readonly code: string;
  readonly name: string;
  readonly supportsSpecies?: string;
}

export interface UpdateBedRequest {
  readonly sectorId?: string;
  readonly code?: string;
  readonly name?: string;
  readonly status?: 'available' | 'occupied' | 'maintenance' | 'blocked';
  readonly supportsSpecies?: string | null;
  readonly active?: boolean;
}

export interface SectorListResponse {
  readonly items: readonly SectorSummary[];
}

export interface BedListResponse {
  readonly items: readonly BedSummary[];
}

export interface BedMapBed {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: 'available' | 'occupied' | 'maintenance' | 'blocked';
  readonly supportsSpecies?: string;
  readonly stayId?: string;
  readonly patientId?: string;
  readonly encounterId?: string;
  readonly occupiedSince?: string;
}

export interface BedMapSector {
  readonly sectorId: string;
  readonly sectorCode: string;
  readonly sectorName: string;
  readonly kind: string;
  readonly beds: readonly BedMapBed[];
  readonly totalBeds: number;
  readonly occupiedBeds: number;
  readonly availableBeds: number;
}

export interface BedMapResponse {
  readonly items: readonly BedMapSector[];
  readonly totalBeds: number;
  readonly occupiedBeds: number;
  readonly availableBeds: number;
}

export interface AssignBedRequest {
  readonly sectorId: string;
  readonly bedId: string;
}

// --- Discharges ---

export interface CreateDischargeRequest {
  readonly encounterId: string;
  readonly dischargeType: 'ambulatory' | 'inpatient' | 'transfer' | 'death';
  readonly outcome?: string;
  readonly clinicalSummary?: string;
  readonly continuityInstructions?: string;
  readonly followUpDate?: string;
  readonly followUpNotes?: string;
}

export interface UpdateDischargeRequest {
  readonly outcome?: string;
  readonly clinicalSummary?: string;
  readonly continuityInstructions?: string;
  readonly followUpDate?: string;
  readonly followUpNotes?: string;
}

export interface DischargeListResponse {
  readonly items: readonly import('@cvg-his-v2/shared-types').DischargeSummary[];
  readonly total: number;
}

// --- Prescription Executions ---

export interface CreatePrescriptionExecutionRequest {
  readonly clinicalEntryId: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly medicationName: string;
  readonly dosage: string;
  readonly route?: string;
  readonly frequency?: string;
  readonly scheduledAt: string;
  readonly notes?: string;
}

export interface ExecutePrescriptionRequest {
  readonly status: 'administered' | 'not-administered';
  readonly notes?: string;
  readonly vitalsSnapshot?: Record<string, unknown>;
}

export interface SuspendPrescriptionRequest {
  readonly reason: string;
}

export interface LogAdministrationEventRequest {
  readonly eventType: string;
  readonly notes?: string;
  readonly vitalsSnapshot?: Record<string, unknown>;
}

export interface PrescriptionExecutionListResponse {
  readonly items: readonly import('@cvg-his-v2/shared-types').PrescriptionExecutionSummary[];
  readonly total: number;
}

// --- MFA TOTP ---

export interface MfaSetupResponse {
  readonly secret: string;
  readonly provisioningUri: string;
  readonly recoveryCodes: readonly string[];
}

export interface MfaSetupConfirmRequest {
  readonly userId: string;
  readonly token: string;
}

export interface MfaLoginRequest {
  readonly userId: string;
  readonly token: string;
}

export interface MfaStatusResponse {
  readonly isActive: boolean;
  readonly isRequired: boolean;
}

export interface LoginMfaRequiredResponse {
  readonly requiresMfa: true;
  readonly userId: string;
  readonly mfaMethods: readonly string[];
}

export interface CreateWebhookRequest {
  readonly url: string;
  readonly events: readonly string[];
  readonly secret?: string;
}

export interface UpdateWebhookRequest {
  readonly url?: string;
  readonly events?: readonly string[];
  readonly isActive?: boolean;
}

export interface WebhookListResponse {
  readonly items: readonly import('@cvg-his-v2/shared-types').WebhookSummary[];
}

export interface WebhookDeliveryListResponse {
  readonly items: readonly import('@cvg-his-v2/shared-types').WebhookDeliverySummary[];
}

export interface WebhookPayload {
  readonly id: string;
  readonly event: string;
  readonly timestamp: string;
  readonly accountId: string;
  readonly data: Record<string, unknown>;
}
