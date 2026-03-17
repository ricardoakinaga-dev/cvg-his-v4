import { z } from 'zod';
import { type AlertDto, type PatientCreateDto, type PatientUpdateDto } from '@cvg-his/domain';
export declare const createPatientBodySchema: z.ZodObject<{
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
    ownerId: string;
    name: string;
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
    ownerId: string;
    name: string;
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
export declare const updatePatientBodySchema: z.ZodEffects<z.ZodObject<{
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
    ownerId?: string | undefined;
    name?: string | undefined;
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
    ownerId?: string | undefined;
    name?: string | undefined;
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
    ownerId?: string | undefined;
    name?: string | undefined;
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
    ownerId?: string | undefined;
    name?: string | undefined;
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
export declare const patientIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listPatientsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    ownerId: z.ZodOptional<z.ZodString>;
    species: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    ownerId?: string | undefined;
    species?: string | undefined;
    q?: string | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    ownerId?: string | undefined;
    species?: string | undefined;
    q?: string | undefined;
}>;
export type PatientRecord = {
    id: string;
    accountId: string;
    unitId: string | null;
    ownerId: string;
    name: string;
    species: string;
    breed: string | null;
    sex: string | null;
    birthDate: string | null;
    weightKg: string | null;
    microchip: string | null;
    alerts: AlertDto;
    createdAt: Date;
    updatedAt: Date;
};
export type CreatePatientBody = PatientCreateDto;
export type UpdatePatientBody = PatientUpdateDto;
export type PatientIdParams = z.infer<typeof patientIdParamSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
//# sourceMappingURL=types.d.ts.map