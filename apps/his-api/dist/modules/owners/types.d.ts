import { z } from 'zod';
export declare const createOwnerBodySchema: z.ZodObject<{
    fullName: z.ZodString;
    document: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phoneMain: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phoneAlt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
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
export declare const updateOwnerBodySchema: z.ZodEffects<z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    document: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    phoneMain: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    phoneAlt: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    addressJson: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, "strip", z.ZodTypeAny, {
    document?: string | null | undefined;
    fullName?: string | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}, {
    document?: string | null | undefined;
    fullName?: string | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}>, {
    document?: string | null | undefined;
    fullName?: string | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}, {
    document?: string | null | undefined;
    fullName?: string | undefined;
    email?: string | null | undefined;
    phoneMain?: string | null | undefined;
    phoneAlt?: string | null | undefined;
    addressJson?: Record<string, unknown> | null | undefined;
}>;
export declare const ownerIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listOwnersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
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
export type OwnerRecord = {
    id: string;
    accountId: string;
    unitId: string | null;
    fullName: string;
    document: string | null;
    phoneMain: string | null;
    phoneAlt: string | null;
    email: string | null;
    addressJson: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};
export type CreateOwnerBody = z.infer<typeof createOwnerBodySchema>;
export type UpdateOwnerBody = z.infer<typeof updateOwnerBodySchema>;
export type OwnerIdParams = z.infer<typeof ownerIdParamSchema>;
export type ListOwnersQuery = z.infer<typeof listOwnersQuerySchema>;
//# sourceMappingURL=types.d.ts.map