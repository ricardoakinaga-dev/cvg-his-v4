import { z } from 'zod';

// ============================================
// IMAGING MODALITIES
// ============================================

export const listImagingModalitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  category: z.string().optional(),
  active: z.coerce.boolean().optional()
});

export const imagingModalityIdParamSchema = z.object({
  id: z.string().uuid()
});

export const imagingModalityCreateSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.enum(['radiology', 'ultrasound', 'ct', 'mri', 'nuclear', 'other']).default('radiology'),
  description: z.string().optional(),
  preparationInstructions: z.string().optional(),
  contrastRequired: z.boolean().default(false),
  contrastType: z.string().optional(),
  estimatedDurationMinutes: z.number().int().min(1).default(30),
  equipmentType: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const imagingModalityUpdateSchema = imagingModalityCreateSchema.partial();

export type ImagingModalityRecord = {
  id: string;
  accountId: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  preparationInstructions: string | null;
  contrastRequired: boolean;
  contrastType: string | null;
  estimatedDurationMinutes: number;
  equipmentType: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ImagingModalityCreateInput = z.infer<typeof imagingModalityCreateSchema>;
export type ImagingModalityUpdateInput = z.infer<typeof imagingModalityUpdateSchema>;

// ============================================
// IMAGING MODALITY TEMPLATES
// ============================================

export const listImagingTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  modalityId: z.string().uuid().optional(),
  q: z.string().optional()
});

export const imagingTemplateIdParamSchema = z.object({
  id: z.string().uuid()
});

export const imagingTemplateCreateSchema = z.object({
  modalityId: z.string().uuid(),
  name: z.string().min(1).max(200),
  templateContent: z.string().min(1),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

export const imagingTemplateUpdateSchema = imagingTemplateCreateSchema.partial();

export type ImagingTemplateRecord = {
  id: string;
  accountId: string;
  modalityId: string;
  name: string;
  templateContent: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ImagingTemplateCreateInput = z.infer<typeof imagingTemplateCreateSchema>;
export type ImagingTemplateUpdateInput = z.infer<typeof imagingTemplateUpdateSchema>;

// ============================================
// IMAGING ORDERS
// ============================================

export const listImagingOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patientId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  modalityId: z.string().uuid().optional(),
  status: z.enum(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['stat', 'asap', 'routine', 'timed']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
});

export const imagingOrderIdParamSchema = z.object({
  id: z.string().uuid()
});

export const imagingOrderCreateSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().nullable(),
  modalityId: z.string().uuid(),
  priority: z.enum(['stat', 'asap', 'routine', 'timed']).default('routine'),
  clinicalIndication: z.string().min(1),
  clinicalHistory: z.string().optional().nullable(),
  suspectedDiagnosis: z.string().optional().nullable(),
  bodyRegion: z.string().optional().nullable(),
  laterality: z.enum(['left', 'right', 'bilateral', 'not_applicable']).optional().nullable(),
  contrastRequested: z.boolean().default(false),
  contrastType: z.string().optional().nullable(),
  sedationRequired: z.boolean().default(false),
  specialInstructions: z.string().optional().nullable()
});

export const imagingOrderUpdateSchema = z.object({
  priority: z.enum(['stat', 'asap', 'routine', 'timed']).optional(),
  clinicalIndication: z.string().min(1).optional(),
  clinicalHistory: z.string().optional().nullable(),
  suspectedDiagnosis: z.string().optional().nullable(),
  bodyRegion: z.string().optional().nullable(),
  laterality: z.enum(['left', 'right', 'bilateral', 'not_applicable']).optional().nullable(),
  contrastRequested: z.boolean().optional(),
  contrastType: z.string().optional().nullable(),
  sedationRequired: z.boolean().optional(),
  specialInstructions: z.string().optional().nullable()
});

export const imagingOrderScheduleSchema = z.object({
  scheduledAt: z.string().datetime()
});

export const imagingOrderCancelSchema = z.object({
  reason: z.string().min(1)
});

export type ImagingOrderRecord = {
  id: string;
  accountId: string;
  orderNumber: string;
  patientId: string;
  encounterId: string | null;
  modalityId: string;
  requesterUserId: string | null;
  status: string;
  priority: string;
  clinicalIndication: string;
  clinicalHistory: string | null;
  suspectedDiagnosis: string | null;
  bodyRegion: string | null;
  laterality: string | null;
  contrastRequested: boolean;
  contrastType: string | null;
  sedationRequired: boolean;
  specialInstructions: string | null;
  scheduledAt: Date | null;
  performedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelledReason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  modality?: ImagingModalityRecord;
  patient?: { id: string; name: string; species: string };
};

export type ImagingOrderCreateInput = z.infer<typeof imagingOrderCreateSchema>;
export type ImagingOrderUpdateInput = z.infer<typeof imagingOrderUpdateSchema>;

// ============================================
// IMAGING STUDIES
// ============================================

export const listImagingStudiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  orderId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  modalityId: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
});

export const imagingStudyIdParamSchema = z.object({
  id: z.string().uuid()
});

export const imagingStudyCreateSchema = z.object({
  orderId: z.string().uuid(),
  studyDatetime: z.string().datetime().optional(),
  bodyRegion: z.string().optional().nullable(),
  laterality: z.enum(['left', 'right', 'bilateral', 'not_applicable']).optional().nullable(),
  contrastAdministered: z.boolean().default(false),
  contrastType: z.string().optional().nullable(),
  contrastVolumeMl: z.number().optional().nullable(),
  sedationAdministered: z.boolean().default(false),
  sedationDetails: z.string().optional().nullable(),
  equipmentUsed: z.string().optional().nullable(),
  acquisitionParameters: z.record(z.unknown()).optional().nullable(),
  numberOfImages: z.number().int().default(0),
  studyNotes: z.string().optional().nullable(),
  technicianUserId: z.string().uuid().optional().nullable()
});

export const imagingStudyUpdateSchema = imagingStudyCreateSchema.partial().omit({ orderId: true });

export const imagingStudyAttachDocumentSchema = z.object({
  documentId: z.string().uuid(),
  attachmentType: z.enum(['image', 'video', 'dicom', 'report', 'other']).default('image'),
  displayOrder: z.number().int().default(0)
});

export type ImagingStudyRecord = {
  id: string;
  accountId: string;
  studyNumber: string;
  orderId: string;
  patientId: string;
  modalityId: string;
  status: string;
  studyDatetime: Date;
  studyDurationMinutes: number | null;
  bodyRegion: string | null;
  laterality: string | null;
  contrastAdministered: boolean;
  contrastType: string | null;
  contrastVolumeMl: number | null;
  sedationAdministered: boolean;
  sedationDetails: string | null;
  equipmentUsed: string | null;
  acquisitionParameters: Record<string, unknown> | null;
  numberOfImages: number;
  studyNotes: string | null;
  performedByUserId: string | null;
  technicianUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  modality?: ImagingModalityRecord;
  order?: ImagingOrderRecord;
  documents?: ImagingStudyDocumentRecord[];
};

export type ImagingStudyDocumentRecord = {
  id: string;
  accountId: string;
  studyId: string;
  documentId: string;
  attachmentType: string;
  displayOrder: number;
  createdByUserId: string | null;
  createdAt: Date;
  document?: { id: string; filename: string; mimeType: string; url: string };
};

export type ImagingStudyCreateInput = z.infer<typeof imagingStudyCreateSchema>;
export type ImagingStudyUpdateInput = z.infer<typeof imagingStudyUpdateSchema>;

// ============================================
// IMAGING REPORTS
// ============================================

export const listImagingReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  orderId: z.string().uuid().optional(),
  studyId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  modalityId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending_review', 'finalized', 'signed', 'amended']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
});

export const imagingReportIdParamSchema = z.object({
  id: z.string().uuid()
});

export const imagingReportCreateSchema = z.object({
  orderId: z.string().uuid(),
  studyId: z.string().uuid().optional().nullable(),
  modalityId: z.string().uuid(),
  technique: z.string().optional().nullable(),
  findings: z.string().optional().nullable(),
  impression: z.string().optional().nullable(),
  conclusion: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  limitations: z.string().optional().nullable(),
  comparison: z.string().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const imagingReportUpdateSchema = imagingReportCreateSchema.partial().omit({ orderId: true });

export const imagingReportSignSchema = z.object({
  pin: z.string().min(4).optional()
});

export const imagingReportAmendSchema = z.object({
  reason: z.string().min(1)
});

export const imagingReportAttachDocumentSchema = z.object({
  documentId: z.string().uuid(),
  attachmentType: z.enum(['image', 'video', 'dicom', 'attachment', 'other']).default('attachment'),
  displayOrder: z.number().int().default(0)
});

export type ImagingReportRecord = {
  id: string;
  accountId: string;
  reportNumber: string;
  orderId: string;
  studyId: string | null;
  patientId: string;
  modalityId: string;
  status: string;
  technique: string | null;
  findings: string | null;
  impression: string | null;
  conclusion: string | null;
  recommendations: string | null;
  limitations: string | null;
  comparison: string | null;
  templateId: string | null;
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
  amendedFromReportId: string | null;
  createdAt: Date;
  updatedAt: Date;
  modality?: ImagingModalityRecord;
  order?: ImagingOrderRecord;
  study?: ImagingStudyRecord;
  documents?: ImagingReportDocumentRecord[];
};

export type ImagingReportDocumentRecord = {
  id: string;
  accountId: string;
  reportId: string;
  documentId: string;
  attachmentType: string;
  displayOrder: number;
  createdByUserId: string | null;
  createdAt: Date;
  document?: { id: string; filename: string; mimeType: string; url: string };
};

export type ImagingReportCreateInput = z.infer<typeof imagingReportCreateSchema>;
export type ImagingReportUpdateInput = z.infer<typeof imagingReportUpdateSchema>;

// ============================================
// IMAGING SCHEDULE
// ============================================

export const listImagingScheduleQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  modalityId: z.string().uuid().optional()
});

export const imagingScheduleSlotCreateSchema = z.object({
  modalityId: z.string().uuid().optional().nullable(),
  slotDate: z.string(),
  slotStartTime: z.string(),
  slotEndTime: z.string(),
  notes: z.string().optional().nullable()
});

export const imagingScheduleSlotUpdateSchema = imagingScheduleSlotCreateSchema.partial();

export type ImagingScheduleSlotRecord = {
  id: string;
  accountId: string;
  modalityId: string | null;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  isAvailable: boolean;
  orderId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  order?: ImagingOrderRecord;
  modality?: ImagingModalityRecord;
};

export type ImagingScheduleSlotCreateInput = z.infer<typeof imagingScheduleSlotCreateSchema>;
export type ImagingScheduleSlotUpdateInput = z.infer<typeof imagingScheduleSlotUpdateSchema>;
