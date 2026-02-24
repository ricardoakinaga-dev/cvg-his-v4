import type { SoapDto } from '@cvg-his/domain';
type DbClient = typeof import('@cvg-his/db').db;
export type ClinicalNoteStatus = 'draft' | 'signed';
export type ClinicalNoteType = 'SOAP';
export type ClinicalNoteRecord = {
    id: string;
    encounterId: string;
    type: ClinicalNoteType;
    status: ClinicalNoteStatus;
    versionNumber: number;
    signedAt: Date | null;
    signedByUserId: string | null;
    createdByUserId: string;
    updatedByUserId: string;
    createdAt: Date;
    updatedAt: Date;
    soap: SoapDto | null;
};
export type ClinicalNotesRepo = {
    findEncounterInAccount: (accountId: string, encounterId: string) => Promise<boolean>;
    createDraft: (input: {
        accountId: string;
        encounterId: string;
        soap: SoapDto;
        reason?: string;
        userId: string;
    }) => Promise<ClinicalNoteRecord>;
    findById: (accountId: string, noteId: string) => Promise<ClinicalNoteRecord | null>;
    updateDraft: (input: {
        accountId: string;
        noteId: string;
        soap: SoapDto;
        reason: string;
        userId: string;
    }) => Promise<ClinicalNoteRecord | null>;
    signDraftById: (input: {
        accountId: string;
        noteId: string;
        signedByUserId: string;
    }) => Promise<ClinicalNoteRecord | null>;
};
export declare function createClinicalNotesRepo(db: DbClient): ClinicalNotesRepo;
export {};
//# sourceMappingURL=repo.d.ts.map