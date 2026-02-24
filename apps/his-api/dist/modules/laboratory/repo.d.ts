import { db } from '@cvg-his/db';
import type { LabTestRecord, LabOrderRecord, LabOrderItemRecord, LabSampleRecord, LabResultRecord, LabReportRecord, LabReferenceRangeRecord, LabTestCreateInput, LabTestUpdateInput, LabOrderCreateInput, LabOrderUpdateInput, LabSampleCreateInput, LabResultCreateInput, LabResultUpdateInput, LabReportCreateInput, LabReportUpdateInput, LabReferenceRangeCreateInput, LabReferenceRangeUpdateInput } from './types.js';
type DbClient = typeof db;
export declare function createLabTestsRepo(db: DbClient): {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        q?: string;
        categoryId?: string;
        specimenType?: string;
        active?: boolean;
    }): Promise<{
        items: LabTestRecord[];
        total: number;
    }>;
    findById(accountId: string, testId: string): Promise<LabTestRecord | null>;
    findByCode(accountId: string, code: string): Promise<LabTestRecord | null>;
    create(input: LabTestCreateInput & {
        accountId: string;
    }): Promise<LabTestRecord>;
    update(params: {
        accountId: string;
        testId: string;
        patch: LabTestUpdateInput;
    }): Promise<LabTestRecord | null>;
    delete(accountId: string, testId: string): Promise<void>;
};
export declare function createLabOrdersRepo(db: DbClient): {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        patientId?: string;
        encounterId?: string;
        status?: string;
        priority?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<{
        items: LabOrderRecord[];
        total: number;
    }>;
    findById(accountId: string, orderId: string): Promise<LabOrderRecord | null>;
    findByOrderNumber(accountId: string, orderNumber: string): Promise<LabOrderRecord | null>;
    create(params: {
        accountId: string;
        orderNumber: string;
        input: LabOrderCreateInput;
        createdByUserId?: string;
    }): Promise<LabOrderRecord>;
    update(params: {
        accountId: string;
        orderId: string;
        patch: LabOrderUpdateInput;
    }): Promise<LabOrderRecord | null>;
    updateStatus(params: {
        accountId: string;
        orderId: string;
        status: string;
        collectedAt?: Date;
        completedAt?: Date;
        cancelledAt?: Date;
        cancelledReason?: string;
    }): Promise<LabOrderRecord | null>;
    delete(accountId: string, orderId: string): Promise<void>;
};
export declare function createLabOrderItemsRepo(db: DbClient): {
    findByOrderId(orderId: string): Promise<LabOrderItemRecord[]>;
    create(params: {
        accountId: string;
        orderId: string;
        testId: string;
        panelId?: string;
    }): Promise<LabOrderItemRecord>;
    createBatch(params: {
        accountId: string;
        orderId: string;
        testIds: string[];
        panelIds?: string[];
    }): Promise<LabOrderItemRecord[]>;
    updateStatus(params: {
        orderId: string;
        orderItemId: string;
        status: string;
    }): Promise<LabOrderItemRecord | null>;
    deleteByOrderId(orderId: string): Promise<void>;
};
export declare function createLabSamplesRepo(db: DbClient): {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        orderId?: string;
        patientId?: string;
        status?: string;
        sampleType?: string;
    }): Promise<{
        items: LabSampleRecord[];
        total: number;
    }>;
    findById(accountId: string, sampleId: string): Promise<LabSampleRecord | null>;
    create(params: {
        accountId: string;
        sampleNumber: string;
        input: LabSampleCreateInput;
        patientId: string;
    }): Promise<LabSampleRecord>;
    updateStatus(params: {
        accountId: string;
        sampleId: string;
        status: string;
        collectedAt?: Date;
        collectedByUserId?: string;
        receivedAt?: Date;
        receivedByUserId?: string;
        processedAt?: Date;
        rejectedAt?: Date;
        rejectionReason?: string;
    }): Promise<LabSampleRecord | null>;
};
export declare function createLabResultsRepo(db: DbClient): {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        orderItemId?: string;
        orderId?: string;
        patientId?: string;
        status?: string;
        flag?: string;
    }): Promise<{
        items: LabResultRecord[];
        total: number;
    }>;
    findById(accountId: string, resultId: string): Promise<LabResultRecord | null>;
    create(params: {
        accountId: string;
        input: LabResultCreateInput;
        testId: string;
        patientId: string;
    }): Promise<LabResultRecord>;
    update(params: {
        accountId: string;
        resultId: string;
        patch: LabResultUpdateInput;
    }): Promise<LabResultRecord | null>;
    updateStatus(params: {
        accountId: string;
        resultId: string;
        status: string;
        performedAt?: Date;
        performedByUserId?: string;
        verifiedAt?: Date;
        verifiedByUserId?: string;
    }): Promise<LabResultRecord | null>;
};
export declare function createLabReportsRepo(db: DbClient): {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        orderId?: string;
        patientId?: string;
        status?: string;
    }): Promise<{
        items: LabReportRecord[];
        total: number;
    }>;
    findById(accountId: string, reportId: string): Promise<LabReportRecord | null>;
    create(params: {
        accountId: string;
        reportNumber: string;
        input: LabReportCreateInput;
        patientId: string;
        draftedByUserId?: string;
    }): Promise<LabReportRecord>;
    update(params: {
        accountId: string;
        reportId: string;
        patch: LabReportUpdateInput;
    }): Promise<LabReportRecord | null>;
    updateStatus(params: {
        accountId: string;
        reportId: string;
        status: string;
        reviewedAt?: Date;
        reviewedByUserId?: string;
        finalizedAt?: Date;
        finalizedByUserId?: string;
        signedAt?: Date;
        signedByUserId?: string;
        signatureHash?: string;
        amendedAt?: Date;
        amendedReason?: string;
    }): Promise<LabReportRecord | null>;
    addResults(reportId: string, resultIds: string[]): Promise<void>;
    getReportResults(reportId: string): Promise<LabResultRecord[]>;
};
export declare function createLabReferenceRangesRepo(db: DbClient): {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        testId?: string;
        species?: string;
        active?: boolean;
    }): Promise<{
        items: LabReferenceRangeRecord[];
        total: number;
    }>;
    findById(accountId: string, rangeId: string): Promise<LabReferenceRangeRecord | null>;
    findApplicable(params: {
        testId: string;
        species?: string;
        gender?: string;
        ageInDays?: number;
    }): Promise<LabReferenceRangeRecord | null>;
    create(params: {
        accountId: string;
        input: LabReferenceRangeCreateInput;
    }): Promise<LabReferenceRangeRecord>;
    update(params: {
        accountId: string;
        rangeId: string;
        patch: LabReferenceRangeUpdateInput;
    }): Promise<LabReferenceRangeRecord | null>;
    delete(accountId: string, rangeId: string): Promise<void>;
};
export type LabRepo = {
    tests: ReturnType<typeof createLabTestsRepo>;
    orders: ReturnType<typeof createLabOrdersRepo>;
    orderItems: ReturnType<typeof createLabOrderItemsRepo>;
    samples: ReturnType<typeof createLabSamplesRepo>;
    results: ReturnType<typeof createLabResultsRepo>;
    reports: ReturnType<typeof createLabReportsRepo>;
    referenceRanges: ReturnType<typeof createLabReferenceRangesRepo>;
};
export declare function createLabRepo(db: DbClient): LabRepo;
export {};
//# sourceMappingURL=repo.d.ts.map