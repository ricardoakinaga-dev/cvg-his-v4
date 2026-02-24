import { type AppendAuditInput } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type LabRepo } from './repo.js';
import type { LabTestCreateInput, LabTestUpdateInput, LabTestRecord, LabOrderCreateInput, LabOrderUpdateInput, LabOrderRecord, LabOrderItemRecord, LabSampleCreateInput, LabSampleRecord, LabResultCreateInput, LabResultUpdateInput, LabResultRecord, LabReportCreateInput, LabReportUpdateInput, LabReportRecord, LabReferenceRangeCreateInput, LabReferenceRangeUpdateInput, LabReferenceRangeRecord } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type LabContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type LabDependencies = {
    repo?: LabRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateLabTestResult = {
    kind: 'code_conflict';
} | {
    kind: 'created';
    test: LabTestRecord;
};
export type UpdateLabTestResult = {
    kind: 'test_not_found';
} | {
    kind: 'code_conflict';
} | {
    kind: 'updated';
    test: LabTestRecord;
};
export type DeleteLabTestResult = {
    kind: 'test_not_found';
} | {
    kind: 'deleted';
};
export declare function createLabTestsService(context: LabContext, deps?: LabDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        q?: string;
        categoryId?: string;
        specimenType?: string;
        active?: boolean;
    }): Promise<{
        items: LabTestRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(testId: string): Promise<LabTestRecord | null>;
    create(input: LabTestCreateInput): Promise<CreateLabTestResult>;
    update(testId: string, patch: LabTestUpdateInput): Promise<UpdateLabTestResult>;
    delete(testId: string): Promise<DeleteLabTestResult>;
};
export type CreateLabOrderResult = {
    kind: 'created';
    order: LabOrderRecord;
    items: LabOrderItemRecord[];
};
export type UpdateLabOrderResult = {
    kind: 'order_not_found';
} | {
    kind: 'updated';
    order: LabOrderRecord;
};
export type CancelLabOrderResult = {
    kind: 'order_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'cancelled';
    order: LabOrderRecord;
};
export declare function createLabOrdersService(context: LabContext, deps?: LabDependencies): {
    list(params: {
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
        page: number;
        pageSize: number;
    }>;
    getById(orderId: string): Promise<LabOrderRecord | null>;
    create(input: LabOrderCreateInput): Promise<CreateLabOrderResult>;
    update(orderId: string, patch: LabOrderUpdateInput): Promise<UpdateLabOrderResult>;
    cancel(orderId: string, reason: string): Promise<CancelLabOrderResult>;
};
export type CollectSampleResult = {
    kind: 'sample_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'collected';
    sample: LabSampleRecord;
};
export type ReceiveSampleResult = {
    kind: 'sample_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'received';
    sample: LabSampleRecord;
};
export type RejectSampleResult = {
    kind: 'sample_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'rejected';
    sample: LabSampleRecord;
};
export declare function createLabSamplesService(context: LabContext, deps?: LabDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        orderId?: string;
        patientId?: string;
        status?: string;
        sampleType?: string;
    }): Promise<{
        items: LabSampleRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(sampleId: string): Promise<LabSampleRecord | null>;
    create(input: LabSampleCreateInput & {
        patientId: string;
    }): Promise<LabSampleRecord>;
    collect(sampleId: string): Promise<CollectSampleResult>;
    receive(sampleId: string): Promise<ReceiveSampleResult>;
    reject(sampleId: string, reason: string): Promise<RejectSampleResult>;
};
export type CreateLabResultResult = {
    kind: 'created';
    result: LabResultRecord;
};
export type UpdateLabResultResult = {
    kind: 'result_not_found';
} | {
    kind: 'updated';
    result: LabResultRecord;
};
export type VerifyLabResultResult = {
    kind: 'result_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'verified';
    result: LabResultRecord;
};
export declare function createLabResultsService(context: LabContext, deps?: LabDependencies): {
    list(params: {
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
        page: number;
        pageSize: number;
    }>;
    getById(resultId: string): Promise<LabResultRecord | null>;
    create(input: LabResultCreateInput & {
        testId: string;
        patientId: string;
    }): Promise<CreateLabResultResult>;
    update(resultId: string, patch: LabResultUpdateInput): Promise<UpdateLabResultResult>;
    verify(resultId: string): Promise<VerifyLabResultResult>;
};
export type CreateLabReportResult = {
    kind: 'created';
    report: LabReportRecord;
};
export type UpdateLabReportResult = {
    kind: 'report_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'updated';
    report: LabReportRecord;
};
export type SignLabReportResult = {
    kind: 'report_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'signed';
    report: LabReportRecord;
};
export declare function createLabReportsService(context: LabContext, deps?: LabDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        orderId?: string;
        patientId?: string;
        status?: string;
    }): Promise<{
        items: LabReportRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(reportId: string): Promise<LabReportRecord | null>;
    create(input: LabReportCreateInput & {
        patientId: string;
    }): Promise<CreateLabReportResult>;
    update(reportId: string, patch: LabReportUpdateInput): Promise<UpdateLabReportResult>;
    finalize(reportId: string): Promise<UpdateLabReportResult>;
    sign(reportId: string, pin?: string): Promise<SignLabReportResult>;
};
export type CreateLabReferenceRangeResult = {
    kind: 'created';
    range: LabReferenceRangeRecord;
};
export type UpdateLabReferenceRangeResult = {
    kind: 'range_not_found';
} | {
    kind: 'updated';
    range: LabReferenceRangeRecord;
};
export type DeleteLabReferenceRangeResult = {
    kind: 'range_not_found';
} | {
    kind: 'deleted';
};
export declare function createLabReferenceRangesService(context: LabContext, deps?: LabDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        testId?: string;
        species?: string;
        active?: boolean;
    }): Promise<{
        items: LabReferenceRangeRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(rangeId: string): Promise<LabReferenceRangeRecord | null>;
    create(input: LabReferenceRangeCreateInput): Promise<CreateLabReferenceRangeResult>;
    update(rangeId: string, patch: LabReferenceRangeUpdateInput): Promise<UpdateLabReferenceRangeResult>;
    delete(rangeId: string): Promise<DeleteLabReferenceRangeResult>;
};
export {};
//# sourceMappingURL=service.d.ts.map