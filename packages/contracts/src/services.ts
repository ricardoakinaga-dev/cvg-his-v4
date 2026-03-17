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

export const createServiceBodySchema = z.object({
  name: nameSchema,
  code: codeSchema,
  description: descriptionSchema,
  basePrice: basePriceSchema,
  active: z.boolean().optional()
});

export const updateServiceBodySchema = createServiceBodySchema
  .partial()
  .refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), 'At least one field is required for PATCH');

export const serviceIdParamSchema = idParamSchema;

export const listServicesQuerySchema = paginationQuerySchema
  .merge(searchQuerySchema)
  .merge(
    z.object({
      active: z.coerce.boolean().optional()
    })
  );

export const serviceResponseSchema = z.object({
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

export const listServicesResponseSchema = createPaginatedResponseSchema(serviceResponseSchema);

export type CreateServiceBody = z.infer<typeof createServiceBodySchema>;
export type UpdateServiceBody = z.infer<typeof updateServiceBodySchema>;
export type ServiceIdParam = z.infer<typeof serviceIdParamSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type ServiceResponse = z.infer<typeof serviceResponseSchema>;
export type ListServicesResponse = z.infer<typeof listServicesResponseSchema>;

export const servicesContract = {
  create: {
    method: 'POST' as const,
    path: '/services',
    body: createServiceBodySchema,
    responses: { 201: serviceResponseSchema }
  },
  getById: {
    method: 'GET' as const,
    path: '/services/:id',
    params: serviceIdParamSchema,
    responses: { 200: serviceResponseSchema }
  },
  list: {
    method: 'GET' as const,
    path: '/services',
    query: listServicesQuerySchema,
    responses: { 200: listServicesResponseSchema }
  },
  update: {
    method: 'PATCH' as const,
    path: '/services/:id',
    params: serviceIdParamSchema,
    body: updateServiceBodySchema,
    responses: { 200: serviceResponseSchema }
  }
} as const;

export type ServicesContract = typeof servicesContract;
