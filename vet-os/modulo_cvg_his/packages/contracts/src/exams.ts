import { z } from 'zod';

import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  trim,
  uuidSchema
} from './common.js';

// =====================
// Enums
// =====================

const examOrderStatusSchema = z.enum(['requested', 'collected', 'in_progress', 'completed', 'cancelled']);
const examOrderPrioritySchema = z.enum(['routine', 'urgent', 'stat']);
const examCategorySchema = z.enum(['laboratory', 'imaging', 'other']);
const examResultStatusSchema = z.enum(['draft', 'review_required', 'approved', 'released', 'cancelled']);

// =====================
// Exam Orders
// =====================

const examNameSchema = z.string().transform(trim).pipe(z.string().min(1).max(255));
const examCodeSchema = z.string().transform(trim).pipe(z.string().min(1).max(64)).optional().nullable();
const notesSchema = z.string().transform(trim).pipe(z.string().min(1).max(5000)).optional().nullable();

export const createExamOrderBodySchema = z.object({
  patientId: uuidSchema,
  encounterId: uuidSchema.optional().nullable(),
  category: examCategorySchema.optional(),
  examName: examNameSchema,
  examCode: examCodeSchema,
  priority: examOrderPrioritySchema.optional(),
  notes: notesSchema
});

export const updateExamOrderBodySchema = z.object({
  status: examOrderStatusSchema.optional(),
  priority: examOrderPrioritySchema.optional(),
  notes: notesSchema
}).refine(v => Object.values(v).some(x => x !== undefined), 'At least one field required');

export const examOrderIdParamSchema = idParamSchema;

export const listExamOrdersQuerySchema = paginationQuerySchema.merge(searchQuerySchema).merge(z.object({
  patientId: uuidSchema.optional(),
  encounterId: uuidSchema.optional(),
  status: examOrderStatusSchema.optional(),
  category: examCategorySchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}));

export const examOrderResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  patientId: uuidSchema,
  encounterId: uuidSchema.nullable().optional(),
  requestedByUserId: uuidSchema,
  category: examCategorySchema,
  examName: z.string(),
  examCode: z.string().nullable().optional(),
  priority: examOrderPrioritySchema,
  status: examOrderStatusSchema,
  notes: z.string().nullable().optional(),
  requestedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listExamOrdersResponseSchema = createPaginatedResponseSchema(examOrderResponseSchema);

export type CreateExamOrderBody = z.infer<typeof createExamOrderBodySchema>;
export type UpdateExamOrderBody = z.infer<typeof updateExamOrderBodySchema>;
export type ExamOrderIdParam = z.infer<typeof examOrderIdParamSchema>;
export type ListExamOrdersQuery = z.infer<typeof listExamOrdersQuerySchema>;
export type ExamOrderResponse = z.infer<typeof examOrderResponseSchema>;
export type ListExamOrdersResponse = z.infer<typeof listExamOrdersResponseSchema>;

// =====================
// Exam Results
// =====================

export const createExamResultBodySchema = z.object({
  examOrderId: uuidSchema,
  findings: notesSchema,
  interpretation: notesSchema,
  resultValues: z.string().optional().nullable(), // JSON string
  normalRange: z.string().optional().nullable(), // JSON string
  notes: notesSchema
});

export const updateExamResultBodySchema = z.object({
  status: examResultStatusSchema.optional(),
  findings: notesSchema,
  interpretation: notesSchema,
  resultValues: z.string().optional().nullable(),
  normalRange: z.string().optional().nullable(),
  notes: notesSchema
}).refine(v => Object.values(v).some(x => x !== undefined), 'At least one field required');

export const examResultIdParamSchema = idParamSchema;

export const listExamResultsQuerySchema = paginationQuerySchema.merge(searchQuerySchema).merge(z.object({
  patientId: uuidSchema.optional(),
  examOrderId: uuidSchema.optional(),
  status: examResultStatusSchema.optional(),
  category: examCategorySchema.optional()
}));

export const examResultResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  patientId: uuidSchema,
  examOrderId: uuidSchema,
  category: z.string(),
  examName: z.string(),
  examCode: z.string().nullable().optional(),
  requestedAt: z.coerce.date(),
  status: examResultStatusSchema,
  findings: z.string().nullable().optional(),
  interpretation: z.string().nullable().optional(),
  resultValues: z.string().nullable().optional(),
  normalRange: z.string().nullable().optional(),
  performedByUserId: uuidSchema.nullable().optional(),
  performedAt: z.coerce.date().nullable().optional(),
  reviewedByUserId: uuidSchema.nullable().optional(),
  reviewedAt: z.coerce.date().nullable().optional(),
  releasedAt: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listExamResultsResponseSchema = createPaginatedResponseSchema(examResultResponseSchema);

export type CreateExamResultBody = z.infer<typeof createExamResultBodySchema>;
export type UpdateExamResultBody = z.infer<typeof updateExamResultBodySchema>;
export type ExamResultIdParam = z.infer<typeof examResultIdParamSchema>;
export type ListExamResultsQuery = z.infer<typeof listExamResultsQuerySchema>;
export type ExamResultResponse = z.infer<typeof examResultResponseSchema>;
export type ListExamResultsResponse = z.infer<typeof listExamResultsResponseSchema>;

// =====================
// Contracts
// =====================

export const examOrdersContract = {
  create: { method: 'POST' as const, path: '/exam-orders', body: createExamOrderBodySchema, responses: { 201: examOrderResponseSchema } },
  getById: { method: 'GET' as const, path: '/exam-orders/:id', params: examOrderIdParamSchema, responses: { 200: examOrderResponseSchema } },
  list: { method: 'GET' as const, path: '/exam-orders', query: listExamOrdersQuerySchema, responses: { 200: listExamOrdersResponseSchema } },
  update: { method: 'PATCH' as const, path: '/exam-orders/:id', params: examOrderIdParamSchema, body: updateExamOrderBodySchema, responses: { 200: examOrderResponseSchema } }
} as const;

export const examResultsContract = {
  create: { method: 'POST' as const, path: '/exam-results', body: createExamResultBodySchema, responses: { 201: examResultResponseSchema } },
  getById: { method: 'GET' as const, path: '/exam-results/:id', params: examResultIdParamSchema, responses: { 200: examResultResponseSchema } },
  list: { method: 'GET' as const, path: '/exam-results', query: listExamResultsQuerySchema, responses: { 200: listExamResultsResponseSchema } },
  update: { method: 'PATCH' as const, path: '/exam-results/:id', params: examResultIdParamSchema, body: updateExamResultBodySchema, responses: { 200: examResultResponseSchema } }
} as const;

export type ExamOrdersContract = typeof examOrdersContract;
export type ExamResultsContract = typeof examResultsContract;
