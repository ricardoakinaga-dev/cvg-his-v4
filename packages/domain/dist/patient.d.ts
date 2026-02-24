import { z } from 'zod';
export declare const PatientCreateSchema: z.ZodObject<{
    ownerId: z.ZodString;
    name: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    species: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    breed: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    sex: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    birthDate: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    weightKg: z.ZodOptional<z.ZodNumber>;
    microchip: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    alerts: z.ZodOptional<z.ZodObject<{
        aggressive: z.ZodOptional<z.ZodBoolean>;
        allergies: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
        chronic_conditions: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
        notes: z.ZodOptional<z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, unknown>>;
    }, "strict", z.ZodTypeAny, {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    }, {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    ownerId: string;
    species: string;
    breed?: string | undefined;
    sex?: string | undefined;
    birthDate?: string | undefined;
    weightKg?: number | undefined;
    microchip?: string | undefined;
    alerts?: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    } | undefined;
}, {
    name: string;
    ownerId: string;
    species: string;
    breed?: string | undefined;
    sex?: string | undefined;
    birthDate?: string | undefined;
    weightKg?: number | undefined;
    microchip?: string | undefined;
    alerts?: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: unknown;
    } | undefined;
}>;
export declare const PatientUpdateSchema: z.ZodEffects<z.ZodObject<{
    ownerId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    species: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    breed: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>>;
    sex: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>>;
    birthDate: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>>;
    weightKg: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    microchip: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>>;
    alerts: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        aggressive: z.ZodOptional<z.ZodBoolean>;
        allergies: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
        chronic_conditions: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
        notes: z.ZodOptional<z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, unknown>>;
    }, "strict", z.ZodTypeAny, {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    }, {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: unknown;
    }>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    ownerId?: string | undefined;
    species?: string | undefined;
    breed?: string | undefined;
    sex?: string | undefined;
    birthDate?: string | undefined;
    weightKg?: number | undefined;
    microchip?: string | undefined;
    alerts?: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    } | undefined;
}, {
    name?: string | undefined;
    ownerId?: string | undefined;
    species?: string | undefined;
    breed?: string | undefined;
    sex?: string | undefined;
    birthDate?: string | undefined;
    weightKg?: number | undefined;
    microchip?: string | undefined;
    alerts?: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: unknown;
    } | undefined;
}>, {
    name?: string | undefined;
    ownerId?: string | undefined;
    species?: string | undefined;
    breed?: string | undefined;
    sex?: string | undefined;
    birthDate?: string | undefined;
    weightKg?: number | undefined;
    microchip?: string | undefined;
    alerts?: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    } | undefined;
}, {
    name?: string | undefined;
    ownerId?: string | undefined;
    species?: string | undefined;
    breed?: string | undefined;
    sex?: string | undefined;
    birthDate?: string | undefined;
    weightKg?: number | undefined;
    microchip?: string | undefined;
    alerts?: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: unknown;
    } | undefined;
}>;
export declare const PatientReadSchema: z.ZodObject<{
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
        allergies: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
        anesthesia_risk: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
        chronic_conditions: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
        notes: z.ZodOptional<z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, unknown>>;
    }, "strict", z.ZodTypeAny, {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    }, {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: unknown;
    }>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    species: string;
    alerts: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: string | null | undefined;
    };
    unitId?: string | null | undefined;
    breed?: string | null | undefined;
    sex?: string | null | undefined;
    birthDate?: string | null | undefined;
    weightKg?: string | number | null | undefined;
    microchip?: string | null | undefined;
}, {
    name: string;
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    species: string;
    alerts: {
        aggressive?: boolean | undefined;
        allergies?: string[] | undefined;
        anesthesia_risk?: "low" | "medium" | "high" | null | undefined;
        chronic_conditions?: string[] | undefined;
        notes?: unknown;
    };
    unitId?: string | null | undefined;
    breed?: string | null | undefined;
    sex?: string | null | undefined;
    birthDate?: string | null | undefined;
    weightKg?: string | number | null | undefined;
    microchip?: string | null | undefined;
}>;
export type PatientCreateDto = z.infer<typeof PatientCreateSchema>;
export type PatientUpdateDto = z.infer<typeof PatientUpdateSchema>;
export type PatientReadDto = z.infer<typeof PatientReadSchema>;
//# sourceMappingURL=patient.d.ts.map