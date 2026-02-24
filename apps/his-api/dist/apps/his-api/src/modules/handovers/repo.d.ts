import type { ShiftPeriod } from '@cvg-his/domain';
type DbClient = typeof import('@cvg-his/db').db;
export type HandoverStatus = 'draft' | 'published';
export type HandoverBuildStatus = 'pending' | 'building' | 'ready' | 'failed';
export type HandoverRecord = {
    id: string;
    accountId: string;
    wardId: string;
    status: HandoverStatus;
    shiftDate: string;
    shiftPeriod: ShiftPeriod;
    publishedAt: Date | null;
    publishedByUserId: string | null;
    buildStatus: HandoverBuildStatus;
    buildError: string | null;
    documentId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
export type HandoverItemRecord = {
    id: string;
    accountId: string;
    handoverId: string;
    stayId: string;
    patientSnapshotJson: Record<string, unknown>;
    problemsJson: unknown[];
    planJson: unknown[];
    criticalMedsJson: unknown[];
    alertsJson: Record<string, unknown>;
    pendingJson: unknown[];
    escalationJson: Record<string, unknown>;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
};
export type HandoverWithItems = {
    handover: HandoverRecord;
    items: HandoverItemRecord[];
};
export type HandoverDocumentRecord = {
    id: string;
    accountId: string;
    storageKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdByUserId: string;
    createdAt: Date;
};
export type InpatientStayReference = {
    stayId: string;
    wardId: string;
    patientId: string;
    ownerId: string;
    patientName: string;
    species: string;
};
type DraftItemInsert = {
    stayId: string;
    patientSnapshotJson: Record<string, unknown>;
    problemsJson: unknown[];
    planJson: unknown[];
    criticalMedsJson: unknown[];
    alertsJson: Record<string, unknown>;
    pendingJson: unknown[];
    escalationJson: Record<string, unknown>;
    notes?: string;
};
type CreateDraftInput = {
    accountId: string;
    wardId: string;
    shiftDate: string;
    shiftPeriod: ShiftPeriod;
    items: DraftItemInsert[];
};
type PublishInput = {
    accountId: string;
    handoverId: string;
    publishedByUserId: string;
};
type MarkBuildFailedInput = {
    accountId: string;
    handoverId: string;
    buildError: string;
};
type MarkBuildPendingForRetryInput = {
    accountId: string;
    handoverId: string;
};
export type HandoversRepo = {
    wardExistsInAccount: (accountId: string, wardId: string) => Promise<boolean>;
    findStaysByIds: (accountId: string, stayIds: string[]) => Promise<InpatientStayReference[]>;
    createDraft: (input: CreateDraftInput) => Promise<HandoverWithItems>;
    findById: (accountId: string, handoverId: string) => Promise<HandoverWithItems | null>;
    publish: (input: PublishInput) => Promise<HandoverRecord | null>;
    markBuildPendingForRetry: (input: MarkBuildPendingForRetryInput) => Promise<HandoverRecord | null>;
    markBuildFailed: (input: MarkBuildFailedInput) => Promise<HandoverRecord | null>;
    findLatestPublished: (accountId: string, wardId: string) => Promise<HandoverWithItems | null>;
    findDocumentByHandoverId: (accountId: string, handoverId: string) => Promise<HandoverDocumentRecord | null>;
};
export declare function createHandoversRepo(db: DbClient): HandoversRepo;
export {};
//# sourceMappingURL=repo.d.ts.map