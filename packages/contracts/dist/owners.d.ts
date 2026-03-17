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
/**
 * Owner summary response (for /owners/:id/summary)
 */
export declare const ownerSummaryResponseSchema: z.ZodObject<{
    owner: z.ZodObject<{
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
    patients: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        species: z.ZodString;
        breed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        species: string;
        breed?: string | null | undefined;
    }, {
        id: string;
        name: string;
        species: string;
        breed?: string | null | undefined;
    }>, "many">;
    stats: z.ZodObject<{
        totalPatients: z.ZodNumber;
        totalEncounters: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalPatients: number;
        totalEncounters: number;
    }, {
        totalPatients: number;
        totalEncounters: number;
    }>;
}, "strip", z.ZodTypeAny, {
    owner: {
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
    };
    patients: {
        id: string;
        name: string;
        species: string;
        breed?: string | null | undefined;
    }[];
    stats: {
        totalPatients: number;
        totalEncounters: number;
    };
}, {
    owner: {
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
    };
    patients: {
        id: string;
        name: string;
        species: string;
        breed?: string | null | undefined;
    }[];
    stats: {
        totalPatients: number;
        totalEncounters: number;
    };
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
                patients: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    species: z.ZodString;
                    breed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                    species: string;
                    breed?: string | null | undefined;
                }, {
                    id: string;
                    name: string;
                    species: string;
                    breed?: string | null | undefined;
                }>, "many">;
                stats: z.ZodObject<{
                    totalPatients: z.ZodNumber;
                    totalEncounters: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    totalPatients: number;
                    totalEncounters: number;
                }, {
                    totalPatients: number;
                    totalEncounters: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                owner: {
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
                };
                patients: {
                    id: string;
                    name: string;
                    species: string;
                    breed?: string | null | undefined;
                }[];
                stats: {
                    totalPatients: number;
                    totalEncounters: number;
                };
            }, {
                owner: {
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
                };
                patients: {
                    id: string;
                    name: string;
                    species: string;
                    breed?: string | null | undefined;
                }[];
                stats: {
                    totalPatients: number;
                    totalEncounters: number;
                };
            }>;
        };
    };
};
export type OwnersContract = typeof ownersContract;
//# sourceMappingURL=owners.d.ts.map