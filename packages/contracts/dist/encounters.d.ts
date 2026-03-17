import { z } from 'zod';
/**
 * ==========================================
 * ENCOUNTER STATUS
 * ==========================================
 */
export declare const encounterStatusSchema: z.ZodEnum<["open", "closed"]>;
/**
 * ==========================================
 * REQUEST SCHEMAS
 * ==========================================
 */
/**
 * POST /encounters - Create encounter request body
 */
export declare const createEncounterBodySchema: z.ZodObject<{
    patientId: z.ZodString;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    reason?: string | undefined;
}, {
    patientId: string;
    reason?: unknown;
}>;
/**
 * POST /encounters/:id/close - Close encounter request body
 */
export declare const closeEncounterBodySchema: z.ZodObject<{
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: unknown;
}>;
/**
 * GET /encounters/:id - Get encounter by ID params
 */
export declare const encounterIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/**
 * GET /encounters - List encounters query
 */
export declare const listEncountersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    patientId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    patientId?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    patientId?: string | undefined;
}>;
/**
 * ==========================================
 * RESPONSE SCHEMAS
 * ==========================================
 */
/**
 * Encounter response schema (single encounter)
 */
export declare const encounterResponseSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    patientId: z.ZodString;
    ownerId: z.ZodString;
    status: z.ZodEnum<["open", "closed"]>;
    openedByUserId: z.ZodString;
    closedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    openedAt: z.ZodDate;
    closedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    status: "open" | "closed";
    id: string;
    patientId: string;
    accountId: string;
    ownerId: string;
    openedByUserId: string;
    openedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    reason?: string | null | undefined;
    closedByUserId?: string | null | undefined;
    closedAt?: Date | null | undefined;
}, {
    status: "open" | "closed";
    id: string;
    patientId: string;
    accountId: string;
    ownerId: string;
    openedByUserId: string;
    openedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    reason?: string | null | undefined;
    closedByUserId?: string | null | undefined;
    closedAt?: Date | null | undefined;
}>;
/**
 * Paginated encounters response
 */
export declare const listEncountersResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        accountId: z.ZodString;
        patientId: z.ZodString;
        ownerId: z.ZodString;
        status: z.ZodEnum<["open", "closed"]>;
        openedByUserId: z.ZodString;
        closedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        openedAt: z.ZodDate;
        closedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        status: "open" | "closed";
        id: string;
        patientId: string;
        accountId: string;
        ownerId: string;
        openedByUserId: string;
        openedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        reason?: string | null | undefined;
        closedByUserId?: string | null | undefined;
        closedAt?: Date | null | undefined;
    }, {
        status: "open" | "closed";
        id: string;
        patientId: string;
        accountId: string;
        ownerId: string;
        openedByUserId: string;
        openedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        reason?: string | null | undefined;
        closedByUserId?: string | null | undefined;
        closedAt?: Date | null | undefined;
    }>, "many">;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    data: {
        status: "open" | "closed";
        id: string;
        patientId: string;
        accountId: string;
        ownerId: string;
        openedByUserId: string;
        openedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        reason?: string | null | undefined;
        closedByUserId?: string | null | undefined;
        closedAt?: Date | null | undefined;
    }[];
    total: number;
}, {
    page: number;
    pageSize: number;
    data: {
        status: "open" | "closed";
        id: string;
        patientId: string;
        accountId: string;
        ownerId: string;
        openedByUserId: string;
        openedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        reason?: string | null | undefined;
        closedByUserId?: string | null | undefined;
        closedAt?: Date | null | undefined;
    }[];
    total: number;
}>;
/**
 * Timeline note schema
 */
export declare const encounterTimelineNoteSchema: z.ZodObject<{
    id: z.ZodString;
    encounterId: z.ZodString;
    type: z.ZodString;
    status: z.ZodString;
    versionNumber: z.ZodNumber;
    signedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    signedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdByUserId: z.ZodString;
    updatedByUserId: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    currentSoapJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    encounterId: string;
    versionNumber: number;
    createdByUserId: string;
    updatedByUserId: string;
    signedAt?: Date | null | undefined;
    signedByUserId?: string | null | undefined;
    currentSoapJson?: Record<string, unknown> | null | undefined;
}, {
    type: string;
    status: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    encounterId: string;
    versionNumber: number;
    createdByUserId: string;
    updatedByUserId: string;
    signedAt?: Date | null | undefined;
    signedByUserId?: string | null | undefined;
    currentSoapJson?: Record<string, unknown> | null | undefined;
}>;
/**
 * Timeline version schema
 */
export declare const encounterTimelineVersionSchema: z.ZodObject<{
    id: z.ZodString;
    noteId: z.ZodString;
    encounterId: z.ZodString;
    versionNumber: z.ZodNumber;
    soapJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdByUserId: z.ZodString;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    encounterId: string;
    versionNumber: number;
    createdByUserId: string;
    noteId: string;
    soapJson: Record<string, unknown>;
    reason?: string | null | undefined;
}, {
    id: string;
    createdAt: Date;
    encounterId: string;
    versionNumber: number;
    createdByUserId: string;
    noteId: string;
    soapJson: Record<string, unknown>;
    reason?: string | null | undefined;
}>;
/**
 * Timeline document schema
 */
export declare const encounterTimelineDocumentSchema: z.ZodObject<{
    encounterDocumentId: z.ZodString;
    encounterId: z.ZodString;
    documentId: z.ZodString;
    attachedByUserId: z.ZodString;
    attachedAt: z.ZodDate;
    storageKey: z.ZodString;
    filename: z.ZodString;
    mimeType: z.ZodString;
    sizeBytes: z.ZodNumber;
    createdByUserId: z.ZodString;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    encounterId: string;
    createdByUserId: string;
    encounterDocumentId: string;
    documentId: string;
    attachedByUserId: string;
    attachedAt: Date;
    storageKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
}, {
    createdAt: Date;
    encounterId: string;
    createdByUserId: string;
    encounterDocumentId: string;
    documentId: string;
    attachedByUserId: string;
    attachedAt: Date;
    storageKey: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
}>;
/**
 * Timeline event schema
 */
export declare const encounterTimelineEventSchema: z.ZodObject<{
    kind: z.ZodEnum<["encounter.opened", "encounter.closed", "note.created", "note.signed", "note.version.created", "document.attached"]>;
    entityId: z.ZodString;
    happenedAt: z.ZodDate;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    data: Record<string, unknown>;
    kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
    entityId: string;
    happenedAt: Date;
}, {
    data: Record<string, unknown>;
    kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
    entityId: string;
    happenedAt: Date;
}>;
/**
 * Encounter timeline response
 */
export declare const encounterTimelineResponseSchema: z.ZodObject<{
    encounter: z.ZodObject<{
        id: z.ZodString;
        accountId: z.ZodString;
        patientId: z.ZodString;
        ownerId: z.ZodString;
        status: z.ZodEnum<["open", "closed"]>;
        openedByUserId: z.ZodString;
        closedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        openedAt: z.ZodDate;
        closedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        status: "open" | "closed";
        id: string;
        patientId: string;
        accountId: string;
        ownerId: string;
        openedByUserId: string;
        openedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        reason?: string | null | undefined;
        closedByUserId?: string | null | undefined;
        closedAt?: Date | null | undefined;
    }, {
        status: "open" | "closed";
        id: string;
        patientId: string;
        accountId: string;
        ownerId: string;
        openedByUserId: string;
        openedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        reason?: string | null | undefined;
        closedByUserId?: string | null | undefined;
        closedAt?: Date | null | undefined;
    }>;
    notes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        encounterId: z.ZodString;
        type: z.ZodString;
        status: z.ZodString;
        versionNumber: z.ZodNumber;
        signedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
        signedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdByUserId: z.ZodString;
        updatedByUserId: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        currentSoapJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        versionNumber: number;
        createdByUserId: string;
        updatedByUserId: string;
        signedAt?: Date | null | undefined;
        signedByUserId?: string | null | undefined;
        currentSoapJson?: Record<string, unknown> | null | undefined;
    }, {
        type: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        versionNumber: number;
        createdByUserId: string;
        updatedByUserId: string;
        signedAt?: Date | null | undefined;
        signedByUserId?: string | null | undefined;
        currentSoapJson?: Record<string, unknown> | null | undefined;
    }>, "many">;
    versions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        noteId: z.ZodString;
        encounterId: z.ZodString;
        versionNumber: z.ZodNumber;
        soapJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdByUserId: z.ZodString;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: Date;
        encounterId: string;
        versionNumber: number;
        createdByUserId: string;
        noteId: string;
        soapJson: Record<string, unknown>;
        reason?: string | null | undefined;
    }, {
        id: string;
        createdAt: Date;
        encounterId: string;
        versionNumber: number;
        createdByUserId: string;
        noteId: string;
        soapJson: Record<string, unknown>;
        reason?: string | null | undefined;
    }>, "many">;
    documents: z.ZodArray<z.ZodObject<{
        encounterDocumentId: z.ZodString;
        encounterId: z.ZodString;
        documentId: z.ZodString;
        attachedByUserId: z.ZodString;
        attachedAt: z.ZodDate;
        storageKey: z.ZodString;
        filename: z.ZodString;
        mimeType: z.ZodString;
        sizeBytes: z.ZodNumber;
        createdByUserId: z.ZodString;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        createdAt: Date;
        encounterId: string;
        createdByUserId: string;
        encounterDocumentId: string;
        documentId: string;
        attachedByUserId: string;
        attachedAt: Date;
        storageKey: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
    }, {
        createdAt: Date;
        encounterId: string;
        createdByUserId: string;
        encounterDocumentId: string;
        documentId: string;
        attachedByUserId: string;
        attachedAt: Date;
        storageKey: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
    }>, "many">;
    timeline: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<["encounter.opened", "encounter.closed", "note.created", "note.signed", "note.version.created", "document.attached"]>;
        entityId: z.ZodString;
        happenedAt: z.ZodDate;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        data: Record<string, unknown>;
        kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
        entityId: string;
        happenedAt: Date;
    }, {
        data: Record<string, unknown>;
        kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
        entityId: string;
        happenedAt: Date;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    encounter: {
        status: "open" | "closed";
        id: string;
        patientId: string;
        accountId: string;
        ownerId: string;
        openedByUserId: string;
        openedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        reason?: string | null | undefined;
        closedByUserId?: string | null | undefined;
        closedAt?: Date | null | undefined;
    };
    notes: {
        type: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        versionNumber: number;
        createdByUserId: string;
        updatedByUserId: string;
        signedAt?: Date | null | undefined;
        signedByUserId?: string | null | undefined;
        currentSoapJson?: Record<string, unknown> | null | undefined;
    }[];
    versions: {
        id: string;
        createdAt: Date;
        encounterId: string;
        versionNumber: number;
        createdByUserId: string;
        noteId: string;
        soapJson: Record<string, unknown>;
        reason?: string | null | undefined;
    }[];
    documents: {
        createdAt: Date;
        encounterId: string;
        createdByUserId: string;
        encounterDocumentId: string;
        documentId: string;
        attachedByUserId: string;
        attachedAt: Date;
        storageKey: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
    }[];
    timeline: {
        data: Record<string, unknown>;
        kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
        entityId: string;
        happenedAt: Date;
    }[];
}, {
    encounter: {
        status: "open" | "closed";
        id: string;
        patientId: string;
        accountId: string;
        ownerId: string;
        openedByUserId: string;
        openedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        reason?: string | null | undefined;
        closedByUserId?: string | null | undefined;
        closedAt?: Date | null | undefined;
    };
    notes: {
        type: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        encounterId: string;
        versionNumber: number;
        createdByUserId: string;
        updatedByUserId: string;
        signedAt?: Date | null | undefined;
        signedByUserId?: string | null | undefined;
        currentSoapJson?: Record<string, unknown> | null | undefined;
    }[];
    versions: {
        id: string;
        createdAt: Date;
        encounterId: string;
        versionNumber: number;
        createdByUserId: string;
        noteId: string;
        soapJson: Record<string, unknown>;
        reason?: string | null | undefined;
    }[];
    documents: {
        createdAt: Date;
        encounterId: string;
        createdByUserId: string;
        encounterDocumentId: string;
        documentId: string;
        attachedByUserId: string;
        attachedAt: Date;
        storageKey: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
    }[];
    timeline: {
        data: Record<string, unknown>;
        kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
        entityId: string;
        happenedAt: Date;
    }[];
}>;
/**
 * ==========================================
 * TYPES
 * ==========================================
 */
export type EncounterStatus = z.infer<typeof encounterStatusSchema>;
export type CreateEncounterBody = z.infer<typeof createEncounterBodySchema>;
export type CloseEncounterBody = z.infer<typeof closeEncounterBodySchema>;
export type EncounterIdParam = z.infer<typeof encounterIdParamSchema>;
export type ListEncountersQuery = z.infer<typeof listEncountersQuerySchema>;
export type EncounterResponse = z.infer<typeof encounterResponseSchema>;
export type ListEncountersResponse = z.infer<typeof listEncountersResponseSchema>;
export type EncounterTimelineNote = z.infer<typeof encounterTimelineNoteSchema>;
export type EncounterTimelineVersion = z.infer<typeof encounterTimelineVersionSchema>;
export type EncounterTimelineDocument = z.infer<typeof encounterTimelineDocumentSchema>;
export type EncounterTimelineEvent = z.infer<typeof encounterTimelineEventSchema>;
export type EncounterTimelineResponse = z.infer<typeof encounterTimelineResponseSchema>;
/**
 * ==========================================
 * CONTRACT DEFINITION
 * ==========================================
 */
export declare const encountersContract: {
    readonly create: {
        readonly method: "POST";
        readonly path: "/encounters";
        readonly body: z.ZodObject<{
            patientId: z.ZodString;
            reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
        }, "strip", z.ZodTypeAny, {
            patientId: string;
            reason?: string | undefined;
        }, {
            patientId: string;
            reason?: unknown;
        }>;
        readonly responses: {
            readonly 201: z.ZodObject<{
                id: z.ZodString;
                accountId: z.ZodString;
                patientId: z.ZodString;
                ownerId: z.ZodString;
                status: z.ZodEnum<["open", "closed"]>;
                openedByUserId: z.ZodString;
                closedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                openedAt: z.ZodDate;
                closedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
                reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
                status: "open" | "closed";
                id: string;
                patientId: string;
                accountId: string;
                ownerId: string;
                openedByUserId: string;
                openedAt: Date;
                createdAt: Date;
                updatedAt: Date;
                reason?: string | null | undefined;
                closedByUserId?: string | null | undefined;
                closedAt?: Date | null | undefined;
            }, {
                status: "open" | "closed";
                id: string;
                patientId: string;
                accountId: string;
                ownerId: string;
                openedByUserId: string;
                openedAt: Date;
                createdAt: Date;
                updatedAt: Date;
                reason?: string | null | undefined;
                closedByUserId?: string | null | undefined;
                closedAt?: Date | null | undefined;
            }>;
        };
    };
    readonly getById: {
        readonly method: "GET";
        readonly path: "/encounters/:id";
        readonly params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        readonly responses: {
            readonly 200: z.ZodObject<{
                id: z.ZodString;
                accountId: z.ZodString;
                patientId: z.ZodString;
                ownerId: z.ZodString;
                status: z.ZodEnum<["open", "closed"]>;
                openedByUserId: z.ZodString;
                closedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                openedAt: z.ZodDate;
                closedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
                reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
                status: "open" | "closed";
                id: string;
                patientId: string;
                accountId: string;
                ownerId: string;
                openedByUserId: string;
                openedAt: Date;
                createdAt: Date;
                updatedAt: Date;
                reason?: string | null | undefined;
                closedByUserId?: string | null | undefined;
                closedAt?: Date | null | undefined;
            }, {
                status: "open" | "closed";
                id: string;
                patientId: string;
                accountId: string;
                ownerId: string;
                openedByUserId: string;
                openedAt: Date;
                createdAt: Date;
                updatedAt: Date;
                reason?: string | null | undefined;
                closedByUserId?: string | null | undefined;
                closedAt?: Date | null | undefined;
            }>;
        };
    };
    readonly list: {
        readonly method: "GET";
        readonly path: "/encounters";
        readonly query: z.ZodObject<{
            page: z.ZodDefault<z.ZodNumber>;
            pageSize: z.ZodDefault<z.ZodNumber>;
        } & {
            patientId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            page: number;
            pageSize: number;
            patientId?: string | undefined;
        }, {
            page?: number | undefined;
            pageSize?: number | undefined;
            patientId?: string | undefined;
        }>;
        readonly responses: {
            readonly 200: z.ZodObject<{
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    accountId: z.ZodString;
                    patientId: z.ZodString;
                    ownerId: z.ZodString;
                    status: z.ZodEnum<["open", "closed"]>;
                    openedByUserId: z.ZodString;
                    closedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    openedAt: z.ZodDate;
                    closedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
                    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodDate;
                    updatedAt: z.ZodDate;
                }, "strip", z.ZodTypeAny, {
                    status: "open" | "closed";
                    id: string;
                    patientId: string;
                    accountId: string;
                    ownerId: string;
                    openedByUserId: string;
                    openedAt: Date;
                    createdAt: Date;
                    updatedAt: Date;
                    reason?: string | null | undefined;
                    closedByUserId?: string | null | undefined;
                    closedAt?: Date | null | undefined;
                }, {
                    status: "open" | "closed";
                    id: string;
                    patientId: string;
                    accountId: string;
                    ownerId: string;
                    openedByUserId: string;
                    openedAt: Date;
                    createdAt: Date;
                    updatedAt: Date;
                    reason?: string | null | undefined;
                    closedByUserId?: string | null | undefined;
                    closedAt?: Date | null | undefined;
                }>, "many">;
                page: z.ZodNumber;
                pageSize: z.ZodNumber;
                total: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                page: number;
                pageSize: number;
                data: {
                    status: "open" | "closed";
                    id: string;
                    patientId: string;
                    accountId: string;
                    ownerId: string;
                    openedByUserId: string;
                    openedAt: Date;
                    createdAt: Date;
                    updatedAt: Date;
                    reason?: string | null | undefined;
                    closedByUserId?: string | null | undefined;
                    closedAt?: Date | null | undefined;
                }[];
                total: number;
            }, {
                page: number;
                pageSize: number;
                data: {
                    status: "open" | "closed";
                    id: string;
                    patientId: string;
                    accountId: string;
                    ownerId: string;
                    openedByUserId: string;
                    openedAt: Date;
                    createdAt: Date;
                    updatedAt: Date;
                    reason?: string | null | undefined;
                    closedByUserId?: string | null | undefined;
                    closedAt?: Date | null | undefined;
                }[];
                total: number;
            }>;
        };
    };
    readonly close: {
        readonly method: "POST";
        readonly path: "/encounters/:id/close";
        readonly params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        readonly body: z.ZodObject<{
            reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
        }, "strip", z.ZodTypeAny, {
            reason?: string | undefined;
        }, {
            reason?: unknown;
        }>;
        readonly responses: {
            readonly 200: z.ZodObject<{
                id: z.ZodString;
                accountId: z.ZodString;
                patientId: z.ZodString;
                ownerId: z.ZodString;
                status: z.ZodEnum<["open", "closed"]>;
                openedByUserId: z.ZodString;
                closedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                openedAt: z.ZodDate;
                closedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
                reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
                status: "open" | "closed";
                id: string;
                patientId: string;
                accountId: string;
                ownerId: string;
                openedByUserId: string;
                openedAt: Date;
                createdAt: Date;
                updatedAt: Date;
                reason?: string | null | undefined;
                closedByUserId?: string | null | undefined;
                closedAt?: Date | null | undefined;
            }, {
                status: "open" | "closed";
                id: string;
                patientId: string;
                accountId: string;
                ownerId: string;
                openedByUserId: string;
                openedAt: Date;
                createdAt: Date;
                updatedAt: Date;
                reason?: string | null | undefined;
                closedByUserId?: string | null | undefined;
                closedAt?: Date | null | undefined;
            }>;
        };
    };
    readonly getTimeline: {
        readonly method: "GET";
        readonly path: "/encounters/:id/timeline";
        readonly params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        readonly responses: {
            readonly 200: z.ZodObject<{
                encounter: z.ZodObject<{
                    id: z.ZodString;
                    accountId: z.ZodString;
                    patientId: z.ZodString;
                    ownerId: z.ZodString;
                    status: z.ZodEnum<["open", "closed"]>;
                    openedByUserId: z.ZodString;
                    closedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    openedAt: z.ZodDate;
                    closedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
                    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdAt: z.ZodDate;
                    updatedAt: z.ZodDate;
                }, "strip", z.ZodTypeAny, {
                    status: "open" | "closed";
                    id: string;
                    patientId: string;
                    accountId: string;
                    ownerId: string;
                    openedByUserId: string;
                    openedAt: Date;
                    createdAt: Date;
                    updatedAt: Date;
                    reason?: string | null | undefined;
                    closedByUserId?: string | null | undefined;
                    closedAt?: Date | null | undefined;
                }, {
                    status: "open" | "closed";
                    id: string;
                    patientId: string;
                    accountId: string;
                    ownerId: string;
                    openedByUserId: string;
                    openedAt: Date;
                    createdAt: Date;
                    updatedAt: Date;
                    reason?: string | null | undefined;
                    closedByUserId?: string | null | undefined;
                    closedAt?: Date | null | undefined;
                }>;
                notes: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    encounterId: z.ZodString;
                    type: z.ZodString;
                    status: z.ZodString;
                    versionNumber: z.ZodNumber;
                    signedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
                    signedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdByUserId: z.ZodString;
                    updatedByUserId: z.ZodString;
                    createdAt: z.ZodDate;
                    updatedAt: z.ZodDate;
                    currentSoapJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
                }, "strip", z.ZodTypeAny, {
                    type: string;
                    status: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    encounterId: string;
                    versionNumber: number;
                    createdByUserId: string;
                    updatedByUserId: string;
                    signedAt?: Date | null | undefined;
                    signedByUserId?: string | null | undefined;
                    currentSoapJson?: Record<string, unknown> | null | undefined;
                }, {
                    type: string;
                    status: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    encounterId: string;
                    versionNumber: number;
                    createdByUserId: string;
                    updatedByUserId: string;
                    signedAt?: Date | null | undefined;
                    signedByUserId?: string | null | undefined;
                    currentSoapJson?: Record<string, unknown> | null | undefined;
                }>, "many">;
                versions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    noteId: z.ZodString;
                    encounterId: z.ZodString;
                    versionNumber: z.ZodNumber;
                    soapJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    createdByUserId: z.ZodString;
                    createdAt: z.ZodDate;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    createdAt: Date;
                    encounterId: string;
                    versionNumber: number;
                    createdByUserId: string;
                    noteId: string;
                    soapJson: Record<string, unknown>;
                    reason?: string | null | undefined;
                }, {
                    id: string;
                    createdAt: Date;
                    encounterId: string;
                    versionNumber: number;
                    createdByUserId: string;
                    noteId: string;
                    soapJson: Record<string, unknown>;
                    reason?: string | null | undefined;
                }>, "many">;
                documents: z.ZodArray<z.ZodObject<{
                    encounterDocumentId: z.ZodString;
                    encounterId: z.ZodString;
                    documentId: z.ZodString;
                    attachedByUserId: z.ZodString;
                    attachedAt: z.ZodDate;
                    storageKey: z.ZodString;
                    filename: z.ZodString;
                    mimeType: z.ZodString;
                    sizeBytes: z.ZodNumber;
                    createdByUserId: z.ZodString;
                    createdAt: z.ZodDate;
                }, "strip", z.ZodTypeAny, {
                    createdAt: Date;
                    encounterId: string;
                    createdByUserId: string;
                    encounterDocumentId: string;
                    documentId: string;
                    attachedByUserId: string;
                    attachedAt: Date;
                    storageKey: string;
                    filename: string;
                    mimeType: string;
                    sizeBytes: number;
                }, {
                    createdAt: Date;
                    encounterId: string;
                    createdByUserId: string;
                    encounterDocumentId: string;
                    documentId: string;
                    attachedByUserId: string;
                    attachedAt: Date;
                    storageKey: string;
                    filename: string;
                    mimeType: string;
                    sizeBytes: number;
                }>, "many">;
                timeline: z.ZodArray<z.ZodObject<{
                    kind: z.ZodEnum<["encounter.opened", "encounter.closed", "note.created", "note.signed", "note.version.created", "document.attached"]>;
                    entityId: z.ZodString;
                    happenedAt: z.ZodDate;
                    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                }, "strip", z.ZodTypeAny, {
                    data: Record<string, unknown>;
                    kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
                    entityId: string;
                    happenedAt: Date;
                }, {
                    data: Record<string, unknown>;
                    kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
                    entityId: string;
                    happenedAt: Date;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                encounter: {
                    status: "open" | "closed";
                    id: string;
                    patientId: string;
                    accountId: string;
                    ownerId: string;
                    openedByUserId: string;
                    openedAt: Date;
                    createdAt: Date;
                    updatedAt: Date;
                    reason?: string | null | undefined;
                    closedByUserId?: string | null | undefined;
                    closedAt?: Date | null | undefined;
                };
                notes: {
                    type: string;
                    status: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    encounterId: string;
                    versionNumber: number;
                    createdByUserId: string;
                    updatedByUserId: string;
                    signedAt?: Date | null | undefined;
                    signedByUserId?: string | null | undefined;
                    currentSoapJson?: Record<string, unknown> | null | undefined;
                }[];
                versions: {
                    id: string;
                    createdAt: Date;
                    encounterId: string;
                    versionNumber: number;
                    createdByUserId: string;
                    noteId: string;
                    soapJson: Record<string, unknown>;
                    reason?: string | null | undefined;
                }[];
                documents: {
                    createdAt: Date;
                    encounterId: string;
                    createdByUserId: string;
                    encounterDocumentId: string;
                    documentId: string;
                    attachedByUserId: string;
                    attachedAt: Date;
                    storageKey: string;
                    filename: string;
                    mimeType: string;
                    sizeBytes: number;
                }[];
                timeline: {
                    data: Record<string, unknown>;
                    kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
                    entityId: string;
                    happenedAt: Date;
                }[];
            }, {
                encounter: {
                    status: "open" | "closed";
                    id: string;
                    patientId: string;
                    accountId: string;
                    ownerId: string;
                    openedByUserId: string;
                    openedAt: Date;
                    createdAt: Date;
                    updatedAt: Date;
                    reason?: string | null | undefined;
                    closedByUserId?: string | null | undefined;
                    closedAt?: Date | null | undefined;
                };
                notes: {
                    type: string;
                    status: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    encounterId: string;
                    versionNumber: number;
                    createdByUserId: string;
                    updatedByUserId: string;
                    signedAt?: Date | null | undefined;
                    signedByUserId?: string | null | undefined;
                    currentSoapJson?: Record<string, unknown> | null | undefined;
                }[];
                versions: {
                    id: string;
                    createdAt: Date;
                    encounterId: string;
                    versionNumber: number;
                    createdByUserId: string;
                    noteId: string;
                    soapJson: Record<string, unknown>;
                    reason?: string | null | undefined;
                }[];
                documents: {
                    createdAt: Date;
                    encounterId: string;
                    createdByUserId: string;
                    encounterDocumentId: string;
                    documentId: string;
                    attachedByUserId: string;
                    attachedAt: Date;
                    storageKey: string;
                    filename: string;
                    mimeType: string;
                    sizeBytes: number;
                }[];
                timeline: {
                    data: Record<string, unknown>;
                    kind: "encounter.opened" | "encounter.closed" | "note.created" | "note.signed" | "note.version.created" | "document.attached";
                    entityId: string;
                    happenedAt: Date;
                }[];
            }>;
        };
    };
};
export type EncountersContract = typeof encountersContract;
//# sourceMappingURL=encounters.d.ts.map