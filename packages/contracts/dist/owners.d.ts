import { z } from 'zod';
/**
 * ==========================================
 * REQUEST SCHEMAS
 * ==========================================
 */
/**
 * POST /owners - Create owner request body
 */
export declare const createOwnerBodySchema: z.ZodObject<{
    fullName: z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>;
    document: z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
    email: z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
    phoneMain: z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
    phoneAlt: z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
    addressJson: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    document?: string | null | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}, {
    fullName: string;
    document?: string | null | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}>;
/**
 * PATCH /owners/:id - Update owner request body
 */
export declare const updateOwnerBodySchema: z.ZodEffects<z.ZodObject<{
    fullName: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
    document: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>>;
    phoneMain: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>>;
    phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>>;
    addressJson: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, "strip", z.ZodTypeAny, {
    fullName?: string | undefined;
    document?: string | null | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}, {
    fullName?: string | undefined;
    document?: string | null | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}>, {
    fullName?: string | undefined;
    document?: string | null | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}, {
    fullName?: string | undefined;
    document?: string | null | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}>;
/**
 * GET /owners/:id - Get owner by ID params
 */
export declare const ownerIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/**
 * GET /owners - List owners query
 */
export declare const listOwnersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    q?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    q?: string | undefined;
}>;
/**
 * ==========================================
 * RESPONSE SCHEMAS
 * ==========================================
 */
/**
 * Owner response schema (single owner)
 */
export declare const ownerResponseSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fullName: z.ZodString;
    document: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phoneMain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addressJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    fullName: string;
    document?: string | null | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
    unitId?: string | null | undefined;
}, {
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    fullName: string;
    document?: string | null | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
    unitId?: string | null | undefined;
}>;
/**
 * Paginated owners response
 */
export declare const listOwnersResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        accountId: z.ZodString;
        unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        fullName: z.ZodString;
        document: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneMain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        document?: string | null | undefined;
        email?: string | null | undefined;
        phoneMain?: string | null | undefined;
        phoneAlt?: string | null | undefined;
        addressJson?: Record<string, unknown> | null | undefined;
        unitId?: string | null | undefined;
    }, {
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        document?: string | null | undefined;
        email?: string | null | undefined;
        phoneMain?: string | null | undefined;
        phoneAlt?: string | null | undefined;
        addressJson?: Record<string, unknown> | null | undefined;
        unitId?: string | null | undefined;
    }>, "many">;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    data: {
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        document?: string | null | undefined;
        email?: string | null | undefined;
        phoneMain?: string | null | undefined;
        phoneAlt?: string | null | undefined;
        addressJson?: Record<string, unknown> | null | undefined;
        unitId?: string | null | undefined;
    }[];
    total: number;
}, {
    page: number;
    pageSize: number;
    data: {
        id: string;
        accountId: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        document?: string | null | undefined;
        email?: string | null | undefined;
        phoneMain?: string | null | undefined;
        phoneAlt?: string | null | undefined;
        addressJson?: Record<string, unknown> | null | undefined;
        unitId?: string | null | undefined;
    }[];
    total: number;
}>;
export declare const ownerSummaryResponseSchema: z.ZodObject<{
    owner: z.ZodObject<{
        id: z.ZodString;
        fullName: z.ZodString;
        document: z.ZodNullable<z.ZodString>;
        email: z.ZodNullable<z.ZodString>;
        phoneMain: z.ZodNullable<z.ZodString>;
        phoneAlt: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        updatedAt: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
        phoneAlt: string | null;
    }, {
        id: string;
        updatedAt: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
        phoneAlt: string | null;
    }>;
    auditTrail: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        action: z.ZodString;
        actorRole: z.ZodNullable<z.ZodString>;
        reason: z.ZodNullable<z.ZodString>;
        requestId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        reason: string | null;
        createdAt: string;
        action: string;
        actorRole: string | null;
        requestId: string | null;
    }, {
        id: string;
        reason: string | null;
        createdAt: string;
        action: string;
        actorRole: string | null;
        requestId: string | null;
    }>, "many">;
    encounters: z.ZodArray<z.ZodUnknown, "many">;
    documents: z.ZodArray<z.ZodUnknown, "many">;
}, "strip", z.ZodTypeAny, {
    documents: unknown[];
    owner: {
        id: string;
        updatedAt: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
        phoneAlt: string | null;
    };
    auditTrail: {
        id: string;
        reason: string | null;
        createdAt: string;
        action: string;
        actorRole: string | null;
        requestId: string | null;
    }[];
    encounters: unknown[];
}, {
    documents: unknown[];
    owner: {
        id: string;
        updatedAt: string;
        fullName: string;
        document: string | null;
        email: string | null;
        phoneMain: string | null;
        phoneAlt: string | null;
    };
    auditTrail: {
        id: string;
        reason: string | null;
        createdAt: string;
        action: string;
        actorRole: string | null;
        requestId: string | null;
    }[];
    encounters: unknown[];
}>;
/**
 * ==========================================
 * TYPES
 * ==========================================
 */
export type CreateOwnerBody = z.infer<typeof createOwnerBodySchema>;
export type UpdateOwnerBody = z.infer<typeof updateOwnerBodySchema>;
export type OwnerIdParam = z.infer<typeof ownerIdParamSchema>;
export type ListOwnersQuery = z.infer<typeof listOwnersQuerySchema>;
export type OwnerResponse = z.infer<typeof ownerResponseSchema>;
export type ListOwnersResponse = z.infer<typeof listOwnersResponseSchema>;
export type OwnerSummaryResponse = z.infer<typeof ownerSummaryResponseSchema>;
/**
 * ==========================================
 * CONTRACT DEFINITION
 * ==========================================
 */
export declare const ownersContract: {
    readonly create: {
        readonly method: "POST";
        readonly path: "/owners";
        readonly body: z.ZodObject<{
            fullName: z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>;
            document: z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
            email: z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
            phoneMain: z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
            phoneAlt: z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
            addressJson: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        }, "strip", z.ZodTypeAny, {
            fullName: string;
            document?: string | null | undefined;
            email?: string | null | undefined;
            phoneMain?: string | null | undefined;
            phoneAlt?: string | null | undefined;
            addressJson?: Record<string, unknown> | null | undefined;
        }, {
            fullName: string;
            document?: string | null | undefined;
            email?: string | null | undefined;
            phoneMain?: string | null | undefined;
            phoneAlt?: string | null | undefined;
            addressJson?: Record<string, unknown> | null | undefined;
        }>;
        readonly responses: {
            readonly 201: z.ZodObject<{
                id: z.ZodString;
                accountId: z.ZodString;
                unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                fullName: z.ZodString;
                document: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                phoneMain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                addressJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
                id: string;
                accountId: string;
                createdAt: Date;
                updatedAt: Date;
                fullName: string;
                document?: string | null | undefined;
                email?: string | null | undefined;
                phoneMain?: string | null | undefined;
                phoneAlt?: string | null | undefined;
                addressJson?: Record<string, unknown> | null | undefined;
                unitId?: string | null | undefined;
            }, {
                id: string;
                accountId: string;
                createdAt: Date;
                updatedAt: Date;
                fullName: string;
                document?: string | null | undefined;
                email?: string | null | undefined;
                phoneMain?: string | null | undefined;
                phoneAlt?: string | null | undefined;
                addressJson?: Record<string, unknown> | null | undefined;
                unitId?: string | null | undefined;
            }>;
        };
    };
    readonly getById: {
        readonly method: "GET";
        readonly path: "/owners/:id";
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
                unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                fullName: z.ZodString;
                document: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                phoneMain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                addressJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
                id: string;
                accountId: string;
                createdAt: Date;
                updatedAt: Date;
                fullName: string;
                document?: string | null | undefined;
                email?: string | null | undefined;
                phoneMain?: string | null | undefined;
                phoneAlt?: string | null | undefined;
                addressJson?: Record<string, unknown> | null | undefined;
                unitId?: string | null | undefined;
            }, {
                id: string;
                accountId: string;
                createdAt: Date;
                updatedAt: Date;
                fullName: string;
                document?: string | null | undefined;
                email?: string | null | undefined;
                phoneMain?: string | null | undefined;
                phoneAlt?: string | null | undefined;
                addressJson?: Record<string, unknown> | null | undefined;
                unitId?: string | null | undefined;
            }>;
        };
    };
    readonly list: {
        readonly method: "GET";
        readonly path: "/owners";
        readonly query: z.ZodObject<{
            page: z.ZodDefault<z.ZodNumber>;
            pageSize: z.ZodDefault<z.ZodNumber>;
        } & {
            q: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            page: number;
            pageSize: number;
            q?: string | undefined;
        }, {
            page?: number | undefined;
            pageSize?: number | undefined;
            q?: string | undefined;
        }>;
        readonly responses: {
            readonly 200: z.ZodObject<{
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    accountId: z.ZodString;
                    unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    fullName: z.ZodString;
                    document: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    phoneMain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    addressJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
                    createdAt: z.ZodDate;
                    updatedAt: z.ZodDate;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    accountId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    fullName: string;
                    document?: string | null | undefined;
                    email?: string | null | undefined;
                    phoneMain?: string | null | undefined;
                    phoneAlt?: string | null | undefined;
                    addressJson?: Record<string, unknown> | null | undefined;
                    unitId?: string | null | undefined;
                }, {
                    id: string;
                    accountId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    fullName: string;
                    document?: string | null | undefined;
                    email?: string | null | undefined;
                    phoneMain?: string | null | undefined;
                    phoneAlt?: string | null | undefined;
                    addressJson?: Record<string, unknown> | null | undefined;
                    unitId?: string | null | undefined;
                }>, "many">;
                page: z.ZodNumber;
                pageSize: z.ZodNumber;
                total: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                page: number;
                pageSize: number;
                data: {
                    id: string;
                    accountId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    fullName: string;
                    document?: string | null | undefined;
                    email?: string | null | undefined;
                    phoneMain?: string | null | undefined;
                    phoneAlt?: string | null | undefined;
                    addressJson?: Record<string, unknown> | null | undefined;
                    unitId?: string | null | undefined;
                }[];
                total: number;
            }, {
                page: number;
                pageSize: number;
                data: {
                    id: string;
                    accountId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    fullName: string;
                    document?: string | null | undefined;
                    email?: string | null | undefined;
                    phoneMain?: string | null | undefined;
                    phoneAlt?: string | null | undefined;
                    addressJson?: Record<string, unknown> | null | undefined;
                    unitId?: string | null | undefined;
                }[];
                total: number;
            }>;
        };
    };
    readonly update: {
        readonly method: "PATCH";
        readonly path: "/owners/:id";
        readonly params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        readonly body: z.ZodEffects<z.ZodObject<{
            fullName: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
            document: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>>;
            email: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>>;
            phoneMain: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>>;
            phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>>;
            addressJson: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, "strip", z.ZodTypeAny, {
            fullName?: string | undefined;
            document?: string | null | undefined;
            email?: string | null | undefined;
            phoneMain?: string | null | undefined;
            phoneAlt?: string | null | undefined;
            addressJson?: Record<string, unknown> | null | undefined;
        }, {
            fullName?: string | undefined;
            document?: string | null | undefined;
            email?: string | null | undefined;
            phoneMain?: string | null | undefined;
            phoneAlt?: string | null | undefined;
            addressJson?: Record<string, unknown> | null | undefined;
        }>, {
            fullName?: string | undefined;
            document?: string | null | undefined;
            email?: string | null | undefined;
            phoneMain?: string | null | undefined;
            phoneAlt?: string | null | undefined;
            addressJson?: Record<string, unknown> | null | undefined;
        }, {
            fullName?: string | undefined;
            document?: string | null | undefined;
            email?: string | null | undefined;
            phoneMain?: string | null | undefined;
            phoneAlt?: string | null | undefined;
            addressJson?: Record<string, unknown> | null | undefined;
        }>;
        readonly responses: {
            readonly 200: z.ZodObject<{
                id: z.ZodString;
                accountId: z.ZodString;
                unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                fullName: z.ZodString;
                document: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                phoneMain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                addressJson: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
                id: string;
                accountId: string;
                createdAt: Date;
                updatedAt: Date;
                fullName: string;
                document?: string | null | undefined;
                email?: string | null | undefined;
                phoneMain?: string | null | undefined;
                phoneAlt?: string | null | undefined;
                addressJson?: Record<string, unknown> | null | undefined;
                unitId?: string | null | undefined;
            }, {
                id: string;
                accountId: string;
                createdAt: Date;
                updatedAt: Date;
                fullName: string;
                document?: string | null | undefined;
                email?: string | null | undefined;
                phoneMain?: string | null | undefined;
                phoneAlt?: string | null | undefined;
                addressJson?: Record<string, unknown> | null | undefined;
                unitId?: string | null | undefined;
            }>;
        };
    };
    readonly getSummary: {
        readonly method: "GET";
        readonly path: "/owners/:id/summary";
        readonly params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        readonly responses: {
            readonly 200: z.ZodObject<{
                owner: z.ZodObject<{
                    id: z.ZodString;
                    fullName: z.ZodString;
                    document: z.ZodNullable<z.ZodString>;
                    email: z.ZodNullable<z.ZodString>;
                    phoneMain: z.ZodNullable<z.ZodString>;
                    phoneAlt: z.ZodNullable<z.ZodString>;
                    updatedAt: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    updatedAt: string;
                    fullName: string;
                    document: string | null;
                    email: string | null;
                    phoneMain: string | null;
                    phoneAlt: string | null;
                }, {
                    id: string;
                    updatedAt: string;
                    fullName: string;
                    document: string | null;
                    email: string | null;
                    phoneMain: string | null;
                    phoneAlt: string | null;
                }>;
                auditTrail: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    createdAt: z.ZodString;
                    action: z.ZodString;
                    actorRole: z.ZodNullable<z.ZodString>;
                    reason: z.ZodNullable<z.ZodString>;
                    requestId: z.ZodNullable<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    reason: string | null;
                    createdAt: string;
                    action: string;
                    actorRole: string | null;
                    requestId: string | null;
                }, {
                    id: string;
                    reason: string | null;
                    createdAt: string;
                    action: string;
                    actorRole: string | null;
                    requestId: string | null;
                }>, "many">;
                encounters: z.ZodArray<z.ZodUnknown, "many">;
                documents: z.ZodArray<z.ZodUnknown, "many">;
            }, "strip", z.ZodTypeAny, {
                documents: unknown[];
                owner: {
                    id: string;
                    updatedAt: string;
                    fullName: string;
                    document: string | null;
                    email: string | null;
                    phoneMain: string | null;
                    phoneAlt: string | null;
                };
                auditTrail: {
                    id: string;
                    reason: string | null;
                    createdAt: string;
                    action: string;
                    actorRole: string | null;
                    requestId: string | null;
                }[];
                encounters: unknown[];
            }, {
                documents: unknown[];
                owner: {
                    id: string;
                    updatedAt: string;
                    fullName: string;
                    document: string | null;
                    email: string | null;
                    phoneMain: string | null;
                    phoneAlt: string | null;
                };
                auditTrail: {
                    id: string;
                    reason: string | null;
                    createdAt: string;
                    action: string;
                    actorRole: string | null;
                    requestId: string | null;
                }[];
                encounters: unknown[];
            }>;
        };
    };
};
export type OwnersContract = typeof ownersContract;
//# sourceMappingURL=owners.d.ts.map