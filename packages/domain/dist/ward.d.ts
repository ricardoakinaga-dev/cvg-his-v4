import { z } from 'zod';
export declare const WardCreateSchema: z.ZodObject<{
    name: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    code: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    code?: string | undefined;
    isActive?: boolean | undefined;
}, {
    name: string;
    code?: unknown;
    isActive?: boolean | undefined;
}>;
export declare const WardUpdateSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    code: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | null | undefined, unknown>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code?: string | null | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
}, {
    code?: unknown;
    name?: string | undefined;
    isActive?: boolean | undefined;
}>, {
    code?: string | null | undefined;
    name?: string | undefined;
    isActive?: boolean | undefined;
}, {
    code?: unknown;
    name?: string | undefined;
    isActive?: boolean | undefined;
}>;
export declare const WardReadSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    name: z.ZodString;
    code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodBoolean;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    code?: string | null | undefined;
}, {
    name: string;
    isActive: boolean;
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    code?: string | null | undefined;
}>;
export type WardCreateDto = z.infer<typeof WardCreateSchema>;
export type WardUpdateDto = z.infer<typeof WardUpdateSchema>;
export type WardReadDto = z.infer<typeof WardReadSchema>;
//# sourceMappingURL=ward.d.ts.map