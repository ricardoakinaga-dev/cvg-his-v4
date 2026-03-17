import { z } from 'zod';
import { ProtocolCreateSchema, ProtocolStatusSchema, ProtocolUpdateSchema } from '@cvg-his/domain';

const optionalTrimmedText = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1).max(120).optional());

export const createProtocolBodySchema = ProtocolCreateSchema;
export const updateProtocolBodySchema = ProtocolUpdateSchema;

export const protocolIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listProtocolsQuerySchema = z.object({
  q: optionalTrimmedText,
  status: ProtocolStatusSchema.optional(),
  specialty: optionalTrimmedText,
  domain: optionalTrimmedText,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

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
