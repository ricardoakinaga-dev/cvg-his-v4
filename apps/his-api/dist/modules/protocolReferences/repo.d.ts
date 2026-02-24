export type ProtocolReferenceType = 'qdrant_chunk' | 'url' | 'pdf' | 'doi' | 'book';
export type ProtocolReferenceRecord = {
    id: string;
    accountId: string;
    protocolId: string;
    refType: ProtocolReferenceType;
    title: string | null;
    url: string | null;
    sourceId: string | null;
    score: number | null;
    metadataJson: Record<string, unknown> | null;
    createdByUserId: string;
    createdAt: Date;
};
type DbClient = typeof import('@cvg-his/db').db;
type CreateReferenceInput = {
    accountId: string;
    protocolId: string;
    refType: ProtocolReferenceType;
    title?: string;
    url?: string;
    sourceId?: string;
    score?: number;
    metadataJson?: Record<string, unknown>;
    createdByUserId: string;
};
export type ProtocolReferencesRepo = {
    protocolExistsInAccount: (accountId: string, protocolId: string) => Promise<boolean>;
    listByProtocol: (accountId: string, protocolId: string) => Promise<ProtocolReferenceRecord[]>;
    create: (input: CreateReferenceInput) => Promise<ProtocolReferenceRecord>;
    findById: (accountId: string, protocolId: string, refId: string) => Promise<ProtocolReferenceRecord | null>;
    deleteById: (accountId: string, protocolId: string, refId: string) => Promise<ProtocolReferenceRecord | null>;
};
export declare function createProtocolReferencesRepo(db: DbClient): ProtocolReferencesRepo;
export {};
//# sourceMappingURL=repo.d.ts.map