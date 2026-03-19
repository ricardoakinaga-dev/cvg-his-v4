import {
  createServiceBodySchema,
  listServicesQuerySchema,
  serviceIdParamSchema,
  serviceResponseSchema,
  updateServiceBodySchema,
  type CreateServiceBody,
  type ListServicesQuery,
  type ServiceIdParam,
  type ServiceResponse,
  type UpdateServiceBody
} from '@cvg-his/contracts';

export {
  createServiceBodySchema,
  listServicesQuerySchema,
  serviceIdParamSchema,
  serviceResponseSchema,
  updateServiceBodySchema
};

export type { CreateServiceBody, ListServicesQuery, ServiceIdParam, ServiceResponse, UpdateServiceBody };

export type ServiceRecord = {
  id: string;
  accountId: string;
  name: string;
  code: string | null;
  description: string | null;
  basePrice: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
