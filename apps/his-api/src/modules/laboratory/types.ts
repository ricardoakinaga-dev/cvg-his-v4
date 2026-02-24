import { z } from 'zod';

// ============================================
// LAB TESTS CATALOG
// ============================================

export type LabTestRecord = {
  id: string;
  accountId: string;
  code: string;
  name: string;
  categoryId: string | null;
  description: string | null;
  method: string | null;
  specimenType: string;
  specimenVolume: string | null;
  specimenInstructions: string | null;
  turnaroundHours: number | null;
  isActive: boolean;
  requiresFasting: boolean | null;
  specialInstructions: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LabTestCategoryRecord = {
  id: string;
  accountId: string;
  name: string;
  parentId: string | null;
  displayOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Specimen types
export const SPECIMEN_TYPES = ['blood', 'urine', 'feces', 'tissue', 'swab', 'fluid', 'biopsy', 'other'] as const;

// Zod schemas for lab tests
export const labTestIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listLabTestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  specimenType: z.enum(SPECIMEN_TYPES).optional(),
  active: z.coerce.boolean().optional()
});

export const labTestCreateSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  method: z.string().max(200).nullable().optional(),
  specimenType: z.enum(SPECIMEN_TYPES).default('blood'),
  specimenVolume: z.string().max(50).nullable().optional(),
  specimenInstructions: z.string().max(500).nullable().optional(),
  turnaroundHours: z.coerce.number().int().min(1).default(24),
  isActive: z.boolean().default(true),
  requiresFasting: z.boolean().default(false),
  specialInstructions: z.string().max(500).nullable().optional()
});

export const labTestUpdateSchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  method: z.string().max(200).nullable().optional(),
  specimenType: z.enum(SPECIMEN_TYPES).optional(),
  specimenVolume: z.string().max(50).nullable().optional(),
  specimenInstructions: z.string().max(500).nullable().optional(),
  turnaroundHours: z.coerce.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  requiresFasting: z.boolean().optional(),
  specialInstructions: z.string().max(500).nullable().optional()
});

// ============================================
// LAB ORDERS
// ============================================

export type LabOrderRecord = {
  id: string;
  accountId: string;
  orderNumber: string;
  patientId: string;
  encounterId: string | null;
  requesterUserId: string | null;
  status: string;
  priority: string | null;
  clinicalNotes: string | null;
  diagnosis: string | null;
  fastingStatus: string | null;
  orderedAt: Date;
  collectedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelledReason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LabOrderItemRecord = {
  id: string;
  accountId: string;
  orderId: string;
  testId: string;
  panelId: string | null;
  status: string;
  priority: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const LAB_ORDER_STATUSES = ['pending', 'partial', 'collected', 'processing', 'partial_result', 'completed', 'cancelled'] as const;
export const LAB_ORDER_PRIORITIES = ['stat', 'asap', 'routine', 'timed'] as const;

export const labOrderIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listLabOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  status: z.enum(LAB_ORDER_STATUSES).optional(),
  priority: z.enum(LAB_ORDER_PRIORITIES).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional()
});

export const labOrderCreateSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().nullable().optional(),
  priority: z.enum(LAB_ORDER_PRIORITIES).default('routine'),
  clinicalNotes: z.string().max(2000).nullable().optional(),
  diagnosis: z.string().max(500).nullable().optional(),
  fastingStatus: z.string().max(100).nullable().optional(),
  testIds: z.array(z.string().uuid()).min(1),
  panelIds: z.array(z.string().uuid()).optional()
});

export const labOrderUpdateSchema = z.object({
  priority: z.enum(LAB_ORDER_PRIORITIES).optional(),
  clinicalNotes: z.string().max(2000).nullable().optional(),
  diagnosis: z.string().max(500).nullable().optional(),
  fastingStatus: z.string().max(100).nullable().optional()
});

export const labOrderCancelSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

// ============================================
// LAB SAMPLES
// ============================================

export type LabSampleRecord = {
  id: string;
  accountId: string;
  sampleNumber: string;
  orderId: string;
  orderItemId: string | null;
  patientId: string;
  sampleType: string;
  specimenSource: string | null;
  volumeCollected: string | null;
  collectionMethod: string | null;
  status: string;
  collectedAt: Date | null;
  collectedByUserId: string | null;
  receivedAt: Date | null;
  receivedByUserId: string | null;
  processedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const LAB_SAMPLE_STATUSES = ['pending', 'collected', 'received', 'processing', 'rejected', 'discarded'] as const;
export const LAB_SAMPLE_TYPES = ['blood', 'urine', 'feces', 'tissue', 'swab', 'fluid', 'biopsy', 'other'] as const;

export const labSampleIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listLabSamplesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  orderId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(LAB_SAMPLE_STATUSES).optional(),
  sampleType: z.enum(LAB_SAMPLE_TYPES).optional()
});

export const labSampleCreateSchema = z.object({
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid().nullable().optional(),
  sampleType: z.enum(LAB_SAMPLE_TYPES).default('blood'),
  specimenSource: z.string().max(100).nullable().optional(),
  volumeCollected: z.string().max(50).nullable().optional(),
  collectionMethod: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional()
});

export const labSampleCollectSchema = z.object({
  sampleType: z.enum(LAB_SAMPLE_TYPES).optional(),
  specimenSource: z.string().max(100).nullable().optional(),
  volumeCollected: z.string().max(50).nullable().optional(),
  collectionMethod: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional()
});

export const labSampleReceiveSchema = z.object({
  notes: z.string().max(500).nullable().optional()
});

export const labSampleRejectSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

// ============================================
// LAB RESULTS
// ============================================

export type LabResultRecord = {
  id: string;
  accountId: string;
  orderItemId: string;
  sampleId: string | null;
  testId: string;
  patientId: string;
  resultValue: string | null;
  resultNumeric: string | null;
  unit: string | null;
  referenceRange: string | null;
  referenceRangeId: string | null;
  flag: string | null;
  status: string;
  notes: string | null;
  interpretation: string | null;
  performedAt: Date | null;
  performedByUserId: string | null;
  verifiedAt: Date | null;
  verifiedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const LAB_RESULT_STATUSES = ['pending', 'preliminary', 'final', 'corrected', 'cancelled'] as const;
export const LAB_RESULT_FLAGS = ['low', 'high', 'critical_low', 'critical_high', 'abnormal', 'normal'] as const;

export const labResultIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listLabResultsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  orderItemId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(LAB_RESULT_STATUSES).optional(),
  flag: z.enum(LAB_RESULT_FLAGS).optional()
});

export const labResultCreateSchema = z.object({
  orderItemId: z.string().uuid(),
  sampleId: z.string().uuid().nullable().optional(),
  testId: z.string().uuid(),
  patientId: z.string().uuid(),
  resultValue: z.string().max(500).nullable().optional(),
  resultNumeric: z.coerce.number().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  referenceRange: z.string().max(100).nullable().optional(),
  referenceRangeId: z.string().uuid().nullable().optional(),
  flag: z.enum(LAB_RESULT_FLAGS).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  interpretation: z.string().max(1000).nullable().optional()
});

export const labResultUpdateSchema = z.object({
  resultValue: z.string().max(500).nullable().optional(),
  resultNumeric: z.coerce.number().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  referenceRange: z.string().max(100).nullable().optional(),
  referenceRangeId: z.string().uuid().nullable().optional(),
  flag: z.enum(LAB_RESULT_FLAGS).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  interpretation: z.string().max(1000).nullable().optional()
});

// ============================================
// LAB REPORTS
// ============================================

export type LabReportRecord = {
  id: string;
  accountId: string;
  reportNumber: string;
  orderId: string;
  patientId: string;
  status: string;
  conclusion: string | null;
  methodology: string | null;
  limitations: string | null;
  notes: string | null;
  draftedAt: Date | null;
  draftedByUserId: string | null;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  finalizedAt: Date | null;
  finalizedByUserId: string | null;
  signedAt: Date | null;
  signedByUserId: string | null;
  signatureHash: string | null;
  amendedAt: Date | null;
  amendedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const LAB_REPORT_STATUSES = ['draft', 'pending_review', 'finalized', 'signed', 'amended'] as const;

export const labReportIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listLabReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  orderId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(LAB_REPORT_STATUSES).optional()
});

export const labReportCreateSchema = z.object({
  orderId: z.string().uuid(),
  conclusion: z.string().max(5000).nullable().optional(),
  methodology: z.string().max(1000).nullable().optional(),
  limitations: z.string().max(1000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  resultIds: z.array(z.string().uuid()).optional()
});

export const labReportUpdateSchema = z.object({
  conclusion: z.string().max(5000).nullable().optional(),
  methodology: z.string().max(1000).nullable().optional(),
  limitations: z.string().max(1000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  resultIds: z.array(z.string().uuid()).optional()
});

export const labReportSignSchema = z.object({
  pin: z.string().min(4).max(6).optional() // MVP: simple PIN for signature
});

// ============================================
// REFERENCE RANGES
// ============================================

export type LabReferenceRangeRecord = {
  id: string;
  accountId: string;
  testId: string;
  species: string | null;
  gender: string | null;
  ageMinDays: string | null;
  ageMaxDays: string | null;
  lowValue: string | null;
  highValue: string | null;
  lowCritical: string | null;
  highCritical: string | null;
  unit: string | null;
  interpretationNotes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const GENDERS = ['male', 'female', 'both'] as const;

export const labReferenceRangeIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listLabReferenceRangesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  testId: z.string().uuid().optional(),
  species: z.string().max(50).optional(),
  active: z.coerce.boolean().optional()
});

export const labReferenceRangeCreateSchema = z.object({
  testId: z.string().uuid(),
  species: z.string().max(50).nullable().optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  ageMinDays: z.coerce.number().int().min(0).nullable().optional(),
  ageMaxDays: z.coerce.number().int().min(0).nullable().optional(),
  lowValue: z.coerce.number().nullable().optional(),
  highValue: z.coerce.number().nullable().optional(),
  lowCritical: z.coerce.number().nullable().optional(),
  highCritical: z.coerce.number().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  interpretationNotes: z.string().max(500).nullable().optional(),
  isActive: z.boolean().default(true)
});

export const labReferenceRangeUpdateSchema = z.object({
  species: z.string().max(50).nullable().optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  ageMinDays: z.coerce.number().int().min(0).nullable().optional(),
  ageMaxDays: z.coerce.number().int().min(0).nullable().optional(),
  lowValue: z.coerce.number().nullable().optional(),
  highValue: z.coerce.number().nullable().optional(),
  lowCritical: z.coerce.number().nullable().optional(),
  highCritical: z.coerce.number().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  interpretationNotes: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional()
});

// Type exports
export type ListLabTestsQuery = z.infer<typeof listLabTestsQuerySchema>;
export type LabTestCreateInput = z.infer<typeof labTestCreateSchema>;
export type LabTestUpdateInput = z.infer<typeof labTestUpdateSchema>;
export type ListLabOrdersQuery = z.infer<typeof listLabOrdersQuerySchema>;
export type LabOrderCreateInput = z.infer<typeof labOrderCreateSchema>;
export type LabOrderUpdateInput = z.infer<typeof labOrderUpdateSchema>;
export type LabOrderCancelInput = z.infer<typeof labOrderCancelSchema>;
export type ListLabSamplesQuery = z.infer<typeof listLabSamplesQuerySchema>;
export type LabSampleCreateInput = z.infer<typeof labSampleCreateSchema>;
export type LabSampleCollectInput = z.infer<typeof labSampleCollectSchema>;
export type LabSampleReceiveInput = z.infer<typeof labSampleReceiveSchema>;
export type LabSampleRejectInput = z.infer<typeof labSampleRejectSchema>;
export type ListLabResultsQuery = z.infer<typeof listLabResultsQuerySchema>;
export type LabResultCreateInput = z.infer<typeof labResultCreateSchema>;
export type LabResultUpdateInput = z.infer<typeof labResultUpdateSchema>;
export type ListLabReportsQuery = z.infer<typeof listLabReportsQuerySchema>;
export type LabReportCreateInput = z.infer<typeof labReportCreateSchema>;
export type LabReportUpdateInput = z.infer<typeof labReportUpdateSchema>;
export type LabReportSignInput = z.infer<typeof labReportSignSchema>;
export type ListLabReferenceRangesQuery = z.infer<typeof listLabReferenceRangesQuerySchema>;
export type LabReferenceRangeCreateInput = z.infer<typeof labReferenceRangeCreateSchema>;
export type LabReferenceRangeUpdateInput = z.infer<typeof labReferenceRangeUpdateSchema>;
