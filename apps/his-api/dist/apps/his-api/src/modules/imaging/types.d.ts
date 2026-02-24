import { z } from 'zod';
export declare const listImagingModalitiesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    q: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    active?: boolean | undefined;
    q?: string | undefined;
    category?: string | undefined;
}, {
    active?: boolean | undefined;
    q?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    category?: string | undefined;
}>;
export declare const imagingModalityIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const imagingModalityCreateSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    category: z.ZodDefault<z.ZodEnum<["radiology", "ultrasound", "ct", "mri", "nuclear", "other"]>>;
    description: z.ZodOptional<z.ZodString>;
    preparationInstructions: z.ZodOptional<z.ZodString>;
    contrastRequired: z.ZodDefault<z.ZodBoolean>;
    contrastType: z.ZodOptional<z.ZodString>;
    estimatedDurationMinutes: z.ZodDefault<z.ZodNumber>;
    equipmentType: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    isActive: boolean;
    category: "radiology" | "ultrasound" | "ct" | "mri" | "nuclear" | "other";
    contrastRequired: boolean;
    estimatedDurationMinutes: number;
    description?: string | undefined;
    preparationInstructions?: string | undefined;
    contrastType?: string | undefined;
    equipmentType?: string | undefined;
}, {
    code: string;
    name: string;
    isActive?: boolean | undefined;
    description?: string | undefined;
    category?: "radiology" | "ultrasound" | "ct" | "mri" | "nuclear" | "other" | undefined;
    preparationInstructions?: string | undefined;
    contrastRequired?: boolean | undefined;
    contrastType?: string | undefined;
    estimatedDurationMinutes?: number | undefined;
    equipmentType?: string | undefined;
}>;
export declare const imagingModalityUpdateSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodDefault<z.ZodEnum<["radiology", "ultrasound", "ct", "mri", "nuclear", "other"]>>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    preparationInstructions: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    contrastRequired: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    contrastType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    estimatedDurationMinutes: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    equipmentType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
    description?: string | undefined;
    category?: "radiology" | "ultrasound" | "ct" | "mri" | "nuclear" | "other" | undefined;
    preparationInstructions?: string | undefined;
    contrastRequired?: boolean | undefined;
    contrastType?: string | undefined;
    estimatedDurationMinutes?: number | undefined;
    equipmentType?: string | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
    description?: string | undefined;
    category?: "radiology" | "ultrasound" | "ct" | "mri" | "nuclear" | "other" | undefined;
    preparationInstructions?: string | undefined;
    contrastRequired?: boolean | undefined;
    contrastType?: string | undefined;
    estimatedDurationMinutes?: number | undefined;
    equipmentType?: string | undefined;
}>;
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
export declare const listImagingTemplatesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    modalityId: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    q?: string | undefined;
    modalityId?: string | undefined;
}, {
    q?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    modalityId?: string | undefined;
}>;
export declare const imagingTemplateIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const imagingTemplateCreateSchema: z.ZodObject<{
    modalityId: z.ZodString;
    name: z.ZodString;
    templateContent: z.ZodString;
    isDefault: z.ZodDefault<z.ZodBoolean>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    modalityId: string;
    templateContent: string;
    isDefault: boolean;
}, {
    name: string;
    modalityId: string;
    templateContent: string;
    isActive?: boolean | undefined;
    isDefault?: boolean | undefined;
}>;
export declare const imagingTemplateUpdateSchema: z.ZodObject<{
    modalityId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    templateContent: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    modalityId?: string | undefined;
    templateContent?: string | undefined;
    isDefault?: boolean | undefined;
}, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    modalityId?: string | undefined;
    templateContent?: string | undefined;
    isDefault?: boolean | undefined;
}>;
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
export declare const listImagingOrdersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    patientId: z.ZodOptional<z.ZodString>;
    encounterId: z.ZodOptional<z.ZodString>;
    modalityId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "scheduled", "in_progress", "completed", "cancelled"]>>;
    priority: z.ZodOptional<z.ZodEnum<["stat", "asap", "routine", "timed"]>>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "pending" | "scheduled" | "cancelled" | "in_progress" | "completed" | undefined;
    encounterId?: string | undefined;
    patientId?: string | undefined;
    modalityId?: string | undefined;
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    status?: "pending" | "scheduled" | "cancelled" | "in_progress" | "completed" | undefined;
    encounterId?: string | undefined;
    patientId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    modalityId?: string | undefined;
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>;
export declare const imagingOrderIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const imagingOrderCreateSchema: z.ZodObject<{
    patientId: z.ZodString;
    encounterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    modalityId: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["stat", "asap", "routine", "timed"]>>;
    clinicalIndication: z.ZodString;
    clinicalHistory: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    suspectedDiagnosis: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bodyRegion: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    laterality: z.ZodNullable<z.ZodOptional<z.ZodEnum<["left", "right", "bilateral", "not_applicable"]>>>;
    contrastRequested: z.ZodDefault<z.ZodBoolean>;
    contrastType: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sedationRequired: z.ZodDefault<z.ZodBoolean>;
    specialInstructions: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    modalityId: string;
    priority: "stat" | "asap" | "routine" | "timed";
    clinicalIndication: string;
    contrastRequested: boolean;
    sedationRequired: boolean;
    encounterId?: string | null | undefined;
    contrastType?: string | null | undefined;
    clinicalHistory?: string | null | undefined;
    suspectedDiagnosis?: string | null | undefined;
    bodyRegion?: string | null | undefined;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null | undefined;
    specialInstructions?: string | null | undefined;
}, {
    patientId: string;
    modalityId: string;
    clinicalIndication: string;
    encounterId?: string | null | undefined;
    contrastType?: string | null | undefined;
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    clinicalHistory?: string | null | undefined;
    suspectedDiagnosis?: string | null | undefined;
    bodyRegion?: string | null | undefined;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null | undefined;
    contrastRequested?: boolean | undefined;
    sedationRequired?: boolean | undefined;
    specialInstructions?: string | null | undefined;
}>;
export declare const imagingOrderUpdateSchema: z.ZodObject<{
    priority: z.ZodOptional<z.ZodEnum<["stat", "asap", "routine", "timed"]>>;
    clinicalIndication: z.ZodOptional<z.ZodString>;
    clinicalHistory: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    suspectedDiagnosis: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bodyRegion: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    laterality: z.ZodNullable<z.ZodOptional<z.ZodEnum<["left", "right", "bilateral", "not_applicable"]>>>;
    contrastRequested: z.ZodOptional<z.ZodBoolean>;
    contrastType: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sedationRequired: z.ZodOptional<z.ZodBoolean>;
    specialInstructions: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    contrastType?: string | null | undefined;
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    clinicalIndication?: string | undefined;
    clinicalHistory?: string | null | undefined;
    suspectedDiagnosis?: string | null | undefined;
    bodyRegion?: string | null | undefined;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null | undefined;
    contrastRequested?: boolean | undefined;
    sedationRequired?: boolean | undefined;
    specialInstructions?: string | null | undefined;
}, {
    contrastType?: string | null | undefined;
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    clinicalIndication?: string | undefined;
    clinicalHistory?: string | null | undefined;
    suspectedDiagnosis?: string | null | undefined;
    bodyRegion?: string | null | undefined;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null | undefined;
    contrastRequested?: boolean | undefined;
    sedationRequired?: boolean | undefined;
    specialInstructions?: string | null | undefined;
}>;
export declare const imagingOrderScheduleSchema: z.ZodObject<{
    scheduledAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    scheduledAt: string;
}, {
    scheduledAt: string;
}>;
export declare const imagingOrderCancelSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
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
    patient?: {
        id: string;
        name: string;
        species: string;
    };
};
export type ImagingOrderCreateInput = z.infer<typeof imagingOrderCreateSchema>;
export type ImagingOrderUpdateInput = z.infer<typeof imagingOrderUpdateSchema>;
export declare const listImagingStudiesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    orderId: z.ZodOptional<z.ZodString>;
    patientId: z.ZodOptional<z.ZodString>;
    modalityId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "pending" | "cancelled" | "in_progress" | "completed" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    modalityId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    status?: "pending" | "cancelled" | "in_progress" | "completed" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    modalityId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>;
export declare const imagingStudyIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const imagingStudyCreateSchema: z.ZodObject<{
    orderId: z.ZodString;
    studyDatetime: z.ZodOptional<z.ZodString>;
    bodyRegion: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    laterality: z.ZodNullable<z.ZodOptional<z.ZodEnum<["left", "right", "bilateral", "not_applicable"]>>>;
    contrastAdministered: z.ZodDefault<z.ZodBoolean>;
    contrastType: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contrastVolumeMl: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sedationAdministered: z.ZodDefault<z.ZodBoolean>;
    sedationDetails: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    equipmentUsed: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    acquisitionParameters: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    numberOfImages: z.ZodDefault<z.ZodNumber>;
    studyNotes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    technicianUserId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    contrastAdministered: boolean;
    sedationAdministered: boolean;
    numberOfImages: number;
    contrastType?: string | null | undefined;
    bodyRegion?: string | null | undefined;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null | undefined;
    studyDatetime?: string | undefined;
    contrastVolumeMl?: number | null | undefined;
    sedationDetails?: string | null | undefined;
    equipmentUsed?: string | null | undefined;
    acquisitionParameters?: Record<string, unknown> | null | undefined;
    studyNotes?: string | null | undefined;
    technicianUserId?: string | null | undefined;
}, {
    orderId: string;
    contrastType?: string | null | undefined;
    bodyRegion?: string | null | undefined;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null | undefined;
    studyDatetime?: string | undefined;
    contrastAdministered?: boolean | undefined;
    contrastVolumeMl?: number | null | undefined;
    sedationAdministered?: boolean | undefined;
    sedationDetails?: string | null | undefined;
    equipmentUsed?: string | null | undefined;
    acquisitionParameters?: Record<string, unknown> | null | undefined;
    numberOfImages?: number | undefined;
    studyNotes?: string | null | undefined;
    technicianUserId?: string | null | undefined;
}>;
export declare const imagingStudyUpdateSchema: z.ZodObject<Omit<{
    orderId: z.ZodOptional<z.ZodString>;
    studyDatetime: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    bodyRegion: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    laterality: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEnum<["left", "right", "bilateral", "not_applicable"]>>>>;
    contrastAdministered: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    contrastType: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    contrastVolumeMl: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    sedationAdministered: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    sedationDetails: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    equipmentUsed: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    acquisitionParameters: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    numberOfImages: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    studyNotes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    technicianUserId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "orderId">, "strip", z.ZodTypeAny, {
    contrastType?: string | null | undefined;
    bodyRegion?: string | null | undefined;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null | undefined;
    studyDatetime?: string | undefined;
    contrastAdministered?: boolean | undefined;
    contrastVolumeMl?: number | null | undefined;
    sedationAdministered?: boolean | undefined;
    sedationDetails?: string | null | undefined;
    equipmentUsed?: string | null | undefined;
    acquisitionParameters?: Record<string, unknown> | null | undefined;
    numberOfImages?: number | undefined;
    studyNotes?: string | null | undefined;
    technicianUserId?: string | null | undefined;
}, {
    contrastType?: string | null | undefined;
    bodyRegion?: string | null | undefined;
    laterality?: "left" | "right" | "bilateral" | "not_applicable" | null | undefined;
    studyDatetime?: string | undefined;
    contrastAdministered?: boolean | undefined;
    contrastVolumeMl?: number | null | undefined;
    sedationAdministered?: boolean | undefined;
    sedationDetails?: string | null | undefined;
    equipmentUsed?: string | null | undefined;
    acquisitionParameters?: Record<string, unknown> | null | undefined;
    numberOfImages?: number | undefined;
    studyNotes?: string | null | undefined;
    technicianUserId?: string | null | undefined;
}>;
export declare const imagingStudyAttachDocumentSchema: z.ZodObject<{
    documentId: z.ZodString;
    attachmentType: z.ZodDefault<z.ZodEnum<["image", "video", "dicom", "report", "other"]>>;
    displayOrder: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    attachmentType: "report" | "other" | "image" | "video" | "dicom";
    displayOrder: number;
}, {
    documentId: string;
    attachmentType?: "report" | "other" | "image" | "video" | "dicom" | undefined;
    displayOrder?: number | undefined;
}>;
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
    document?: {
        id: string;
        filename: string;
        mimeType: string;
        url: string;
    };
};
export type ImagingStudyCreateInput = z.infer<typeof imagingStudyCreateSchema>;
export type ImagingStudyUpdateInput = z.infer<typeof imagingStudyUpdateSchema>;
export declare const listImagingReportsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    orderId: z.ZodOptional<z.ZodString>;
    studyId: z.ZodOptional<z.ZodString>;
    patientId: z.ZodOptional<z.ZodString>;
    modalityId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "pending_review", "finalized", "signed", "amended"]>>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "draft" | "signed" | "pending_review" | "finalized" | "amended" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    modalityId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    studyId?: string | undefined;
}, {
    status?: "draft" | "signed" | "pending_review" | "finalized" | "amended" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    modalityId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    studyId?: string | undefined;
}>;
export declare const imagingReportIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const imagingReportCreateSchema: z.ZodObject<{
    orderId: z.ZodString;
    studyId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    modalityId: z.ZodString;
    technique: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    findings: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    impression: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    conclusion: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    recommendations: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    limitations: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    comparison: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    templateId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    modalityId: string;
    notes?: string | null | undefined;
    studyId?: string | null | undefined;
    technique?: string | null | undefined;
    findings?: string | null | undefined;
    impression?: string | null | undefined;
    conclusion?: string | null | undefined;
    recommendations?: string | null | undefined;
    limitations?: string | null | undefined;
    comparison?: string | null | undefined;
    templateId?: string | null | undefined;
}, {
    orderId: string;
    modalityId: string;
    notes?: string | null | undefined;
    studyId?: string | null | undefined;
    technique?: string | null | undefined;
    findings?: string | null | undefined;
    impression?: string | null | undefined;
    conclusion?: string | null | undefined;
    recommendations?: string | null | undefined;
    limitations?: string | null | undefined;
    comparison?: string | null | undefined;
    templateId?: string | null | undefined;
}>;
export declare const imagingReportUpdateSchema: z.ZodObject<Omit<{
    orderId: z.ZodOptional<z.ZodString>;
    studyId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    modalityId: z.ZodOptional<z.ZodString>;
    technique: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    findings: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    impression: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    conclusion: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    recommendations: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    limitations: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    comparison: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    templateId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "orderId">, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
    modalityId?: string | undefined;
    studyId?: string | null | undefined;
    technique?: string | null | undefined;
    findings?: string | null | undefined;
    impression?: string | null | undefined;
    conclusion?: string | null | undefined;
    recommendations?: string | null | undefined;
    limitations?: string | null | undefined;
    comparison?: string | null | undefined;
    templateId?: string | null | undefined;
}, {
    notes?: string | null | undefined;
    modalityId?: string | undefined;
    studyId?: string | null | undefined;
    technique?: string | null | undefined;
    findings?: string | null | undefined;
    impression?: string | null | undefined;
    conclusion?: string | null | undefined;
    recommendations?: string | null | undefined;
    limitations?: string | null | undefined;
    comparison?: string | null | undefined;
    templateId?: string | null | undefined;
}>;
export declare const imagingReportSignSchema: z.ZodObject<{
    pin: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pin?: string | undefined;
}, {
    pin?: string | undefined;
}>;
export declare const imagingReportAmendSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const imagingReportAttachDocumentSchema: z.ZodObject<{
    documentId: z.ZodString;
    attachmentType: z.ZodDefault<z.ZodEnum<["image", "video", "dicom", "attachment", "other"]>>;
    displayOrder: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    attachmentType: "other" | "image" | "video" | "dicom" | "attachment";
    displayOrder: number;
}, {
    documentId: string;
    attachmentType?: "other" | "image" | "video" | "dicom" | "attachment" | undefined;
    displayOrder?: number | undefined;
}>;
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
    document?: {
        id: string;
        filename: string;
        mimeType: string;
        url: string;
    };
};
export type ImagingReportCreateInput = z.infer<typeof imagingReportCreateSchema>;
export type ImagingReportUpdateInput = z.infer<typeof imagingReportUpdateSchema>;
export declare const listImagingScheduleQuerySchema: z.ZodObject<{
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    modalityId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    modalityId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    modalityId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>;
export declare const imagingScheduleSlotCreateSchema: z.ZodObject<{
    modalityId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slotDate: z.ZodString;
    slotStartTime: z.ZodString;
    slotEndTime: z.ZodString;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    slotDate: string;
    slotStartTime: string;
    slotEndTime: string;
    notes?: string | null | undefined;
    modalityId?: string | null | undefined;
}, {
    slotDate: string;
    slotStartTime: string;
    slotEndTime: string;
    notes?: string | null | undefined;
    modalityId?: string | null | undefined;
}>;
export declare const imagingScheduleSlotUpdateSchema: z.ZodObject<{
    modalityId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    slotDate: z.ZodOptional<z.ZodString>;
    slotStartTime: z.ZodOptional<z.ZodString>;
    slotEndTime: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
    modalityId?: string | null | undefined;
    slotDate?: string | undefined;
    slotStartTime?: string | undefined;
    slotEndTime?: string | undefined;
}, {
    notes?: string | null | undefined;
    modalityId?: string | null | undefined;
    slotDate?: string | undefined;
    slotStartTime?: string | undefined;
    slotEndTime?: string | undefined;
}>;
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
//# sourceMappingURL=types.d.ts.map