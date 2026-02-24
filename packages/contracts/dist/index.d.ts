/**
 * @cvg-his/contracts
 *
 * Shared API contracts for CVG HIS - Contract Gate to prevent drift between his-web and his-api.
 *
 * This package serves as the single source of truth for:
 * - Request body schemas
 * - Response schemas
 * - Query parameter schemas
 * - Path parameter schemas
 *
 * Usage:
 * - his-api: Import schemas for validation in routes
 * - his-web: Import schemas for type-safe API client generation
 * - tests: Import schemas for contract testing
 */
export * from './common.js';
export * from './owners.js';
export * from './patients.js';
export * from './encounters.js';
/**
 * Complete API contract definition
 */
export declare const apiContract: {
    readonly owners: {
        readonly create: {
            readonly method: "POST";
            readonly path: "/owners";
            readonly body: import("zod").ZodObject<{
                fullName: import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>;
                document: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>;
                email: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>;
                phoneMain: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>;
                phoneAlt: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>;
                addressJson: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
            }, "strip", import("zod").ZodTypeAny, {
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
                readonly 201: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    unitId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    fullName: import("zod").ZodString;
                    document: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    email: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    phoneMain: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    phoneAlt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    addressJson: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
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
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    unitId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    fullName: import("zod").ZodString;
                    document: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    email: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    phoneMain: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    phoneAlt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    addressJson: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
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
            readonly query: import("zod").ZodObject<{
                page: import("zod").ZodDefault<import("zod").ZodNumber>;
                pageSize: import("zod").ZodDefault<import("zod").ZodNumber>;
            } & {
                q: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodTypeAny, {
                page: number;
                pageSize: number;
                q?: string | undefined;
            }, {
                page?: number | undefined;
                pageSize?: number | undefined;
                q?: string | undefined;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    data: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        accountId: import("zod").ZodString;
                        unitId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        fullName: import("zod").ZodString;
                        document: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        email: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        phoneMain: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        phoneAlt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        addressJson: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
                        createdAt: import("zod").ZodDate;
                        updatedAt: import("zod").ZodDate;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    page: import("zod").ZodNumber;
                    pageSize: import("zod").ZodNumber;
                    total: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
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
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly body: import("zod").ZodEffects<import("zod").ZodObject<{
                fullName: import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>;
                document: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>>;
                email: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>>;
                phoneMain: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>>;
                phoneAlt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>>;
                addressJson: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>>;
            }, "strip", import("zod").ZodTypeAny, {
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
                readonly 200: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    unitId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    fullName: import("zod").ZodString;
                    document: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    email: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    phoneMain: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    phoneAlt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    addressJson: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
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
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    owner: import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        fullName: import("zod").ZodString;
                        document: import("zod").ZodNullable<import("zod").ZodString>;
                        email: import("zod").ZodNullable<import("zod").ZodString>;
                        phoneMain: import("zod").ZodNullable<import("zod").ZodString>;
                        phoneAlt: import("zod").ZodNullable<import("zod").ZodString>;
                        updatedAt: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    auditTrail: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        createdAt: import("zod").ZodString;
                        action: import("zod").ZodString;
                        actorRole: import("zod").ZodNullable<import("zod").ZodString>;
                        reason: import("zod").ZodNullable<import("zod").ZodString>;
                        requestId: import("zod").ZodNullable<import("zod").ZodString>;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    encounters: import("zod").ZodArray<import("zod").ZodUnknown, "many">;
                    documents: import("zod").ZodArray<import("zod").ZodUnknown, "many">;
                }, "strip", import("zod").ZodTypeAny, {
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
    readonly patients: {
        readonly create: {
            readonly method: "POST";
            readonly path: "/patients";
            readonly body: import("zod").ZodObject<{
                ownerId: import("zod").ZodString;
                name: import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>;
                species: import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>;
                breed: import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>;
                sex: import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>;
                birthDate: import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>;
                weightKg: import("zod").ZodOptional<import("zod").ZodNumber>;
                microchip: import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>;
                alerts: import("zod").ZodOptional<import("zod").ZodObject<{
                    aggressive: import("zod").ZodOptional<import("zod").ZodBoolean>;
                    allergies: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                    anesthesia_risk: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<["low", "medium", "high"]>>>;
                    chronic_conditions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                    notes: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                }, "strip", import("zod").ZodTypeAny, {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                }, {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                }>>;
            }, "strip", import("zod").ZodTypeAny, {
                ownerId: string;
                name: string;
                species: string;
                breed?: string | undefined;
                sex?: string | undefined;
                birthDate?: string | undefined;
                weightKg?: number | undefined;
                microchip?: string | undefined;
                alerts?: {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                } | undefined;
            }, {
                ownerId: string;
                name: string;
                species: string;
                breed?: string | undefined;
                sex?: string | undefined;
                birthDate?: string | undefined;
                weightKg?: number | undefined;
                microchip?: string | undefined;
                alerts?: {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                } | undefined;
            }>;
            readonly responses: {
                readonly 201: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    unitId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    ownerId: import("zod").ZodString;
                    name: import("zod").ZodString;
                    species: import("zod").ZodString;
                    breed: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    sex: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    birthDate: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    weightKg: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>>;
                    microchip: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    alerts: import("zod").ZodObject<{
                        aggressive: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        allergies: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                        anesthesia_risk: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<["low", "medium", "high"]>>>;
                        chronic_conditions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                        notes: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    }, {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    }>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
                    id: string;
                    accountId: string;
                    ownerId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    species: string;
                    alerts: {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    };
                    unitId?: string | null | undefined;
                    breed?: string | null | undefined;
                    sex?: string | null | undefined;
                    birthDate?: string | null | undefined;
                    weightKg?: string | number | null | undefined;
                    microchip?: string | null | undefined;
                }, {
                    id: string;
                    accountId: string;
                    ownerId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    species: string;
                    alerts: {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    };
                    unitId?: string | null | undefined;
                    breed?: string | null | undefined;
                    sex?: string | null | undefined;
                    birthDate?: string | null | undefined;
                    weightKg?: string | number | null | undefined;
                    microchip?: string | null | undefined;
                }>;
            };
        };
        readonly getById: {
            readonly method: "GET";
            readonly path: "/patients/:id";
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    unitId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    ownerId: import("zod").ZodString;
                    name: import("zod").ZodString;
                    species: import("zod").ZodString;
                    breed: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    sex: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    birthDate: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    weightKg: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>>;
                    microchip: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    alerts: import("zod").ZodObject<{
                        aggressive: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        allergies: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                        anesthesia_risk: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<["low", "medium", "high"]>>>;
                        chronic_conditions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                        notes: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    }, {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    }>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
                    id: string;
                    accountId: string;
                    ownerId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    species: string;
                    alerts: {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    };
                    unitId?: string | null | undefined;
                    breed?: string | null | undefined;
                    sex?: string | null | undefined;
                    birthDate?: string | null | undefined;
                    weightKg?: string | number | null | undefined;
                    microchip?: string | null | undefined;
                }, {
                    id: string;
                    accountId: string;
                    ownerId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    species: string;
                    alerts: {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    };
                    unitId?: string | null | undefined;
                    breed?: string | null | undefined;
                    sex?: string | null | undefined;
                    birthDate?: string | null | undefined;
                    weightKg?: string | number | null | undefined;
                    microchip?: string | null | undefined;
                }>;
            };
        };
        readonly list: {
            readonly method: "GET";
            readonly path: "/patients";
            readonly query: import("zod").ZodObject<{
                page: import("zod").ZodDefault<import("zod").ZodNumber>;
                pageSize: import("zod").ZodDefault<import("zod").ZodNumber>;
            } & {
                ownerId: import("zod").ZodOptional<import("zod").ZodString>;
                species: import("zod").ZodOptional<import("zod").ZodString>;
                q: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodTypeAny, {
                page: number;
                pageSize: number;
                q?: string | undefined;
                ownerId?: string | undefined;
                species?: string | undefined;
            }, {
                page?: number | undefined;
                pageSize?: number | undefined;
                q?: string | undefined;
                ownerId?: string | undefined;
                species?: string | undefined;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    data: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        accountId: import("zod").ZodString;
                        unitId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        ownerId: import("zod").ZodString;
                        name: import("zod").ZodString;
                        species: import("zod").ZodString;
                        breed: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        sex: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        birthDate: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        weightKg: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>>;
                        microchip: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        alerts: import("zod").ZodObject<{
                            aggressive: import("zod").ZodOptional<import("zod").ZodBoolean>;
                            allergies: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                            anesthesia_risk: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<["low", "medium", "high"]>>>;
                            chronic_conditions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                            notes: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        }, "strip", import("zod").ZodTypeAny, {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        }, {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        }>;
                        createdAt: import("zod").ZodDate;
                        updatedAt: import("zod").ZodDate;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        accountId: string;
                        ownerId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        species: string;
                        alerts: {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        };
                        unitId?: string | null | undefined;
                        breed?: string | null | undefined;
                        sex?: string | null | undefined;
                        birthDate?: string | null | undefined;
                        weightKg?: string | number | null | undefined;
                        microchip?: string | null | undefined;
                    }, {
                        id: string;
                        accountId: string;
                        ownerId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        species: string;
                        alerts: {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        };
                        unitId?: string | null | undefined;
                        breed?: string | null | undefined;
                        sex?: string | null | undefined;
                        birthDate?: string | null | undefined;
                        weightKg?: string | number | null | undefined;
                        microchip?: string | null | undefined;
                    }>, "many">;
                    page: import("zod").ZodNumber;
                    pageSize: import("zod").ZodNumber;
                    total: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
                    page: number;
                    pageSize: number;
                    data: {
                        id: string;
                        accountId: string;
                        ownerId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        species: string;
                        alerts: {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        };
                        unitId?: string | null | undefined;
                        breed?: string | null | undefined;
                        sex?: string | null | undefined;
                        birthDate?: string | null | undefined;
                        weightKg?: string | number | null | undefined;
                        microchip?: string | null | undefined;
                    }[];
                    total: number;
                }, {
                    page: number;
                    pageSize: number;
                    data: {
                        id: string;
                        accountId: string;
                        ownerId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        species: string;
                        alerts: {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        };
                        unitId?: string | null | undefined;
                        breed?: string | null | undefined;
                        sex?: string | null | undefined;
                        birthDate?: string | null | undefined;
                        weightKg?: string | number | null | undefined;
                        microchip?: string | null | undefined;
                    }[];
                    total: number;
                }>;
            };
        };
        readonly update: {
            readonly method: "PATCH";
            readonly path: "/patients/:id";
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly body: import("zod").ZodEffects<import("zod").ZodObject<{
                ownerId: import("zod").ZodOptional<import("zod").ZodString>;
                name: import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>;
                species: import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>;
                breed: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>;
                sex: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>;
                birthDate: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>;
                weightKg: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodNumber>>;
                microchip: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodPipeline<import("zod").ZodEffects<import("zod").ZodString, unknown, string>, import("zod").ZodString>>>;
                alerts: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodObject<{
                    aggressive: import("zod").ZodOptional<import("zod").ZodBoolean>;
                    allergies: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                    anesthesia_risk: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<["low", "medium", "high"]>>>;
                    chronic_conditions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                    notes: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                }, "strip", import("zod").ZodTypeAny, {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                }, {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                }>>>;
            }, "strip", import("zod").ZodTypeAny, {
                ownerId?: string | undefined;
                name?: string | undefined;
                species?: string | undefined;
                breed?: string | undefined;
                sex?: string | undefined;
                birthDate?: string | undefined;
                weightKg?: number | undefined;
                microchip?: string | undefined;
                alerts?: {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                } | undefined;
            }, {
                ownerId?: string | undefined;
                name?: string | undefined;
                species?: string | undefined;
                breed?: string | undefined;
                sex?: string | undefined;
                birthDate?: string | undefined;
                weightKg?: number | undefined;
                microchip?: string | undefined;
                alerts?: {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                } | undefined;
            }>, {
                ownerId?: string | undefined;
                name?: string | undefined;
                species?: string | undefined;
                breed?: string | undefined;
                sex?: string | undefined;
                birthDate?: string | undefined;
                weightKg?: number | undefined;
                microchip?: string | undefined;
                alerts?: {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                } | undefined;
            }, {
                ownerId?: string | undefined;
                name?: string | undefined;
                species?: string | undefined;
                breed?: string | undefined;
                sex?: string | undefined;
                birthDate?: string | undefined;
                weightKg?: number | undefined;
                microchip?: string | undefined;
                alerts?: {
                    notes?: string | null | undefined;
                    aggressive?: boolean | undefined;
                    allergies?: string[] | undefined;
                    anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                    chronic_conditions?: string[] | undefined;
                } | undefined;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    unitId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    ownerId: import("zod").ZodString;
                    name: import("zod").ZodString;
                    species: import("zod").ZodString;
                    breed: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    sex: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    birthDate: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    weightKg: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>>;
                    microchip: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    alerts: import("zod").ZodObject<{
                        aggressive: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        allergies: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                        anesthesia_risk: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<["low", "medium", "high"]>>>;
                        chronic_conditions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                        notes: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    }, "strip", import("zod").ZodTypeAny, {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    }, {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    }>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
                    id: string;
                    accountId: string;
                    ownerId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    species: string;
                    alerts: {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    };
                    unitId?: string | null | undefined;
                    breed?: string | null | undefined;
                    sex?: string | null | undefined;
                    birthDate?: string | null | undefined;
                    weightKg?: string | number | null | undefined;
                    microchip?: string | null | undefined;
                }, {
                    id: string;
                    accountId: string;
                    ownerId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    species: string;
                    alerts: {
                        notes?: string | null | undefined;
                        aggressive?: boolean | undefined;
                        allergies?: string[] | undefined;
                        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                        chronic_conditions?: string[] | undefined;
                    };
                    unitId?: string | null | undefined;
                    breed?: string | null | undefined;
                    sex?: string | null | undefined;
                    birthDate?: string | null | undefined;
                    weightKg?: string | number | null | undefined;
                    microchip?: string | null | undefined;
                }>;
            };
        };
        readonly getSummary: {
            readonly method: "GET";
            readonly path: "/patients/:id/summary";
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    patient: import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        ownerId: import("zod").ZodString;
                        name: import("zod").ZodString;
                        species: import("zod").ZodString;
                        microchip: import("zod").ZodNullable<import("zod").ZodString>;
                        alerts: import("zod").ZodObject<{
                            aggressive: import("zod").ZodOptional<import("zod").ZodBoolean>;
                            allergies: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                            anesthesia_risk: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<["low", "medium", "high"]>>>;
                            chronic_conditions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
                            notes: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        }, "strip", import("zod").ZodTypeAny, {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        }, {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        }>;
                        highlightedAlerts: import("zod").ZodObject<{
                            aggressive: import("zod").ZodBoolean;
                            allergiesCount: import("zod").ZodNumber;
                            anesthesiaRisk: import("zod").ZodNullable<import("zod").ZodEnum<["low", "medium", "high"]>>;
                            chronicConditionsCount: import("zod").ZodNumber;
                            hasNotes: import("zod").ZodBoolean;
                        }, "strip", import("zod").ZodTypeAny, {
                            aggressive: boolean;
                            allergiesCount: number;
                            anesthesiaRisk: "low" | "medium" | "high" | null;
                            chronicConditionsCount: number;
                            hasNotes: boolean;
                        }, {
                            aggressive: boolean;
                            allergiesCount: number;
                            anesthesiaRisk: "low" | "medium" | "high" | null;
                            chronicConditionsCount: number;
                            hasNotes: boolean;
                        }>;
                        updatedAt: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        ownerId: string;
                        updatedAt: string;
                        name: string;
                        species: string;
                        microchip: string | null;
                        alerts: {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        };
                        highlightedAlerts: {
                            aggressive: boolean;
                            allergiesCount: number;
                            anesthesiaRisk: "low" | "medium" | "high" | null;
                            chronicConditionsCount: number;
                            hasNotes: boolean;
                        };
                    }, {
                        id: string;
                        ownerId: string;
                        updatedAt: string;
                        name: string;
                        species: string;
                        microchip: string | null;
                        alerts: {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        };
                        highlightedAlerts: {
                            aggressive: boolean;
                            allergiesCount: number;
                            anesthesiaRisk: "low" | "medium" | "high" | null;
                            chronicConditionsCount: number;
                            hasNotes: boolean;
                        };
                    }>;
                    auditTrail: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        createdAt: import("zod").ZodString;
                        action: import("zod").ZodString;
                        actorRole: import("zod").ZodNullable<import("zod").ZodString>;
                        reason: import("zod").ZodNullable<import("zod").ZodString>;
                        requestId: import("zod").ZodNullable<import("zod").ZodString>;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    encounters: import("zod").ZodArray<import("zod").ZodUnknown, "many">;
                    documents: import("zod").ZodArray<import("zod").ZodUnknown, "many">;
                }, "strip", import("zod").ZodTypeAny, {
                    documents: unknown[];
                    auditTrail: {
                        id: string;
                        reason: string | null;
                        createdAt: string;
                        action: string;
                        actorRole: string | null;
                        requestId: string | null;
                    }[];
                    encounters: unknown[];
                    patient: {
                        id: string;
                        ownerId: string;
                        updatedAt: string;
                        name: string;
                        species: string;
                        microchip: string | null;
                        alerts: {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        };
                        highlightedAlerts: {
                            aggressive: boolean;
                            allergiesCount: number;
                            anesthesiaRisk: "low" | "medium" | "high" | null;
                            chronicConditionsCount: number;
                            hasNotes: boolean;
                        };
                    };
                }, {
                    documents: unknown[];
                    auditTrail: {
                        id: string;
                        reason: string | null;
                        createdAt: string;
                        action: string;
                        actorRole: string | null;
                        requestId: string | null;
                    }[];
                    encounters: unknown[];
                    patient: {
                        id: string;
                        ownerId: string;
                        updatedAt: string;
                        name: string;
                        species: string;
                        microchip: string | null;
                        alerts: {
                            notes?: string | null | undefined;
                            aggressive?: boolean | undefined;
                            allergies?: string[] | undefined;
                            anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
                            chronic_conditions?: string[] | undefined;
                        };
                        highlightedAlerts: {
                            aggressive: boolean;
                            allergiesCount: number;
                            anesthesiaRisk: "low" | "medium" | "high" | null;
                            chronicConditionsCount: number;
                            hasNotes: boolean;
                        };
                    };
                }>;
            };
        };
    };
    readonly encounters: {
        readonly create: {
            readonly method: "POST";
            readonly path: "/encounters";
            readonly body: import("zod").ZodObject<{
                patientId: import("zod").ZodString;
                reason: import("zod").ZodEffects<import("zod").ZodOptional<import("zod").ZodString>, string | undefined, unknown>;
            }, "strip", import("zod").ZodTypeAny, {
                patientId: string;
                reason?: string | undefined;
            }, {
                patientId: string;
                reason?: unknown;
            }>;
            readonly responses: {
                readonly 201: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    patientId: import("zod").ZodString;
                    ownerId: import("zod").ZodString;
                    status: import("zod").ZodEnum<["open", "closed"]>;
                    openedByUserId: import("zod").ZodString;
                    closedByUserId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    openedAt: import("zod").ZodDate;
                    closedAt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodDate>>;
                    reason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
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
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    patientId: import("zod").ZodString;
                    ownerId: import("zod").ZodString;
                    status: import("zod").ZodEnum<["open", "closed"]>;
                    openedByUserId: import("zod").ZodString;
                    closedByUserId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    openedAt: import("zod").ZodDate;
                    closedAt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodDate>>;
                    reason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
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
            readonly query: import("zod").ZodObject<{
                page: import("zod").ZodDefault<import("zod").ZodNumber>;
                pageSize: import("zod").ZodDefault<import("zod").ZodNumber>;
            } & {
                patientId: import("zod").ZodOptional<import("zod").ZodString>;
                q: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodTypeAny, {
                page: number;
                pageSize: number;
                q?: string | undefined;
                patientId?: string | undefined;
            }, {
                page?: number | undefined;
                pageSize?: number | undefined;
                q?: string | undefined;
                patientId?: string | undefined;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    data: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        accountId: import("zod").ZodString;
                        patientId: import("zod").ZodString;
                        ownerId: import("zod").ZodString;
                        status: import("zod").ZodEnum<["open", "closed"]>;
                        openedByUserId: import("zod").ZodString;
                        closedByUserId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        openedAt: import("zod").ZodDate;
                        closedAt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodDate>>;
                        reason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        createdAt: import("zod").ZodDate;
                        updatedAt: import("zod").ZodDate;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    page: import("zod").ZodNumber;
                    pageSize: import("zod").ZodNumber;
                    total: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
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
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly body: import("zod").ZodObject<{
                reason: import("zod").ZodEffects<import("zod").ZodOptional<import("zod").ZodString>, string | undefined, unknown>;
            }, "strip", import("zod").ZodTypeAny, {
                reason?: string | undefined;
            }, {
                reason?: unknown;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    accountId: import("zod").ZodString;
                    patientId: import("zod").ZodString;
                    ownerId: import("zod").ZodString;
                    status: import("zod").ZodEnum<["open", "closed"]>;
                    openedByUserId: import("zod").ZodString;
                    closedByUserId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    openedAt: import("zod").ZodDate;
                    closedAt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodDate>>;
                    reason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                    createdAt: import("zod").ZodDate;
                    updatedAt: import("zod").ZodDate;
                }, "strip", import("zod").ZodTypeAny, {
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
            readonly params: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, "strip", import("zod").ZodTypeAny, {
                id: string;
            }, {
                id: string;
            }>;
            readonly responses: {
                readonly 200: import("zod").ZodObject<{
                    encounter: import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        accountId: import("zod").ZodString;
                        patientId: import("zod").ZodString;
                        ownerId: import("zod").ZodString;
                        status: import("zod").ZodEnum<["open", "closed"]>;
                        openedByUserId: import("zod").ZodString;
                        closedByUserId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        openedAt: import("zod").ZodDate;
                        closedAt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodDate>>;
                        reason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        createdAt: import("zod").ZodDate;
                        updatedAt: import("zod").ZodDate;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    notes: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        encounterId: import("zod").ZodString;
                        type: import("zod").ZodString;
                        status: import("zod").ZodString;
                        versionNumber: import("zod").ZodNumber;
                        signedAt: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodDate>>;
                        signedByUserId: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        createdByUserId: import("zod").ZodString;
                        updatedByUserId: import("zod").ZodString;
                        createdAt: import("zod").ZodDate;
                        updatedAt: import("zod").ZodDate;
                        currentSoapJson: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    versions: import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        noteId: import("zod").ZodString;
                        encounterId: import("zod").ZodString;
                        versionNumber: import("zod").ZodNumber;
                        soapJson: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
                        reason: import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
                        createdByUserId: import("zod").ZodString;
                        createdAt: import("zod").ZodDate;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    documents: import("zod").ZodArray<import("zod").ZodObject<{
                        encounterDocumentId: import("zod").ZodString;
                        encounterId: import("zod").ZodString;
                        documentId: import("zod").ZodString;
                        attachedByUserId: import("zod").ZodString;
                        attachedAt: import("zod").ZodDate;
                        storageKey: import("zod").ZodString;
                        filename: import("zod").ZodString;
                        mimeType: import("zod").ZodString;
                        sizeBytes: import("zod").ZodNumber;
                        createdByUserId: import("zod").ZodString;
                        createdAt: import("zod").ZodDate;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    timeline: import("zod").ZodArray<import("zod").ZodObject<{
                        kind: import("zod").ZodEnum<["encounter.opened", "encounter.closed", "note.created", "note.signed", "note.version.created", "document.attached"]>;
                        entityId: import("zod").ZodString;
                        happenedAt: import("zod").ZodDate;
                        data: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
                    }, "strip", import("zod").ZodTypeAny, {
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
                }, "strip", import("zod").ZodTypeAny, {
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
};
export type ApiContract = typeof apiContract;
/**
 * ==========================================
 * CONTRACT METADATA
 * ==========================================
 */
/**
 * Endpoint metadata for documentation and testing
 */
export declare const contractEndpoints: readonly [{
    readonly domain: "owners";
    readonly operation: "create";
    readonly method: "POST";
    readonly path: "/owners";
    readonly description: "Create a new owner";
}, {
    readonly domain: "owners";
    readonly operation: "getById";
    readonly method: "GET";
    readonly path: "/owners/:id";
    readonly description: "Get owner by ID";
}, {
    readonly domain: "owners";
    readonly operation: "list";
    readonly method: "GET";
    readonly path: "/owners";
    readonly description: "List owners with pagination";
}, {
    readonly domain: "owners";
    readonly operation: "update";
    readonly method: "PATCH";
    readonly path: "/owners/:id";
    readonly description: "Update owner by ID";
}, {
    readonly domain: "owners";
    readonly operation: "getSummary";
    readonly method: "GET";
    readonly path: "/owners/:id/summary";
    readonly description: "Get owner summary with audit trail and related artifacts";
}, {
    readonly domain: "patients";
    readonly operation: "create";
    readonly method: "POST";
    readonly path: "/patients";
    readonly description: "Create a new patient";
}, {
    readonly domain: "patients";
    readonly operation: "getById";
    readonly method: "GET";
    readonly path: "/patients/:id";
    readonly description: "Get patient by ID";
}, {
    readonly domain: "patients";
    readonly operation: "list";
    readonly method: "GET";
    readonly path: "/patients";
    readonly description: "List patients with pagination and filters";
}, {
    readonly domain: "patients";
    readonly operation: "update";
    readonly method: "PATCH";
    readonly path: "/patients/:id";
    readonly description: "Update patient by ID";
}, {
    readonly domain: "patients";
    readonly operation: "getSummary";
    readonly method: "GET";
    readonly path: "/patients/:id/summary";
    readonly description: "Get patient summary with highlighted alerts and audit trail";
}, {
    readonly domain: "encounters";
    readonly operation: "create";
    readonly method: "POST";
    readonly path: "/encounters";
    readonly description: "Create a new encounter";
}, {
    readonly domain: "encounters";
    readonly operation: "getById";
    readonly method: "GET";
    readonly path: "/encounters/:id";
    readonly description: "Get encounter by ID";
}, {
    readonly domain: "encounters";
    readonly operation: "list";
    readonly method: "GET";
    readonly path: "/encounters";
    readonly description: "List encounters with pagination";
}, {
    readonly domain: "encounters";
    readonly operation: "close";
    readonly method: "POST";
    readonly path: "/encounters/:id/close";
    readonly description: "Close an open encounter";
}, {
    readonly domain: "encounters";
    readonly operation: "getTimeline";
    readonly method: "GET";
    readonly path: "/encounters/:id/timeline";
    readonly description: "Get encounter timeline with notes and documents";
}];
export type ContractEndpoints = typeof contractEndpoints;
//# sourceMappingURL=index.d.ts.map