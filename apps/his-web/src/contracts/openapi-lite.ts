/**
 * OpenAPI Lite Contract Layer
 *
 * This file re-exports schemas from @cvg-his/contracts and provides
 * API client utilities for his-web.
 *
 * The contracts package is the single source of truth for all API schemas.
 */
import { z } from 'zod';

// Import from shared contracts package
import {
  // Common
  uuidSchema,
  requiredString,
  optionalString,
  paginationQuerySchema,
  idParamSchema,
  searchQuerySchema,
  createPaginatedResponseSchema,
  errorResponseSchema,
  validationErrorResponseSchema,
  type PaginationQuery,
  type IdParam,
  type SearchQuery,
  type ErrorResponse,
  type ValidationErrorResponse,

  // Owners
  createOwnerBodySchema,
  updateOwnerBodySchema,
  ownerIdParamSchema,
  listOwnersQuerySchema,
  ownerResponseSchema,
  listOwnersResponseSchema,
  ownerSummaryResponseSchema,
  ownersContract,
  type CreateOwnerBody,
  type UpdateOwnerBody,
  type OwnerIdParam,
  type ListOwnersQuery,
  type OwnerResponse,
  type ListOwnersResponse,
  type OwnerSummaryResponse,
  type OwnersContract,

  // Patients
  createPatientBodySchema,
  updatePatientBodySchema,
  patientIdParamSchema,
  listPatientsQuerySchema,
  patientResponseSchema,
  listPatientsResponseSchema,
  patientSummaryResponseSchema,
  alertSchema,
  patientsContract,
  type AlertDto,
  type CreatePatientBody,
  type UpdatePatientBody,
  type PatientIdParam,
  type ListPatientsQuery,
  type PatientResponse,
  type ListPatientsResponse,
  type PatientSummaryResponse,
  type PatientsContract,

  // Encounters
  createEncounterBodySchema,
  closeEncounterBodySchema,
  encounterIdParamSchema,
  listEncountersQuerySchema,
  encounterResponseSchema,
  listEncountersResponseSchema,
  encounterTimelineNoteSchema,
  encounterTimelineVersionSchema,
  encounterTimelineDocumentSchema,
  encounterTimelineEventSchema,
  encounterTimelineResponseSchema,
  encounterStatusSchema,
  encountersContract,
  type EncounterStatus,
  type CreateEncounterBody,
  type CloseEncounterBody,
  type EncounterIdParam,
  type ListEncountersQuery,
  type EncounterResponse,
  type ListEncountersResponse,
  type EncounterTimelineNote,
  type EncounterTimelineVersion,
  type EncounterTimelineDocument,
  type EncounterTimelineEvent,
  type EncounterTimelineResponse,
  type EncountersContract,

  // Full API Contract
  apiContract as sharedApiContract,
  contractEndpoints,
  type ApiContract as SharedApiContract,
  type ContractEndpoints
} from '@cvg-his/contracts';

// Re-export all imported items
export {
  // Common
  uuidSchema,
  requiredString,
  optionalString,
  paginationQuerySchema,
  idParamSchema,
  searchQuerySchema,
  createPaginatedResponseSchema,
  errorResponseSchema,
  validationErrorResponseSchema,
  type PaginationQuery,
  type IdParam,
  type SearchQuery,
  type ErrorResponse,
  type ValidationErrorResponse,

  // Owners
  createOwnerBodySchema,
  updateOwnerBodySchema,
  ownerIdParamSchema,
  listOwnersQuerySchema,
  ownerResponseSchema,
  listOwnersResponseSchema,
  ownerSummaryResponseSchema,
  ownersContract,
  type CreateOwnerBody,
  type UpdateOwnerBody,
  type OwnerIdParam,
  type ListOwnersQuery,
  type OwnerResponse,
  type ListOwnersResponse,
  type OwnerSummaryResponse,
  type OwnersContract,

  // Patients
  createPatientBodySchema,
  updatePatientBodySchema,
  patientIdParamSchema,
  listPatientsQuerySchema,
  patientResponseSchema,
  listPatientsResponseSchema,
  patientSummaryResponseSchema,
  alertSchema,
  patientsContract,
  type AlertDto,
  type CreatePatientBody,
  type UpdatePatientBody,
  type PatientIdParam,
  type ListPatientsQuery,
  type PatientResponse,
  type ListPatientsResponse,
  type PatientSummaryResponse,
  type PatientsContract,

  // Encounters
  createEncounterBodySchema,
  closeEncounterBodySchema,
  encounterIdParamSchema,
  listEncountersQuerySchema,
  encounterResponseSchema,
  listEncountersResponseSchema,
  encounterTimelineNoteSchema,
  encounterTimelineVersionSchema,
  encounterTimelineDocumentSchema,
  encounterTimelineEventSchema,
  encounterTimelineResponseSchema,
  encounterStatusSchema,
  encountersContract,
  type EncounterStatus,
  type CreateEncounterBody,
  type CloseEncounterBody,
  type EncounterIdParam,
  type ListEncountersQuery,
  type EncounterResponse,
  type ListEncountersResponse,
  type EncounterTimelineNote,
  type EncounterTimelineVersion,
  type EncounterTimelineDocument,
  type EncounterTimelineEvent,
  type EncounterTimelineResponse,
  type EncountersContract,

  // Shared API Contract
  sharedApiContract,
  contractEndpoints,
  type SharedApiContract,
  type ContractEndpoints
};

/**
 * ==========================================
 * LOCAL TYPES (convenience aliases)
 * ==========================================
 */

/**
 * Compatibility aliases expected by his-web.
 *
 * Keep these names stable even if the shared contracts package uses
 * more explicit *Body / *Response naming internally.
 */
export const OwnerCreateSchema = createOwnerBodySchema;
export const OwnerReadSchema = ownerResponseSchema;
export const PatientCreateSchema = createPatientBodySchema;
export const PatientReadSchema = patientResponseSchema;
export const EncounterCreateSchema = createEncounterBodySchema;
export const EncounterReadSchema = encounterResponseSchema;

/** Owner type alias for his-web */
export type Owner = z.infer<typeof OwnerReadSchema>;

/** Patient type alias for his-web */
export type Patient = z.infer<typeof PatientReadSchema>;

/** Encounter type alias for his-web */
export type Encounter = z.infer<typeof EncounterReadSchema>;

/** Alert type alias for his-web */
export type Alert = z.infer<typeof alertSchema>;

/**
 * ==========================================
 * ADDITIONAL SCHEMAS (not in shared contracts)
 * ==========================================
 * These schemas are specific to his-web and not shared with his-api.
 * They may be for UI-specific data or third-party integrations.
 */

// Clinical Alert (from alerts module)
export const ClinicalAlertSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  type: z.enum(['medication_delay', 'dose_refused_needs_review']),
  stayId: uuidSchema,
  orderId: uuidSchema,
  scheduledFor: z.string().datetime(),
  severity: z.enum(['low', 'medium', 'high']),
  message: z.string(),
  status: z.enum(['active', 'acknowledged', 'resolved']),
  acknowledgedAt: z.string().datetime().nullable().optional(),
  acknowledgedByUserId: uuidSchema.nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  resolvedByUserId: uuidSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type ClinicalAlert = z.infer<typeof ClinicalAlertSchema>;

// SOAP Schema (for clinical notes)
export const SoapSchema = z.object({
  subjective: z.string().min(1),
  objective: z.string().min(1),
  assessment: z.string().min(1),
  plan: z.string().min(1)
});

export const NoteCreateSchema = z.object({
  encounterId: uuidSchema,
  soap: SoapSchema,
  reason: z.string().min(1).optional()
});

export const NoteReadSchema = z.object({
  id: uuidSchema,
  encounterId: uuidSchema,
  status: z.enum(['draft', 'signed']),
  soap: SoapSchema,
  createdAt: z.coerce.date(),
  signedAt: z.coerce.date().nullable().optional(),
  signedByUserId: uuidSchema.nullable().optional()
});

export type Soap = z.infer<typeof SoapSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteRead = z.infer<typeof NoteReadSchema>;

// BedMap & Inpatient
export const BedMapItemSchema = z.object({
  bed: z.object({
    id: uuidSchema,
    name: z.string(),
    code: z.string().nullable().optional(),
    wardId: uuidSchema
  }),
  status: z.enum(['available', 'occupied', 'blocked', 'cleaning']),
  stay: z.object({
    id: uuidSchema,
    patientId: uuidSchema,
    patientName: z.string(),
    species: z.string(),
    admittedAt: z.string(),
    reason: z.string().nullable().optional()
  }).nullable().optional()
});

export const InpatientAdmitSchema = z.object({
  patientId: uuidSchema,
  wardId: uuidSchema,
  bedId: uuidSchema,
  encounterId: uuidSchema.optional(),
  reason: z.string().min(1).optional(),
  chiefComplaint: z.string().min(1).optional(),
  planSummary: z.string().min(1).optional()
});

export const InpatientDischargeSchema = z.object({
  reason: z.string().min(1)
});

export const InpatientTransferSchema = z.object({
  toWardId: uuidSchema,
  toBedId: uuidSchema,
  reason: z.string().min(1).optional()
});

export type BedMapItem = z.infer<typeof BedMapItemSchema>;
export type InpatientAdmit = z.infer<typeof InpatientAdmitSchema>;
export type InpatientDischarge = z.infer<typeof InpatientDischargeSchema>;
export type InpatientTransfer = z.infer<typeof InpatientTransferSchema>;

// Medications
export const MedicationOrderCreateSchema = z.object({
  patientId: uuidSchema,
  stayId: uuidSchema.optional(),
  medicationName: z.string().min(1),
  doseValue: z.coerce.number().positive(),
  doseUnit: z.string().min(1),
  route: z.enum(['IV', 'IM', 'VO', 'SC', 'TOP', 'OTHER']),
  frequencyType: z.enum(['q8h', 'q12h', 'sid', 'bid', 'tid', 'custom']),
  startAt: z.string().datetime(),
  durationValue: z.number().optional(),
  durationUnit: z.enum(['days', 'hours']).optional()
});

export type MedicationOrderCreate = z.infer<typeof MedicationOrderCreateSchema>;

// Handovers
export const HandoverItemSchema = z.object({
  stayId: uuidSchema,
  problems_json: z.array(z.string()),
  plan_json: z.array(z.string()),
  notes: z.string().min(1).optional()
});

export const HandoverDraftSchema = z.object({
  wardId: uuidSchema,
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftPeriod: z.enum(['day', 'night', 'custom']),
  items: z.array(HandoverItemSchema)
});

export type HandoverItem = z.infer<typeof HandoverItemSchema>;
export type HandoverDraft = z.infer<typeof HandoverDraftSchema>;

/**
 * ==========================================
 * EXTENDED API CONTRACT
 * ==========================================
 * Combines shared contracts with his-web specific endpoints
 */
export const ApiContract = {
  auth: {
    headers: {
      accountId: 'x-account-id',
      userId: 'x-user-id',
      role: 'x-role'
    }
  },
  // Import shared contracts
  owners: sharedApiContract.owners,
  patients: sharedApiContract.patients,
  encounters: sharedApiContract.encounters,

  // his-web specific contracts
  inpatient: {
    bedMap: {
      method: 'GET' as const,
      path: '/inpatient/map',
      responses: {
        200: z.object({ wards: z.array(z.object({ name: z.string(), beds: z.array(BedMapItemSchema) })) })
      }
    },
    admit: {
      method: 'POST' as const,
      path: '/inpatient/admit',
      body: InpatientAdmitSchema,
      responses: {
        201: z.object({ stayId: uuidSchema })
      }
    },
    discharge: {
      method: 'POST' as const,
      path: '/inpatient/stays/:id/discharge',
      body: InpatientDischargeSchema,
      responses: {
        200: z.object({ success: z.boolean() })
      }
    },
    transfer: {
      method: 'POST' as const,
      path: '/inpatient/stays/:id/transfer',
      body: InpatientTransferSchema,
      responses: {
        200: z.object({ success: z.boolean() })
      }
    }
  },
  clinicalNotes: {
    create: {
      method: 'POST' as const,
      path: '/encounters/:id/notes',
      body: NoteCreateSchema,
      responses: {
        201: NoteReadSchema
      }
    },
    sign: {
      method: 'POST' as const,
      path: '/notes/:id/sign',
      body: z.object({}),
      responses: {
        200: z.object({ note: NoteReadSchema, event: z.object({ name: z.literal('ClinicalNoteSigned') }) })
      }
    }
  },
  medications: {
    createOrder: {
      method: 'POST' as const,
      path: '/medications/orders',
      body: MedicationOrderCreateSchema,
      responses: {
        201: z.object({ id: uuidSchema })
      }
    }
  },
  handovers: {
    draft: {
      method: 'POST' as const,
      path: '/handovers/draft',
      body: HandoverDraftSchema,
      responses: {
        201: z.object({ id: uuidSchema, status: z.literal('draft') })
      }
    },
    publish: {
      method: 'POST' as const,
      path: '/handovers/:id/publish',
      body: z.object({}),
      responses: {
        202: z.object({ jobId: uuidSchema })
      }
    }
  },
  alerts: {
    search: {
      method: 'GET' as const,
      path: '/alerts',
      query: z.object({
        stayId: uuidSchema.optional(),
        type: z.enum(['medication_delay', 'dose_refused_needs_review']).optional(),
        status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(20)
      }),
      responses: {
        200: z.object({ data: z.array(ClinicalAlertSchema), total: z.number() })
      }
    }
  }
} as const;

export type ApiContractType = typeof ApiContract;
