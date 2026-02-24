import { db } from '@cvg-his/db';
import type { ImagingModalityRecord, ImagingModalityCreateInput, ImagingModalityUpdateInput, ImagingTemplateRecord, ImagingTemplateCreateInput, ImagingTemplateUpdateInput, ImagingOrderRecord, ImagingOrderCreateInput, ImagingOrderUpdateInput, ImagingStudyRecord, ImagingStudyCreateInput, ImagingStudyUpdateInput, ImagingStudyDocumentRecord, ImagingReportRecord, ImagingReportCreateInput, ImagingReportUpdateInput, ImagingReportDocumentRecord, ImagingScheduleSlotRecord, ImagingScheduleSlotCreateInput, ImagingScheduleSlotUpdateInput } from './types.js';
type DbClient = typeof db;
export declare function createImagingModalitiesRepo(db: DbClient): {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        q?: string;
        category?: string;
        active?: boolean;
    }): Promise<{
        items: ImagingModalityRecord[];
        total: number;
    }>;
    findById(accountId: string, modalityId: string): Promise<ImagingModalityRecord | null>;
    findByCode(accountId: string, code: string): Promise<ImagingModalityRecord | null>;
    create(input: ImagingModalityCreateInput & {
        accountId: string;
    }): Promise<ImagingModalityRecord>;
    update(params: {
        accountId: string;
        modalityId: string;
        patch: ImagingModalityUpdateInput;
    }): Promise<ImagingModalityRecord | null>;
    delete(accountId: string, modalityId: string): Promise<void>;
};
export declare function createImagingTemplatesRepo(db: DbClient): {
    list(params: {
        accountId: string;
        page: number;
        pageSize: number;
        modalityId?: string;
        q?: string;
    }): Promise<{
        items: ImagingTemplateRecord[];
        total: number;
    }>;
    findById(accountId: string, templateId: string): Promise<ImagingTemplateRecord | null>;
    create(input: ImagingTemplateCreateInput & {
        accountId: string;
    }): Promise<ImagingTemplateRecord>;
    update(params: {
        accountId: string;
        templateId: string;
        patch: ImagingTemplateUpdateInput;
    }): Promise<ImagingTemplateRecord | null>;
    delete(accountId: string, templateId: string): Promise<void>;
};
export declare function createImagingOrdersRepo(db: DbClient): {
    list(params: {
        accountId: string;
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
    }>;
    findById(accountId: string, orderId: string): Promise<ImagingOrderRecord | null>;
    create(params: {
        accountId: string;
        orderNumber: string;
        input: ImagingOrderCreateInput;
        createdByUserId: string;
    }): Promise<ImagingOrderRecord>;
    update(params: {
        accountId: string;
        orderId: string;
        patch: ImagingOrderUpdateInput;
    }): Promise<ImagingOrderRecord | null>;
    updateStatus(params: {
        accountId: string;
        orderId: string;
        status: string;
        scheduledAt?: Date | null;
        performedAt?: Date | null;
        completedAt?: Date | null;
        cancelledAt?: Date | null;
        cancelledReason?: string | null;
    }): Promise<ImagingOrderRecord | null>;
};
export declare function createImagingStudiesRepo(db: DbClient): {
    list(params: {
        accountId: string;
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
    }>;
    findById(accountId: string, studyId: string): Promise<ImagingStudyRecord | null>;
    findByIdWithDocuments(accountId: string, studyId: string): Promise<ImagingStudyRecord | null>;
    create(params: {
        accountId: string;
        studyNumber: string;
        input: ImagingStudyCreateInput;
        patientId: string;
        modalityId: string;
        performedByUserId?: string;
    }): Promise<ImagingStudyRecord>;
    update(params: {
        accountId: string;
        studyId: string;
        patch: ImagingStudyUpdateInput;
    }): Promise<ImagingStudyRecord | null>;
    updateStatus(params: {
        accountId: string;
        studyId: string;
        status: string;
    }): Promise<ImagingStudyRecord | null>;
    attachDocument(params: {
        accountId: string;
        studyId: string;
        documentId: string;
        attachmentType: string;
        displayOrder: number;
        createdByUserId?: string;
    }): Promise<ImagingStudyDocumentRecord>;
    detachDocument(accountId: string, studyId: string, documentId: string): Promise<void>;
};
export declare function createImagingReportsRepo(db: DbClient): {
    list(params: {
        accountId: string;
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
    }>;
    findById(accountId: string, reportId: string): Promise<ImagingReportRecord | null>;
    findByIdWithDocuments(accountId: string, reportId: string): Promise<ImagingReportRecord | null>;
    create(params: {
        accountId: string;
        reportNumber: string;
        input: ImagingReportCreateInput;
        patientId: string;
        draftedByUserId: string;
    }): Promise<ImagingReportRecord>;
    update(params: {
        accountId: string;
        reportId: string;
        patch: ImagingReportUpdateInput;
    }): Promise<ImagingReportRecord | null>;
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
    }): Promise<ImagingReportRecord | null>;
    attachDocument(params: {
        accountId: string;
        reportId: string;
        documentId: string;
        attachmentType: string;
        displayOrder: number;
        createdByUserId?: string;
    }): Promise<ImagingReportDocumentRecord>;
    detachDocument(accountId: string, reportId: string, documentId: string): Promise<void>;
};
export declare function createImagingScheduleRepo(db: DbClient): {
    list(params: {
        accountId: string;
        fromDate?: string;
        toDate?: string;
        modalityId?: string;
    }): Promise<ImagingScheduleSlotRecord[]>;
    findById(accountId: string, slotId: string): Promise<ImagingScheduleSlotRecord | null>;
    create(params: {
        accountId: string;
        input: ImagingScheduleSlotCreateInput;
    }): Promise<ImagingScheduleSlotRecord>;
    update(params: {
        accountId: string;
        slotId: string;
        patch: ImagingScheduleSlotUpdateInput;
    }): Promise<ImagingScheduleSlotRecord | null>;
    bookSlot(params: {
        accountId: string;
        slotId: string;
        orderId: string;
    }): Promise<ImagingScheduleSlotRecord | null>;
    releaseSlot(accountId: string, slotId: string): Promise<ImagingScheduleSlotRecord | null>;
    delete(accountId: string, slotId: string): Promise<void>;
};
export type ImagingRepo = {
    modalities: ReturnType<typeof createImagingModalitiesRepo>;
    templates: ReturnType<typeof createImagingTemplatesRepo>;
    orders: ReturnType<typeof createImagingOrdersRepo>;
    studies: ReturnType<typeof createImagingStudiesRepo>;
    reports: ReturnType<typeof createImagingReportsRepo>;
    schedule: ReturnType<typeof createImagingScheduleRepo>;
};
export declare function createImagingRepo(db: DbClient): ImagingRepo;
export {};
//# sourceMappingURL=repo.d.ts.map