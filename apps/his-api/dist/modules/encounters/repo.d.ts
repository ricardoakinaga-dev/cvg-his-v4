type DbClient = typeof import('@cvg-his/db').db;
export type EncounterStatus = 'open' | 'closed';
export type EncounterRecord = {
    id: string;
    accountId: string;
    patientId: string;
    ownerId: string;
    status: EncounterStatus;
    openedByUserId: string;
    closedByUserId: string | null;
    openedAt: Date;
    closedAt: Date | null;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
};
export type EncounterPatientRef = {
    patientId: string;
    ownerId: string;
};
type CreateEncounterInput = {
    accountId: string;
    patientId: string;
    ownerId: string;
    openedByUserId: string;
    reason?: string;
};
type CloseEncounterInput = {
    accountId: string;
    encounterId: string;
    closedByUserId: string;
    reason?: string;
};
type ListEncountersInput = {
    accountId: string;
    patientId?: string;
    q?: string;
    page: number;
    pageSize: number;
};
export type ListEncountersResult = {
    data: EncounterRecord[];
    page: number;
    pageSize: number;
    total: number;
};
export type EncounterTimelineNote = {
    id: string;
    encounterId: string;
    type: string;
    status: string;
    versionNumber: number;
    signedAt: Date | null;
    signedByUserId: string | null;
    createdByUserId: string;
    updatedByUserId: string;
    createdAt: Date;
    updatedAt: Date;
    currentSoapJson: Record<string, unknown> | null;
};
export type EncounterTimelineVersion = {
    id: string;
    noteId: string;
    encounterId: string;
    versionNumber: number;
    soapJson: Record<string, unknown>;
    reason: string | null;
    createdByUserId: string;
    createdAt: Date;
};
export type EncounterTimelineDocument = {
    encounterDocumentId: string;
    encounterId: string;
    documentId: string;
    attachedByUserId: string;
    attachedAt: Date;
    storageKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdByUserId: string;
    createdAt: Date;
};
export type EncounterTimelineEvent = {
    kind: 'encounter.opened' | 'encounter.closed' | 'note.created' | 'note.signed' | 'note.version.created' | 'document.attached';
    entityId: string;
    happenedAt: Date;
    data: Record<string, unknown>;
};
export type EncounterTimelineResult = {
    encounter: EncounterRecord;
    notes: EncounterTimelineNote[];
    versions: EncounterTimelineVersion[];
    documents: EncounterTimelineDocument[];
    timeline: EncounterTimelineEvent[];
};
export type EncountersRepo = {
    findPatientInAccount: (accountId: string, patientId: string) => Promise<EncounterPatientRef | null>;
    create: (input: CreateEncounterInput) => Promise<EncounterRecord>;
    findById: (accountId: string, encounterId: string) => Promise<EncounterRecord | null>;
    closeById: (input: CloseEncounterInput) => Promise<EncounterRecord | null>;
    list: (input: ListEncountersInput) => Promise<ListEncountersResult>;
    getTimeline: (accountId: string, encounterId: string) => Promise<EncounterTimelineResult | null>;
};
export declare function createEncountersRepo(db: DbClient): EncountersRepo;
export {};
//# sourceMappingURL=repo.d.ts.map