import { z } from 'zod';
export declare const AlertSchema: z.ZodObject<{
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
export type AlertDto = z.infer<typeof AlertSchema>;
//# sourceMappingURL=alerts.d.ts.map