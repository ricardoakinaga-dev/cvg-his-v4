import {
  createAvailabilityBodySchema,
  updateAvailabilityBodySchema,
  availabilityIdParamSchema,
  availabilityResponseSchema,
  listAvailabilityQuerySchema,
  createTypeConfigBodySchema,
  updateTypeConfigBodySchema,
  typeConfigIdParamSchema,
  typeConfigResponseSchema,
  listTypeConfigsQuerySchema,
  type CreateAvailabilityBody,
  type UpdateAvailabilityBody,
  type AvailabilityIdParam,
  type AvailabilityResponse,
  type ListAvailabilityQuery,
  type CreateTypeConfigBody,
  type UpdateTypeConfigBody,
  type TypeConfigIdParam,
  type TypeConfigResponse,
  type ListTypeConfigsQuery
} from '@cvg-his/contracts';

export {
  createAvailabilityBodySchema,
  updateAvailabilityBodySchema,
  availabilityIdParamSchema,
  availabilityResponseSchema,
  listAvailabilityQuerySchema,
  createTypeConfigBodySchema,
  updateTypeConfigBodySchema,
  typeConfigIdParamSchema,
  typeConfigResponseSchema,
  listTypeConfigsQuerySchema
};

export type {
  CreateAvailabilityBody,
  UpdateAvailabilityBody,
  AvailabilityIdParam,
  AvailabilityResponse,
  ListAvailabilityQuery,
  CreateTypeConfigBody,
  UpdateTypeConfigBody,
  TypeConfigIdParam,
  TypeConfigResponse,
  ListTypeConfigsQuery
};

export type AvailabilityRecord = {
  id: string;
  accountId: string;
  professionalUserId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  notes: string | null;
};

export type TypeConfigRecord = {
  id: string;
  accountId: string;
  code: string;
  name: string;
  description: string | null;
  defaultDurationMinutes: number;
  color: string | null;
  active: boolean;
};
