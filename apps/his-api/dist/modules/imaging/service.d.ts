import { type AppendAuditInput } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type ImagingRepo } from './repo.js';
import type { ImagingModalityCreateInput, ImagingModalityUpdateInput, ImagingModalityRecord, ImagingTemplateCreateInput, ImagingTemplateUpdateInput, ImagingTemplateRecord, ImagingOrderCreateInput, ImagingOrderUpdateInput, ImagingOrderRecord, ImagingStudyCreateInput, ImagingStudyUpdateInput, ImagingStudyRecord, ImagingStudyDocumentRecord, ImagingReportCreateInput, ImagingReportUpdateInput, ImagingReportRecord, ImagingReportDocumentRecord, ImagingScheduleSlotCreateInput, ImagingScheduleSlotUpdateInput, ImagingScheduleSlotRecord } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ImagingContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ImagingDependencies = {
    repo?: ImagingRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
export type CreateImagingModalityResult = {
    kind: 'code_conflict';
} | {
    kind: 'created';
    modality: ImagingModalityRecord;
};
export type UpdateImagingModalityResult = {
    kind: 'modality_not_found';
} | {
    kind: 'code_conflict';
} | {
    kind: 'updated';
    modality: ImagingModalityRecord;
};
export type DeleteImagingModalityResult = {
    kind: 'modality_not_found';
} | {
    kind: 'deleted';
};
export declare function createImagingModalitiesService(context: ImagingContext, deps?: ImagingDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        q?: string;
        category?: string;
        active?: boolean;
    }): Promise<{
        items: ImagingModalityRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(modalityId: string): Promise<ImagingModalityRecord | null>;
    create(input: ImagingModalityCreateInput): Promise<CreateImagingModalityResult>;
    update(modalityId: string, patch: ImagingModalityUpdateInput): Promise<UpdateImagingModalityResult>;
    delete(modalityId: string): Promise<DeleteImagingModalityResult>;
};
export type CreateImagingTemplateResult = {
    kind: 'created';
    template: ImagingTemplateRecord;
};
export type UpdateImagingTemplateResult = {
    kind: 'template_not_found';
} | {
    kind: 'updated';
    template: ImagingTemplateRecord;
};
export type DeleteImagingTemplateResult = {
    kind: 'template_not_found';
} | {
    kind: 'deleted';
};
export declare function createImagingTemplatesService(context: ImagingContext, deps?: ImagingDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        modalityId?: string;
        q?: string;
    }): Promise<{
        items: ImagingTemplateRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(templateId: string): Promise<ImagingTemplateRecord | null>;
    create(input: ImagingTemplateCreateInput): Promise<CreateImagingTemplateResult>;
    update(templateId: string, patch: ImagingTemplateUpdateInput): Promise<UpdateImagingTemplateResult>;
    delete(templateId: string): Promise<DeleteImagingTemplateResult>;
};
export type CreateImagingOrderResult = {
    kind: 'created';
    order: ImagingOrderRecord;
};
export type UpdateImagingOrderResult = {
    kind: 'order_not_found';
} | {
    kind: 'updated';
    order: ImagingOrderRecord;
};
export type ScheduleImagingOrderResult = {
    kind: 'order_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'scheduled';
    order: ImagingOrderRecord;
};
export type CancelImagingOrderResult = {
    kind: 'order_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'cancelled';
    order: ImagingOrderRecord;
};
export declare function createImagingOrdersService(context: ImagingContext, deps?: ImagingDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        patientId?: string;
        encounterId?: string;
        modalityId?: string;
        status?: string;
        priority?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<{
        items: ImagingOrderRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(orderId: string): Promise<ImagingOrderRecord | null>;
    create(input: ImagingOrderCreateInput): Promise<CreateImagingOrderResult>;
    update(orderId: string, patch: ImagingOrderUpdateInput): Promise<UpdateImagingOrderResult>;
    schedule(orderId: string, scheduledAt: Date): Promise<ScheduleImagingOrderResult>;
    start(orderId: string): Promise<ScheduleImagingOrderResult>;
    complete(orderId: string): Promise<ScheduleImagingOrderResult>;
    cancel(orderId: string, reason: string): Promise<CancelImagingOrderResult>;
};
export type CreateImagingStudyResult = {
    kind: 'order_not_found';
} | {
    kind: 'created';
    study: ImagingStudyRecord;
};
export type UpdateImagingStudyResult = {
    kind: 'study_not_found';
} | {
    kind: 'updated';
    study: ImagingStudyRecord;
};
export type AttachStudyDocumentResult = {
    kind: 'study_not_found';
} | {
    kind: 'attached';
    document: ImagingStudyDocumentRecord;
};
export declare function createImagingStudiesService(context: ImagingContext, deps?: ImagingDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        orderId?: string;
        patientId?: string;
        modalityId?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<{
        items: ImagingStudyRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(studyId: string): Promise<ImagingStudyRecord | null>;
    getByIdWithDocuments(studyId: string): Promise<ImagingStudyRecord | null>;
    create(input: ImagingStudyCreateInput): Promise<CreateImagingStudyResult>;
    update(studyId: string, patch: ImagingStudyUpdateInput): Promise<UpdateImagingStudyResult>;
    complete(studyId: string): Promise<UpdateImagingStudyResult>;
    attachDocument(studyId: string, documentId: string, attachmentType: string, displayOrder: number): Promise<AttachStudyDocumentResult>;
    detachDocument(studyId: string, documentId: string): Promise<void>;
};
export type CreateImagingReportResult = {
    kind: 'order_not_found';
} | {
    kind: 'created';
    report: ImagingReportRecord;
};
export type UpdateImagingReportResult = {
    kind: 'report_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'updated';
    report: ImagingReportRecord;
};
export type FinalizeImagingReportResult = {
    kind: 'report_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'finalized';
    report: ImagingReportRecord;
};
export type SignImagingReportResult = {
    kind: 'report_not_found';
} | {
    kind: 'invalid_status';
} | {
    kind: 'signed';
    report: ImagingReportRecord;
};
export type AttachReportDocumentResult = {
    kind: 'report_not_found';
} | {
    kind: 'attached';
    document: ImagingReportDocumentRecord;
};
export declare function createImagingReportsService(context: ImagingContext, deps?: ImagingDependencies): {
    list(params: {
        page: number;
        pageSize: number;
        orderId?: string;
        studyId?: string;
        patientId?: string;
        modalityId?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<{
        items: ImagingReportRecord[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(reportId: string): Promise<ImagingReportRecord | null>;
    getByIdWithDocuments(reportId: string): Promise<ImagingReportRecord | null>;
    create(input: ImagingReportCreateInput): Promise<CreateImagingReportResult>;
    update(reportId: string, patch: ImagingReportUpdateInput): Promise<UpdateImagingReportResult>;
    finalize(reportId: string): Promise<FinalizeImagingReportResult>;
    sign(reportId: string, _pin?: string): Promise<SignImagingReportResult>;
    attachDocument(reportId: string, documentId: string, attachmentType: string, displayOrder: number): Promise<AttachReportDocumentResult>;
    detachDocument(reportId: string, documentId: string): Promise<void>;
};
export type CreateImagingScheduleSlotResult = {
    kind: 'created';
    slot: ImagingScheduleSlotRecord;
};
export type UpdateImagingScheduleSlotResult = {
    kind: 'slot_not_found';
} | {
    kind: 'updated';
    slot: ImagingScheduleSlotRecord;
};
export type BookImagingScheduleSlotResult = {
    kind: 'slot_not_found';
} | {
    kind: 'slot_not_available';
} | {
    kind: 'booked';
    slot: ImagingScheduleSlotRecord;
};
export declare function createImagingScheduleService(context: ImagingContext, deps?: ImagingDependencies): {
    list(params: {
        fromDate?: string;
        toDate?: string;
        modalityId?: string;
    }): Promise<ImagingScheduleSlotRecord[]>;
    getById(slotId: string): Promise<ImagingScheduleSlotRecord | null>;
    create(input: ImagingScheduleSlotCreateInput): Promise<CreateImagingScheduleSlotResult>;
    update(slotId: string, patch: ImagingScheduleSlotUpdateInput): Promise<UpdateImagingScheduleSlotResult>;
    book(slotId: string, orderId: string): Promise<BookImagingScheduleSlotResult>;
    release(slotId: string): Promise<UpdateImagingScheduleSlotResult>;
    delete(slotId: string): Promise<{
        kind: "slot_not_found";
    } | {
        kind: "deleted";
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map