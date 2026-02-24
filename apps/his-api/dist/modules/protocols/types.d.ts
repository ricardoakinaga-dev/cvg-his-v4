import { z } from 'zod';
import { ProtocolStatusSchema } from '@cvg-his/domain';
export declare const createProtocolBodySchema: z.ZodObject<{
    title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    slug: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    domain: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    specialty: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    domain?: string | undefined;
    specialty?: string | undefined;
}, {
    title: string;
    slug: string;
    domain?: unknown;
    specialty?: unknown;
}>;
export declare const updateProtocolBodySchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    domain: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    specialty: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    status: z.ZodOptional<z.ZodEnum<["draft", "published"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "published" | undefined;
    title?: string | undefined;
    domain?: string | undefined;
    specialty?: string | undefined;
}, {
    status?: "draft" | "published" | undefined;
    title?: unknown;
    domain?: unknown;
    specialty?: unknown;
}>, {
    status?: "draft" | "published" | undefined;
    title?: string | undefined;
    domain?: string | undefined;
    specialty?: string | undefined;
}, {
    status?: "draft" | "published" | undefined;
    title?: unknown;
    domain?: unknown;
    specialty?: unknown;
}>;
export declare const protocolIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listProtocolsQuerySchema: z.ZodObject<{
    q: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    status: z.ZodOptional<z.ZodEnum<["draft", "published"]>>;
    specialty: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    domain: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "draft" | "published" | undefined;
    domain?: string | undefined;
    specialty?: string | undefined;
    q?: string | undefined;
}, {
    status?: "draft" | "published" | undefined;
    domain?: unknown;
    specialty?: unknown;
    q?: unknown;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type ProtocolStatus = z.infer<typeof ProtocolStatusSchema>;
export type ProtocolRecord = {
    id: string;
    accountId: string;
    title: string;
    slug: string;
    domain: string | null;
    specialty: string | null;
    status: ProtocolStatus;
    currentPublishedVersionId: string | null;
    createdByUserId: string;
    updatedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
};
export type CreateProtocolBody = z.infer<typeof createProtocolBodySchema>;
export type UpdateProtocolBody = z.infer<typeof updateProtocolBodySchema>;
export type ProtocolIdParams = z.infer<typeof protocolIdParamSchema>;
export type ListProtocolsQuery = z.infer<typeof listProtocolsQuerySchema>;
//# sourceMappingURL=types.d.ts.map