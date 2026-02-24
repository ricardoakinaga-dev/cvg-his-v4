import { z } from 'zod';
export type ServiceRecord = {
    id: string;
    accountId: string;
    code: string;
    name: string;
    group: string;
    sector: string;
    basePrice: string;
    durationMinutes: number | null;
    requiresReport: boolean;
    consumesStock: boolean;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
};
export declare const SERVICE_GROUPS: readonly ["consulta", "procedimento", "internacao", "lab", "imagem", "outros"];
export declare const SERVICE_SECTORS: readonly ["clinica", "internacao", "laboratorio", "imagem", "financeiro"];
export declare const serviceIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listServicesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    q: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodEnum<["consulta", "procedimento", "internacao", "lab", "imagem", "outros"]>>;
    sector: z.ZodOptional<z.ZodEnum<["clinica", "internacao", "laboratorio", "imagem", "financeiro"]>>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    active?: boolean | undefined;
    q?: string | undefined;
    group?: "consulta" | "procedimento" | "internacao" | "lab" | "imagem" | "outros" | undefined;
    sector?: "internacao" | "imagem" | "clinica" | "laboratorio" | "financeiro" | undefined;
}, {
    active?: boolean | undefined;
    q?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    group?: "consulta" | "procedimento" | "internacao" | "lab" | "imagem" | "outros" | undefined;
    sector?: "internacao" | "imagem" | "clinica" | "laboratorio" | "financeiro" | undefined;
}>;
export declare const serviceCreateSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    group: z.ZodEnum<["consulta", "procedimento", "internacao", "lab", "imagem", "outros"]>;
    sector: z.ZodEnum<["clinica", "internacao", "laboratorio", "imagem", "financeiro"]>;
    basePrice: z.ZodDefault<z.ZodNumber>;
    durationMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    requiresReport: z.ZodDefault<z.ZodBoolean>;
    consumesStock: z.ZodDefault<z.ZodBoolean>;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    active: boolean;
    group: "consulta" | "procedimento" | "internacao" | "lab" | "imagem" | "outros";
    sector: "internacao" | "imagem" | "clinica" | "laboratorio" | "financeiro";
    basePrice: number;
    requiresReport: boolean;
    consumesStock: boolean;
    durationMinutes?: number | null | undefined;
}, {
    code: string;
    name: string;
    group: "consulta" | "procedimento" | "internacao" | "lab" | "imagem" | "outros";
    sector: "internacao" | "imagem" | "clinica" | "laboratorio" | "financeiro";
    active?: boolean | undefined;
    basePrice?: number | undefined;
    durationMinutes?: number | null | undefined;
    requiresReport?: boolean | undefined;
    consumesStock?: boolean | undefined;
}>;
export declare const serviceUpdateSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodEnum<["consulta", "procedimento", "internacao", "lab", "imagem", "outros"]>>;
    sector: z.ZodOptional<z.ZodEnum<["clinica", "internacao", "laboratorio", "imagem", "financeiro"]>>;
    basePrice: z.ZodOptional<z.ZodNumber>;
    durationMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    requiresReport: z.ZodOptional<z.ZodBoolean>;
    consumesStock: z.ZodOptional<z.ZodBoolean>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name?: string | undefined;
    active?: boolean | undefined;
    group?: "consulta" | "procedimento" | "internacao" | "lab" | "imagem" | "outros" | undefined;
    sector?: "internacao" | "imagem" | "clinica" | "laboratorio" | "financeiro" | undefined;
    basePrice?: number | undefined;
    durationMinutes?: number | null | undefined;
    requiresReport?: boolean | undefined;
    consumesStock?: boolean | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
    active?: boolean | undefined;
    group?: "consulta" | "procedimento" | "internacao" | "lab" | "imagem" | "outros" | undefined;
    sector?: "internacao" | "imagem" | "clinica" | "laboratorio" | "financeiro" | undefined;
    basePrice?: number | undefined;
    durationMinutes?: number | null | undefined;
    requiresReport?: boolean | undefined;
    consumesStock?: boolean | undefined;
}>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;
//# sourceMappingURL=types.d.ts.map