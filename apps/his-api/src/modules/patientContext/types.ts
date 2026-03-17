import { z } from 'zod';

/**
 * Patient Context Types
 * 
 * Types for the Patient Context system that provides a unified view
 * of patient information across MAR, Notes, and Orders modules.
 */

// Risk levels for anesthesia
export const AnesthesiaRiskSchema = z.enum(['low', 'medium', 'high']);
export type AnesthesiaRisk = z.infer<typeof AnesthesiaRiskSchema>;

// Patient alerts structure
export const PatientAlertsSchema = z.object({
  aggressive: z.boolean().optional(),
  allergies: z.array(z.string()).optional(),
  anesthesia_risk: AnesthesiaRiskSchema.nullable().optional(),
  chronic_conditions: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});
export type PatientAlerts = z.infer<typeof PatientAlertsSchema>;

// Highlighted alerts for quick display
export const HighlightedAlertsSchema = z.object({
  aggressive: z.boolean(),
  allergiesCount: z.number(),
  anesthesiaRisk: AnesthesiaRiskSchema.nullable(),
  chronicConditionsCount: z.number(),
  hasNotes: z.boolean(),
});
export type HighlightedAlerts = z.infer<typeof HighlightedAlertsSchema>;

// Patient basic info for context
export const PatientContextInfoSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  ownerName: z.string().optional(),
  name: z.string(),
  species: z.string(),
  breed: z.string().nullable(),
  sex: z.string().nullable(),
  birthDate: z.string().nullable(),
  ageMonths: z.number().nullable().optional(),
  weightKg: z.string().nullable(),
  microchip: z.string().nullable(),
  alerts: PatientAlertsSchema,
  highlightedAlerts: HighlightedAlertsSchema,
  // Patient safety fields for MAR
  bedName: z.string().nullable().optional(),
  wardName: z.string().nullable().optional(),
  stayStatus: z.enum(['active', 'discharged', 'transferred']).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PatientContextInfo = z.infer<typeof PatientContextInfoSchema>;

// Inpatient stay context
export const StayContextInfoSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  wardId: z.string().uuid(),
  wardName: z.string(),
  bedId: z.string().uuid(),
  bedName: z.string(),
  status: z.enum(['active', 'discharged', 'transferred']),
  admittedAt: z.string(),
  dischargedAt: z.string().nullable(),
  chiefComplaint: z.string().nullable(),
  reason: z.string().nullable(),
  planSummary: z.string().nullable(),
});
export type StayContextInfo = z.infer<typeof StayContextInfoSchema>;

// Encounter context
export const EncounterContextInfoSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  status: z.enum(['open', 'closed']),
  openedAt: z.string(),
  closedAt: z.string().nullable(),
  reason: z.string().nullable(),
});
export type EncounterContextInfo = z.infer<typeof EncounterContextInfoSchema>;

// Navigation items for quick access
export const QuickNavItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type QuickNavItem = z.infer<typeof QuickNavItemSchema>;

// Full patient context response
export const PatientContextResponseSchema = z.object({
  patient: PatientContextInfoSchema,
  stay: StayContextInfoSchema.nullable(),
  encounter: EncounterContextInfoSchema.nullable(),
  navigation: z.object({
    mar: QuickNavItemSchema.optional(),
    notes: QuickNavItemSchema.optional(),
    orders: QuickNavItemSchema.optional(),
    record: QuickNavItemSchema.optional(),
  }),
});
export type PatientContextResponse = z.infer<typeof PatientContextResponseSchema>;

// Request params
export const patientContextParamsSchema = z.object({
  patientId: z.string().uuid(),
});

export const stayContextParamsSchema = z.object({
  stayId: z.string().uuid(),
});

export type PatientContextParams = z.infer<typeof patientContextParamsSchema>;
export type StayContextParams = z.infer<typeof stayContextParamsSchema>;
