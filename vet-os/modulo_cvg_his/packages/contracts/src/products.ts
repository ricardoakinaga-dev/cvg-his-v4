import { z } from 'zod';

import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  trim,
  uuidSchema
} from './common.js';

const nameSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(2, 'name must have at least 2 characters').max(255));

const codeSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'code cannot be empty').max(64))
  .optional()
  .nullable();

const descriptionSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'description cannot be empty').max(2000))
  .optional()
  .nullable();

const basePriceSchema = z.coerce.number().nonnegative().max(999999999.99);

export const createProductBodySchema = z.object({
  name: nameSchema,
  code: codeSchema,
  description: descriptionSchema,
  basePrice: basePriceSchema,
  active: z.boolean().optional()
});

export const updateProductBodySchema = createProductBodySchema
  .partial()
  .refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), 'At least one field is required for PATCH');

export const productIdParamSchema = idParamSchema;

export const listProductsQuerySchema = paginationQuerySchema
  .merge(searchQuerySchema)
  .merge(
    z.object({
      active: z.coerce.boolean().optional()
    })
  );

export const productResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  name: z.string(),
  code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  basePrice: z.coerce.number(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const listProductsResponseSchema = createPaginatedResponseSchema(productResponseSchema);

export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ListProductsResponse = z.infer<typeof listProductsResponseSchema>;

export const productsContract = {
  create: {
    method: 'POST' as const,
    path: '/products',
    body: createProductBodySchema,
    responses: { 201: productResponseSchema }
  },
  getById: {
    method: 'GET' as const,
    path: '/products/:id',
    params: productIdParamSchema,
    responses: { 200: productResponseSchema }
  },
  list: {
    method: 'GET' as const,
    path: '/products',
    query: listProductsQuerySchema,
    responses: { 200: listProductsResponseSchema }
  },
  update: {
    method: 'PATCH' as const,
    path: '/products/:id',
    params: productIdParamSchema,
    body: updateProductBodySchema,
    responses: { 200: productResponseSchema }
  }
} as const;

export type ProductsContract = typeof productsContract;
