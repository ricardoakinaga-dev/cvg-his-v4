import { z } from 'zod';
import { uuidSchema } from './common.js';

// Start encounter from appointment
export const startEncounterFromAppointmentBodySchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500).optional(),
  notes: z.string().max(2000).optional().nullable()
});

export type StartEncounterFromAppointmentBody = z.infer<typeof startEncounterFromAppointmentBodySchema>;

// Create exam order from encounter
export const createExamOrderFromEncounterBodySchema = z.object({
  patientId: uuidSchema,
  category: z.enum(['laboratory', 'imaging', 'other']).optional(),
  examName: z.string().min(1).max(255),
  examCode: z.string().min(1).max(64).optional().nullable(),
  priority: z.enum(['routine', 'urgent', 'stat']).optional(),
  notes: z.string().max(5000).optional().nullable()
});

export type CreateExamOrderFromEncounterBody = z.infer<typeof createExamOrderFromEncounterBodySchema>;

// Add billing item from encounter (shortcut)
export const addBillingItemFromEncounterBodySchema = z.object({
  catalogItemId: uuidSchema,
  itemType: z.enum(['service', 'product']),
  quantity: z.coerce.number().int().min(1).max(9999).optional(),
  notes: z.string().max(1000).optional().nullable()
});

export type AddBillingItemFromEncounterBody = z.infer<typeof addBillingItemFromEncounterBodySchema>;

// Financial close from encounter (shortcut)
export const closeFinancialFromEncounterBodySchema = z.object({
  paidAmount: z.coerce.number().nonnegative().max(999999999.99),
  notes: z.string().max(1000).optional().nullable()
});

export type CloseFinancialFromEncounterBody = z.infer<typeof closeFinancialFromEncounterBodySchema>;

// Integrated encounter summary
export const encounterIntegratedSummarySchema = z.object({
  encounter: z.object({
    id: uuidSchema,
    patientId: uuidSchema,
    patientName: z.string(),
    ownerId: uuidSchema,
    ownerName: z.string(),
    status: z.string(),
    reason: z.string(),
    openedAt: z.coerce.date()
  }),
  appointment: z.object({
    id: uuidSchema,
    type: z.string(),
    status: z.string(),
    startAt: z.coerce.date()
  }).nullable().optional(),
  billing: z.object({
    itemCount: z.number(),
    subtotal: z.number(),
    total: z.number()
  }).nullable().optional(),
  financial: z.object({
    status: z.string(),
    paidAmount: z.number(),
    balanceDue: z.number(),
    closed: z.boolean()
  }).nullable().optional(),
  examOrders: z.array(z.object({
    id: uuidSchema,
    examName: z.string(),
    status: z.string(),
    category: z.string()
  }))
});

export type EncounterIntegratedSummary = z.infer<typeof encounterIntegratedSummarySchema>;

// Integration contract
export const integrationContract = {
  startEncounterFromAppointment: {
    method: 'POST' as const,
    path: '/appointments/:id/start-encounter',
    responses: { 201: z.object({ encounterId: uuidSchema, appointmentId: uuidSchema }) }
  },
  createExamOrderFromEncounter: {
    method: 'POST' as const,
    path: '/encounters/:id/exam-orders',
    body: createExamOrderFromEncounterBodySchema,
    responses: { 201: z.any() }
  },
  getEncounterIntegratedSummary: {
    method: 'GET' as const,
    path: '/encounters/:id/summary',
    responses: { 200: encounterIntegratedSummarySchema }
  }
} as const;

export type IntegrationContract = typeof integrationContract;
