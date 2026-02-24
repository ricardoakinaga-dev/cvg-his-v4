import type { DocumentCreateDto } from '@cvg-his/domain';
type DbClient = typeof import('@cvg-his/db').db;
export type DocumentRecord = {
    id: string;
    accountId: string;
    storageKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdByUserId: string;
    createdAt: Date;
};
export type EncounterDocumentRecord = {
    id: string;
    encounterId: string;
    documentId: string;
    attachedByUserId: string;
    createdAt: Date;
};
export type AttachToEncounterResult = {
    relation: EncounterDocumentRecord;
    alreadyAttached: boolean;
};
export type DocumentsRepo = {
    create: (input: {
        accountId: string;
        storageKey: string;
        createdByUserId: string;
        payload: DocumentCreateDto;
    }) => Promise<DocumentRecord>;
    findById: (accountId: string, documentId: string) => Promise<DocumentRecord | null>;
    encounterExistsInAccount: (accountId: string, encounterId: string) => Promise<boolean>;
    attachToEncounter: (input: {
        accountId: string;
        encounterId: string;
        documentId: string;
        attachedByUserId: string;
    }) => Promise<AttachToEncounterResult | null>;
};
export declare function createDocumentsRepo(db: DbClient): DocumentsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map