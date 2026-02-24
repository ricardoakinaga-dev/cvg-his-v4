import { z } from 'zod';
/**
 * ==========================================
 * ALERT SCHEMA (embedded in patient)
 * ==========================================
 */
export declare const alertSchema: z.ZodObject<{
    aggressive: z.ZodOptional<z.ZodBoolean>;
    allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
    chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
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
/**
 * ==========================================
 * REQUEST SCHEMAS
 * ==========================================
 */
/**
 * POST /patients - Create patient request body
 */
export declare const createPatientBodySchema: z.ZodObject<{
    ownerId: z.ZodString;
    name: z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>;
    species: z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>;
    breed: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
    sex: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
    birthDate: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
    weightKg: z.ZodOptional<z.ZodNumber>;
    microchip: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
    alerts: z.ZodOptional<z.ZodObject<{
        aggressive: z.ZodOptional<z.ZodBoolean>;
        allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
        chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
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
}, "strip", z.ZodTypeAny, {
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
/**
 * PATCH /patients/:id - Update patient request body
 */
export declare const updatePatientBodySchema: z.ZodEffects<z.ZodObject<{
    ownerId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
    species: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
    breed: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
    sex: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
    birthDate: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
    weightKg: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    microchip: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
    alerts: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        aggressive: z.ZodOptional<z.ZodBoolean>;
        allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
        chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
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
}, "strip", z.ZodTypeAny, {
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
/**
 * GET /patients/:id - Get patient by ID params
 */
export declare const patientIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/**
 * GET /patients - List patients query
 */
export declare const listPatientsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
} & {
    ownerId: z.ZodOptional<z.ZodString>;
    species: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
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
/**
 * ==========================================
 * RESPONSE SCHEMAS
 * ==========================================
 */
/**
 * Patient response schema (single patient)
 */
export declare const patientResponseSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ownerId: z.ZodString;
    name: z.ZodString;
    species: z.ZodString;
    breed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sex: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    birthDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    weightKg: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    microchip: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    alerts: z.ZodObject<{
        aggressive: z.ZodOptional<z.ZodBoolean>;
        allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
        chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
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
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
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
/**
 * Paginated patients response
 */
export declare const listPatientsResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        accountId: z.ZodString;
        unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        ownerId: z.ZodString;
        name: z.ZodString;
        species: z.ZodString;
        breed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sex: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        weightKg: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
        microchip: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        alerts: z.ZodObject<{
            aggressive: z.ZodOptional<z.ZodBoolean>;
            allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
            chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
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
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
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
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
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
export declare const patientSummaryResponseSchema: z.ZodObject<{
    patient: z.ZodObject<{
        id: z.ZodString;
        ownerId: z.ZodString;
        name: z.ZodString;
        species: z.ZodString;
        microchip: z.ZodNullable<z.ZodString>;
        alerts: z.ZodObject<{
            aggressive: z.ZodOptional<z.ZodBoolean>;
            allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
            chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
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
        highlightedAlerts: z.ZodObject<{
            aggressive: z.ZodBoolean;
            allergiesCount: z.ZodNumber;
            anesthesiaRisk: z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>;
            chronicConditionsCount: z.ZodNumber;
            hasNotes: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
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
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
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
/**
 * ==========================================
 * TYPES
 * ==========================================
 */
export type AlertDto = z.infer<typeof alertSchema>;
export type CreatePatientBody = z.infer<typeof createPatientBodySchema>;
export type UpdatePatientBody = z.infer<typeof updatePatientBodySchema>;
export type PatientIdParam = z.infer<typeof patientIdParamSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
export type PatientResponse = z.infer<typeof patientResponseSchema>;
export type ListPatientsResponse = z.infer<typeof listPatientsResponseSchema>;
export type PatientSummaryResponse = z.infer<typeof patientSummaryResponseSchema>;
/**
 * ==========================================
 * CONTRACT DEFINITION
 * ==========================================
 */
export declare const patientsContract: {
    readonly create: {
        readonly method: "POST";
        readonly path: "/patients";
        readonly body: z.ZodObject<{
            ownerId: z.ZodString;
            name: z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>;
            species: z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>;
            breed: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
            sex: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
            birthDate: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
            weightKg: z.ZodOptional<z.ZodNumber>;
            microchip: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
            alerts: z.ZodOptional<z.ZodObject<{
                aggressive: z.ZodOptional<z.ZodBoolean>;
                allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
                chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
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
        }, "strip", z.ZodTypeAny, {
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
            readonly 201: z.ZodObject<{
                id: z.ZodString;
                accountId: z.ZodString;
                unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                ownerId: z.ZodString;
                name: z.ZodString;
                species: z.ZodString;
                breed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                sex: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                birthDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                weightKg: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
                microchip: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                alerts: z.ZodObject<{
                    aggressive: z.ZodOptional<z.ZodBoolean>;
                    allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
                    chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
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
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
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
                ownerId: z.ZodString;
                name: z.ZodString;
                species: z.ZodString;
                breed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                sex: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                birthDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                weightKg: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
                microchip: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                alerts: z.ZodObject<{
                    aggressive: z.ZodOptional<z.ZodBoolean>;
                    allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
                    chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
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
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
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
        readonly query: z.ZodObject<{
            page: z.ZodDefault<z.ZodNumber>;
            pageSize: z.ZodDefault<z.ZodNumber>;
        } & {
            ownerId: z.ZodOptional<z.ZodString>;
            species: z.ZodOptional<z.ZodString>;
            q: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
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
            readonly 200: z.ZodObject<{
                data: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    accountId: z.ZodString;
                    unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    ownerId: z.ZodString;
                    name: z.ZodString;
                    species: z.ZodString;
                    breed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    sex: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    birthDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    weightKg: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
                    microchip: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    alerts: z.ZodObject<{
                        aggressive: z.ZodOptional<z.ZodBoolean>;
                        allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
                        chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
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
                    createdAt: z.ZodDate;
                    updatedAt: z.ZodDate;
                }, "strip", z.ZodTypeAny, {
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
                page: z.ZodNumber;
                pageSize: z.ZodNumber;
                total: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
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
        readonly params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        readonly body: z.ZodEffects<z.ZodObject<{
            ownerId: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
            species: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>;
            breed: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
            sex: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
            birthDate: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
            weightKg: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
            microchip: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, unknown, string>, z.ZodString>>>;
            alerts: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                aggressive: z.ZodOptional<z.ZodBoolean>;
                allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
                chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, "strip", z.ZodTypeAny, {
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
        }, "strip", z.ZodTypeAny, {
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
            readonly 200: z.ZodObject<{
                id: z.ZodString;
                accountId: z.ZodString;
                unitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                ownerId: z.ZodString;
                name: z.ZodString;
                species: z.ZodString;
                breed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                sex: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                birthDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                weightKg: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
                microchip: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                alerts: z.ZodObject<{
                    aggressive: z.ZodOptional<z.ZodBoolean>;
                    allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
                    chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, "strip", z.ZodTypeAny, {
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
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
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
        readonly params: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        readonly responses: {
            readonly 200: z.ZodObject<{
                patient: z.ZodObject<{
                    id: z.ZodString;
                    ownerId: z.ZodString;
                    name: z.ZodString;
                    species: z.ZodString;
                    microchip: z.ZodNullable<z.ZodString>;
                    alerts: z.ZodObject<{
                        aggressive: z.ZodOptional<z.ZodBoolean>;
                        allergies: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
                        chronic_conditions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    }, "strip", z.ZodTypeAny, {
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
                    highlightedAlerts: z.ZodObject<{
                        aggressive: z.ZodBoolean;
                        allergiesCount: z.ZodNumber;
                        anesthesiaRisk: z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>;
                        chronicConditionsCount: z.ZodNumber;
                        hasNotes: z.ZodBoolean;
                    }, "strip", z.ZodTypeAny, {
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
                    updatedAt: z.ZodString;
                }, "strip", z.ZodTypeAny, {
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
export type PatientsContract = typeof patientsContract;
//# sourceMappingURL=patients.d.ts.map