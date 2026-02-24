import { z } from 'zod';
// Specimen types
export const SPECIMEN_TYPES = ['blood', 'urine', 'feces', 'tissue', 'swab', 'fluid', 'biopsy', 'other'];
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
export const LAB_ORDER_STATUSES = ['pending', 'partial', 'collected', 'processing', 'partial_result', 'completed', 'cancelled'];
export const LAB_ORDER_PRIORITIES = ['stat', 'asap', 'routine', 'timed'];
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
export const LAB_SAMPLE_STATUSES = ['pending', 'collected', 'received', 'processing', 'rejected', 'discarded'];
export const LAB_SAMPLE_TYPES = ['blood', 'urine', 'feces', 'tissue', 'swab', 'fluid', 'biopsy', 'other'];
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
export const LAB_RESULT_STATUSES = ['pending', 'preliminary', 'final', 'corrected', 'cancelled'];
export const LAB_RESULT_FLAGS = ['low', 'high', 'critical_low', 'critical_high', 'abnormal', 'normal'];
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
export const LAB_REPORT_STATUSES = ['draft', 'pending_review', 'finalized', 'signed', 'amended'];
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
export const GENDERS = ['male', 'female', 'both'];
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
//# sourceMappingURL=types.js.map