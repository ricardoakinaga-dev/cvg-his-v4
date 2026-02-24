import { z } from 'zod';
export declare const OwnerCreateSchema: z.ZodObject<{
    fullName: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    document: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    email: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    phone: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    document?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
}, {
    fullName: string;
    document?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
}>;
export declare const OwnerUpdateSchema: z.ZodEffects<z.ZodObject<{
    fullName: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    document: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    fullName?: string | undefined;
    document?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
}, {
    fullName?: string | undefined;
    document?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
}>, {
    fullName?: string | undefined;
    document?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
}, {
    fullName?: string | undefined;
    document?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
}>;
export declare const OwnerReadSchema: z.ZodObject<{
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
    unitId?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}, {
    id: string;
    accountId: string;
    createdAt: Date;
    updatedAt: Date;
    fullName: string;
    document?: string | null | undefined;
    email?: string | null | undefined;
    unitId?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}>;
export type OwnerCreateDto = z.infer<typeof OwnerCreateSchema>;
export type OwnerUpdateDto = z.infer<typeof OwnerUpdateSchema>;
export type OwnerReadDto = z.infer<typeof OwnerReadSchema>;
//# sourceMappingURL=owner.d.ts.map