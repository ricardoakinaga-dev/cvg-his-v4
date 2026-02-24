import { z } from 'zod';
export type ProductRecord = {
    id: string;
    accountId: string;
    sku: string;
    name: string;
    category: string | null;
    uom: string | null;
    cost: string;
    price: string;
    isControlled: boolean;
    trackLot: boolean;
    trackExpiry: boolean;
    minStock: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
};
export declare const productIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listProductsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    q: z.ZodOptional<z.ZodString>;
    active: z.ZodOptional<z.ZodBoolean>;
    category: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    active?: boolean | undefined;
    q?: string | undefined;
    category?: string | undefined;
}, {
    active?: boolean | undefined;
    q?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    category?: string | undefined;
}>;
export declare const productCreateSchema: z.ZodObject<{
    sku: z.ZodString;
    name: z.ZodString;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    uom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cost: z.ZodDefault<z.ZodNumber>;
    price: z.ZodDefault<z.ZodNumber>;
    isControlled: z.ZodDefault<z.ZodBoolean>;
    trackLot: z.ZodDefault<z.ZodBoolean>;
    trackExpiry: z.ZodDefault<z.ZodBoolean>;
    minStock: z.ZodDefault<z.ZodNumber>;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    active: boolean;
    sku: string;
    cost: number;
    price: number;
    isControlled: boolean;
    trackLot: boolean;
    trackExpiry: boolean;
    minStock: number;
    category?: string | null | undefined;
    uom?: string | null | undefined;
}, {
    name: string;
    sku: string;
    active?: boolean | undefined;
    category?: string | null | undefined;
    uom?: string | null | undefined;
    cost?: number | undefined;
    price?: number | undefined;
    isControlled?: boolean | undefined;
    trackLot?: boolean | undefined;
    trackExpiry?: boolean | undefined;
    minStock?: number | undefined;
}>;
export declare const productUpdateSchema: z.ZodObject<{
    sku: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    uom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cost: z.ZodOptional<z.ZodNumber>;
    price: z.ZodOptional<z.ZodNumber>;
    isControlled: z.ZodOptional<z.ZodBoolean>;
    trackLot: z.ZodOptional<z.ZodBoolean>;
    trackExpiry: z.ZodOptional<z.ZodBoolean>;
    minStock: z.ZodOptional<z.ZodNumber>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    active?: boolean | undefined;
    category?: string | null | undefined;
    sku?: string | undefined;
    uom?: string | null | undefined;
    cost?: number | undefined;
    price?: number | undefined;
    isControlled?: boolean | undefined;
    trackLot?: boolean | undefined;
    trackExpiry?: boolean | undefined;
    minStock?: number | undefined;
}, {
    name?: string | undefined;
    active?: boolean | undefined;
    category?: string | null | undefined;
    sku?: string | undefined;
    uom?: string | null | undefined;
    cost?: number | undefined;
    price?: number | undefined;
    isControlled?: boolean | undefined;
    trackLot?: boolean | undefined;
    trackExpiry?: boolean | undefined;
    minStock?: number | undefined;
}>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
//# sourceMappingURL=types.d.ts.map