type DbClient = typeof import('@cvg-his/db').db;
export type ProtocolVersionStatus = 'draft' | 'publishing' | 'published' | 'failed';
export type ProtocolVersionPublishRecord = {
    id: string;
    accountId: string;
    protocolId: string;
    versionNumber: number;
    status: ProtocolVersionStatus;
    contentJson: Record<string, unknown>;
    changeReason: string | null;
    publishedAt: Date | null;
    publishedByUserId: string | null;
    buildError: string | null;
    createdByUserId: string;
    updatedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
type MarkPublishingInput = {
    accountId: string;
    versionId: string;
    updatedByUserId: string;
};
type MarkFailedInput = {
    accountId: string;
    versionId: string;
    updatedByUserId: string;
    buildError: string;
};
export type ProtocolPublishRepo = {
    findVersionById: (accountId: string, versionId: string) => Promise<ProtocolVersionPublishRecord | null>;
    markPublishing: (input: MarkPublishingInput) => Promise<ProtocolVersionPublishRecord | null>;
    markFailed: (input: MarkFailedInput) => Promise<ProtocolVersionPublishRecord | null>;
};
export declare function createProtocolPublishRepo(db: DbClient): ProtocolPublishRepo;
export {};
//# sourceMappingURL=repo.d.ts.map