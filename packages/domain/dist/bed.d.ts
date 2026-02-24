import { z } from 'zod';
export declare const BedCreateSchema: z.ZodObject<{
    wardId: z.ZodString;
    name: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    code: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    wardId: string;
    name: string;
    code?: string | undefined;
    isActive?: boolean | undefined;
}, {
    wardId: string;
    name: string;
    code?: unknown;
    isActive?: boolean | undefined;
}>;
export declare const BedUpdateSchema: z.ZodEffects<z.ZodObject<{
    wardId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    code: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code?: string | null | undefined;
    wardId?: string | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
}, {
    code?: unknown;
    wardId?: string | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
}>, {
    code?: string | null | undefined;
    wardId?: string | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
}, {
    code?: unknown;
    wardId?: string | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
}>;
export declare const BedReadSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    wardId: z.ZodString;
    name: z.ZodString;
    code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodBoolean;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    wardId: string;
    name: string;
    isActive: boolean;
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    code?: string | null | undefined;
}, {
    wardId: string;
    name: string;
    isActive: boolean;
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    code?: string | null | undefined;
}>;
export type BedCreateDto = z.infer<typeof BedCreateSchema>;
export type BedUpdateDto = z.infer<typeof BedUpdateSchema>;
export type BedReadDto = z.infer<typeof BedReadSchema>;
//# sourceMappingURL=bed.d.ts.map