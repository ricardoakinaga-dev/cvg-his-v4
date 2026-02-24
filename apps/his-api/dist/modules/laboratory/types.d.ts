import { z } from 'zod';
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
export declare const SPECIMEN_TYPES: readonly ["blood", "urine", "feces", "tissue", "swab", "fluid", "biopsy", "other"];
export declare const labTestIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listLabTestsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    q: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    specimenType: z.ZodOptional<z.ZodEnum<["blood", "urine", "feces", "tissue", "swab", "fluid", "biopsy", "other"]>>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    active?: boolean | undefined;
    q?: string | undefined;
    categoryId?: string | undefined;
    specimenType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
}, {
    active?: boolean | undefined;
    q?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    categoryId?: string | undefined;
    specimenType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
}>;
export declare const labTestCreateSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    method: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    specimenType: z.ZodDefault<z.ZodEnum<["blood", "urine", "feces", "tissue", "swab", "fluid", "biopsy", "other"]>>;
    specimenVolume: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    specimenInstructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    turnaroundHours: z.ZodDefault<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    requiresFasting: z.ZodDefault<z.ZodBoolean>;
    specialInstructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    isActive: boolean;
    specimenType: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy";
    turnaroundHours: number;
    requiresFasting: boolean;
    method?: string | null | undefined;
    description?: string | null | undefined;
    specialInstructions?: string | null | undefined;
    categoryId?: string | null | undefined;
    specimenVolume?: string | null | undefined;
    specimenInstructions?: string | null | undefined;
}, {
    code: string;
    name: string;
    isActive?: boolean | undefined;
    method?: string | null | undefined;
    description?: string | null | undefined;
    specialInstructions?: string | null | undefined;
    categoryId?: string | null | undefined;
    specimenType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
    specimenVolume?: string | null | undefined;
    specimenInstructions?: string | null | undefined;
    turnaroundHours?: number | undefined;
    requiresFasting?: boolean | undefined;
}>;
export declare const labTestUpdateSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    method: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    specimenType: z.ZodOptional<z.ZodEnum<["blood", "urine", "feces", "tissue", "swab", "fluid", "biopsy", "other"]>>;
    specimenVolume: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    specimenInstructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    turnaroundHours: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    requiresFasting: z.ZodOptional<z.ZodBoolean>;
    specialInstructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
    method?: string | null | undefined;
    description?: string | null | undefined;
    specialInstructions?: string | null | undefined;
    categoryId?: string | null | undefined;
    specimenType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
    specimenVolume?: string | null | undefined;
    specimenInstructions?: string | null | undefined;
    turnaroundHours?: number | undefined;
    requiresFasting?: boolean | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
    method?: string | null | undefined;
    description?: string | null | undefined;
    specialInstructions?: string | null | undefined;
    categoryId?: string | null | undefined;
    specimenType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
    specimenVolume?: string | null | undefined;
    specimenInstructions?: string | null | undefined;
    turnaroundHours?: number | undefined;
    requiresFasting?: boolean | undefined;
}>;
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
export declare const LAB_ORDER_STATUSES: readonly ["pending", "partial", "collected", "processing", "partial_result", "completed", "cancelled"];
export declare const LAB_ORDER_PRIORITIES: readonly ["stat", "asap", "routine", "timed"];
export declare const labOrderIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listLabOrdersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    patientId: z.ZodOptional<z.ZodString>;
    encounterId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "partial", "collected", "processing", "partial_result", "completed", "cancelled"]>>;
    priority: z.ZodOptional<z.ZodEnum<["stat", "asap", "routine", "timed"]>>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "partial" | "pending" | "cancelled" | "completed" | "collected" | "processing" | "partial_result" | undefined;
    encounterId?: string | undefined;
    patientId?: string | undefined;
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    status?: "partial" | "pending" | "cancelled" | "completed" | "collected" | "processing" | "partial_result" | undefined;
    encounterId?: string | undefined;
    patientId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>;
export declare const labOrderCreateSchema: z.ZodObject<{
    patientId: z.ZodString;
    encounterId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priority: z.ZodDefault<z.ZodEnum<["stat", "asap", "routine", "timed"]>>;
    clinicalNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    diagnosis: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fastingStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    testIds: z.ZodArray<z.ZodString, "many">;
    panelIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    priority: "stat" | "asap" | "routine" | "timed";
    testIds: string[];
    encounterId?: string | null | undefined;
    clinicalNotes?: string | null | undefined;
    diagnosis?: string | null | undefined;
    fastingStatus?: string | null | undefined;
    panelIds?: string[] | undefined;
}, {
    patientId: string;
    testIds: string[];
    encounterId?: string | null | undefined;
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    clinicalNotes?: string | null | undefined;
    diagnosis?: string | null | undefined;
    fastingStatus?: string | null | undefined;
    panelIds?: string[] | undefined;
}>;
export declare const labOrderUpdateSchema: z.ZodObject<{
    priority: z.ZodOptional<z.ZodEnum<["stat", "asap", "routine", "timed"]>>;
    clinicalNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    diagnosis: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fastingStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    clinicalNotes?: string | null | undefined;
    diagnosis?: string | null | undefined;
    fastingStatus?: string | null | undefined;
}, {
    priority?: "stat" | "asap" | "routine" | "timed" | undefined;
    clinicalNotes?: string | null | undefined;
    diagnosis?: string | null | undefined;
    fastingStatus?: string | null | undefined;
}>;
export declare const labOrderCancelSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
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
export declare const LAB_SAMPLE_STATUSES: readonly ["pending", "collected", "received", "processing", "rejected", "discarded"];
export declare const LAB_SAMPLE_TYPES: readonly ["blood", "urine", "feces", "tissue", "swab", "fluid", "biopsy", "other"];
export declare const labSampleIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listLabSamplesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    orderId: z.ZodOptional<z.ZodString>;
    patientId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "collected", "received", "processing", "rejected", "discarded"]>>;
    sampleType: z.ZodOptional<z.ZodEnum<["blood", "urine", "feces", "tissue", "swab", "fluid", "biopsy", "other"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "received" | "pending" | "collected" | "processing" | "rejected" | "discarded" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    sampleType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
}, {
    status?: "received" | "pending" | "collected" | "processing" | "rejected" | "discarded" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sampleType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
}>;
export declare const labSampleCreateSchema: z.ZodObject<{
    orderId: z.ZodString;
    orderItemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sampleType: z.ZodDefault<z.ZodEnum<["blood", "urine", "feces", "tissue", "swab", "fluid", "biopsy", "other"]>>;
    specimenSource: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    volumeCollected: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    collectionMethod: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    sampleType: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy";
    notes?: string | null | undefined;
    orderItemId?: string | null | undefined;
    specimenSource?: string | null | undefined;
    volumeCollected?: string | null | undefined;
    collectionMethod?: string | null | undefined;
}, {
    orderId: string;
    notes?: string | null | undefined;
    sampleType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
    orderItemId?: string | null | undefined;
    specimenSource?: string | null | undefined;
    volumeCollected?: string | null | undefined;
    collectionMethod?: string | null | undefined;
}>;
export declare const labSampleCollectSchema: z.ZodObject<{
    sampleType: z.ZodOptional<z.ZodEnum<["blood", "urine", "feces", "tissue", "swab", "fluid", "biopsy", "other"]>>;
    specimenSource: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    volumeCollected: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    collectionMethod: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
    sampleType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
    specimenSource?: string | null | undefined;
    volumeCollected?: string | null | undefined;
    collectionMethod?: string | null | undefined;
}, {
    notes?: string | null | undefined;
    sampleType?: "other" | "blood" | "urine" | "feces" | "tissue" | "swab" | "fluid" | "biopsy" | undefined;
    specimenSource?: string | null | undefined;
    volumeCollected?: string | null | undefined;
    collectionMethod?: string | null | undefined;
}>;
export declare const labSampleReceiveSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
}, {
    notes?: string | null | undefined;
}>;
export declare const labSampleRejectSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
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
export declare const LAB_RESULT_STATUSES: readonly ["pending", "preliminary", "final", "corrected", "cancelled"];
export declare const LAB_RESULT_FLAGS: readonly ["low", "high", "critical_low", "critical_high", "abnormal", "normal"];
export declare const labResultIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listLabResultsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    orderItemId: z.ZodOptional<z.ZodString>;
    orderId: z.ZodOptional<z.ZodString>;
    patientId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "preliminary", "final", "corrected", "cancelled"]>>;
    flag: z.ZodOptional<z.ZodEnum<["low", "high", "critical_low", "critical_high", "abnormal", "normal"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "pending" | "cancelled" | "preliminary" | "final" | "corrected" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    orderItemId?: string | undefined;
    flag?: "low" | "high" | "critical_low" | "critical_high" | "abnormal" | "normal" | undefined;
}, {
    status?: "pending" | "cancelled" | "preliminary" | "final" | "corrected" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    orderItemId?: string | undefined;
    flag?: "low" | "high" | "critical_low" | "critical_high" | "abnormal" | "normal" | undefined;
}>;
export declare const labResultCreateSchema: z.ZodObject<{
    orderItemId: z.ZodString;
    sampleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    testId: z.ZodString;
    patientId: z.ZodString;
    resultValue: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    resultNumeric: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    referenceRange: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    referenceRangeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    flag: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "high", "critical_low", "critical_high", "abnormal", "normal"]>>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    interpretation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    orderItemId: string;
    testId: string;
    notes?: string | null | undefined;
    flag?: "low" | "high" | "critical_low" | "critical_high" | "abnormal" | "normal" | null | undefined;
    sampleId?: string | null | undefined;
    resultValue?: string | null | undefined;
    resultNumeric?: number | null | undefined;
    unit?: string | null | undefined;
    referenceRange?: string | null | undefined;
    referenceRangeId?: string | null | undefined;
    interpretation?: string | null | undefined;
}, {
    patientId: string;
    orderItemId: string;
    testId: string;
    notes?: string | null | undefined;
    flag?: "low" | "high" | "critical_low" | "critical_high" | "abnormal" | "normal" | null | undefined;
    sampleId?: string | null | undefined;
    resultValue?: string | null | undefined;
    resultNumeric?: number | null | undefined;
    unit?: string | null | undefined;
    referenceRange?: string | null | undefined;
    referenceRangeId?: string | null | undefined;
    interpretation?: string | null | undefined;
}>;
export declare const labResultUpdateSchema: z.ZodObject<{
    resultValue: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    resultNumeric: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    referenceRange: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    referenceRangeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    flag: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "high", "critical_low", "critical_high", "abnormal", "normal"]>>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    interpretation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
    flag?: "low" | "high" | "critical_low" | "critical_high" | "abnormal" | "normal" | null | undefined;
    resultValue?: string | null | undefined;
    resultNumeric?: number | null | undefined;
    unit?: string | null | undefined;
    referenceRange?: string | null | undefined;
    referenceRangeId?: string | null | undefined;
    interpretation?: string | null | undefined;
}, {
    notes?: string | null | undefined;
    flag?: "low" | "high" | "critical_low" | "critical_high" | "abnormal" | "normal" | null | undefined;
    resultValue?: string | null | undefined;
    resultNumeric?: number | null | undefined;
    unit?: string | null | undefined;
    referenceRange?: string | null | undefined;
    referenceRangeId?: string | null | undefined;
    interpretation?: string | null | undefined;
}>;
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
export declare const LAB_REPORT_STATUSES: readonly ["draft", "pending_review", "finalized", "signed", "amended"];
export declare const labReportIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listLabReportsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    orderId: z.ZodOptional<z.ZodString>;
    patientId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "pending_review", "finalized", "signed", "amended"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "draft" | "signed" | "pending_review" | "finalized" | "amended" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
}, {
    status?: "draft" | "signed" | "pending_review" | "finalized" | "amended" | undefined;
    patientId?: string | undefined;
    orderId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const labReportCreateSchema: z.ZodObject<{
    orderId: z.ZodString;
    conclusion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    methodology: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    limitations: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    resultIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    orderId: string;
    notes?: string | null | undefined;
    conclusion?: string | null | undefined;
    limitations?: string | null | undefined;
    methodology?: string | null | undefined;
    resultIds?: string[] | undefined;
}, {
    orderId: string;
    notes?: string | null | undefined;
    conclusion?: string | null | undefined;
    limitations?: string | null | undefined;
    methodology?: string | null | undefined;
    resultIds?: string[] | undefined;
}>;
export declare const labReportUpdateSchema: z.ZodObject<{
    conclusion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    methodology: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    limitations: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    resultIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    notes?: string | null | undefined;
    conclusion?: string | null | undefined;
    limitations?: string | null | undefined;
    methodology?: string | null | undefined;
    resultIds?: string[] | undefined;
}, {
    notes?: string | null | undefined;
    conclusion?: string | null | undefined;
    limitations?: string | null | undefined;
    methodology?: string | null | undefined;
    resultIds?: string[] | undefined;
}>;
export declare const labReportSignSchema: z.ZodObject<{
    pin: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pin?: string | undefined;
}, {
    pin?: string | undefined;
}>;
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
export declare const GENDERS: readonly ["male", "female", "both"];
export declare const labReferenceRangeIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listLabReferenceRangesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    testId: z.ZodOptional<z.ZodString>;
    species: z.ZodOptional<z.ZodString>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    active?: boolean | undefined;
    species?: string | undefined;
    testId?: string | undefined;
}, {
    active?: boolean | undefined;
    species?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    testId?: string | undefined;
}>;
export declare const labReferenceRangeCreateSchema: z.ZodObject<{
    testId: z.ZodString;
    species: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gender: z.ZodOptional<z.ZodNullable<z.ZodEnum<["male", "female", "both"]>>>;
    ageMinDays: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    ageMaxDays: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lowValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    highValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lowCritical: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    highCritical: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    interpretationNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    testId: string;
    species?: string | null | undefined;
    unit?: string | null | undefined;
    gender?: "both" | "male" | "female" | null | undefined;
    ageMinDays?: number | null | undefined;
    ageMaxDays?: number | null | undefined;
    lowValue?: number | null | undefined;
    highValue?: number | null | undefined;
    lowCritical?: number | null | undefined;
    highCritical?: number | null | undefined;
    interpretationNotes?: string | null | undefined;
}, {
    testId: string;
    isActive?: boolean | undefined;
    species?: string | null | undefined;
    unit?: string | null | undefined;
    gender?: "both" | "male" | "female" | null | undefined;
    ageMinDays?: number | null | undefined;
    ageMaxDays?: number | null | undefined;
    lowValue?: number | null | undefined;
    highValue?: number | null | undefined;
    lowCritical?: number | null | undefined;
    highCritical?: number | null | undefined;
    interpretationNotes?: string | null | undefined;
}>;
export declare const labReferenceRangeUpdateSchema: z.ZodObject<{
    species: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gender: z.ZodOptional<z.ZodNullable<z.ZodEnum<["male", "female", "both"]>>>;
    ageMinDays: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    ageMaxDays: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lowValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    highValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lowCritical: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    highCritical: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    interpretationNotes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    species?: string | null | undefined;
    unit?: string | null | undefined;
    gender?: "both" | "male" | "female" | null | undefined;
    ageMinDays?: number | null | undefined;
    ageMaxDays?: number | null | undefined;
    lowValue?: number | null | undefined;
    highValue?: number | null | undefined;
    lowCritical?: number | null | undefined;
    highCritical?: number | null | undefined;
    interpretationNotes?: string | null | undefined;
}, {
    isActive?: boolean | undefined;
    species?: string | null | undefined;
    unit?: string | null | undefined;
    gender?: "both" | "male" | "female" | null | undefined;
    ageMinDays?: number | null | undefined;
    ageMaxDays?: number | null | undefined;
    lowValue?: number | null | undefined;
    highValue?: number | null | undefined;
    lowCritical?: number | null | undefined;
    highCritical?: number | null | undefined;
    interpretationNotes?: string | null | undefined;
}>;
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
//# sourceMappingURL=types.d.ts.map