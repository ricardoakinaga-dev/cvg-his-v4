import { z } from 'zod';
export declare const EncounterStatusSchema: z.ZodEnum<["open", "closed"]>;
export declare const EncounterCreateSchema: z.ZodObject<{
    patientId: z.ZodString;
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    reason?: string | undefined;
}, {
    patientId: string;
    reason?: unknown;
}>;
export declare const EncounterCloseSchema: z.ZodObject<{
    reason: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: unknown;
}>;
export type EncounterStatus = z.infer<typeof EncounterStatusSchema>;
export type EncounterCreateDto = z.infer<typeof EncounterCreateSchema>;
export type EncounterCloseDto = z.infer<typeof EncounterCloseSchema>;
//# sourceMappingURL=encounter.d.ts.map