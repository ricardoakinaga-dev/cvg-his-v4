import type { ProtocolContentDto } from '@cvg-his/domain';
type DbClient = typeof import('@cvg-his/db').db;
export type ProtocolVersionStatus = 'draft' | 'publishing' | 'published' | 'failed';
export type ProtocolVersionRecord = {
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
type CreateDraftVersionInput = {
    accountId: string;
    protocolId: string;
    createdByUserId: string;
};
type UpdateDraftVersionInput = {
    accountId: string;
    versionId: string;
    contentJson: ProtocolContentDto;
    changeReason?: string;
    updatedByUserId: string;
};
type ListProtocolVersionsInput = {
    accountId: string;
    protocolId: string;
    page: number;
    pageSize: number;
};
type ProtocolRef = {
    id: string;
    title: string;
};
export type ProtocolVersionsRepo = {
    findProtocolInAccount: (accountId: string, protocolId: string) => Promise<ProtocolRef | null>;
    createDraftVersion: (input: CreateDraftVersionInput) => Promise<ProtocolVersionRecord | null>;
    listByProtocol: (input: ListProtocolVersionsInput) => Promise<{
        data: ProtocolVersionRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    findById: (accountId: string, versionId: string) => Promise<ProtocolVersionRecord | null>;
    updateDraftById: (input: UpdateDraftVersionInput) => Promise<ProtocolVersionRecord | null>;
};
export declare function createProtocolVersionsRepo(db: DbClient): ProtocolVersionsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map