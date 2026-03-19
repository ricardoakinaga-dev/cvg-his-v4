import { z } from 'zod';

import { trim } from './common.js';

const isoDateTimeSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().datetime({ offset: true, message: 'datetime must be ISO-8601 with timezone offset' }));

const optionalTextSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = trim(value);
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1, 'Field cannot be empty').optional());

const requiredTextSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'Field is required'));

const optionalIntSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  return value;
}, z.coerce.number().int().positive('value must be a positive integer').optional());

const optionalPositiveNumberSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  return value;
}, z.coerce.number().positive('value must be greater than 0').optional());

const fixedTimeSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'time must be HH:mm'));

export const MedicationRouteSchema = z.enum([
  'IV',
  'IM',
  'VO',
  'SC',
  'TOP',
  'INH',
  'SL',
  'RECTAL',
  'OTIC',
  'OPHTHALMIC',
  'OTHER'
]);

export const MedicationFrequencyTypeSchema = z.enum(['q8h', 'q12h', 'sid', 'bid', 'tid', 'custom']);
export const MedicationOrderStatusSchema = z.enum(['active', 'stopped']);
export const MedicationScheduleTypeSchema = z.enum(['interval', 'fixed_times']);
export const MedicationAdministrationStatusSchema = z.enum(['administered', 'refused', 'delayed', 'held']);

// --- Medication Order Create ---

export const MedicationOrderCreateSchemaBase = z.object({
  patientId: z.string().uuid('patientId must be a valid UUID'),
  stayId: z.string().uuid('stayId must be a valid UUID').optional(),
  encounterId: z.string().uuid('encounterId must be a valid UUID').optional(),
  medicationName: requiredTextSchema,
  doseValue: z.coerce.number().positive('doseValue must be greater than 0'),
  doseUnit: requiredTextSchema,
  route: MedicationRouteSchema,
  frequencyType: MedicationFrequencyTypeSchema,
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema.optional(),
  durationValue: optionalIntSchema,
  durationUnit: z.enum(['days', 'hours']).optional()
});

export const MedicationOrderCreateSchema = MedicationOrderCreateSchemaBase.superRefine((payload, ctx) => {
  if (!payload.stayId && !payload.encounterId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'stayId or encounterId is required',
      path: ['stayId']
    });
  }

  if ((payload.durationValue ?? null) === null && payload.durationUnit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'durationValue is required when durationUnit is provided',
      path: ['durationValue']
    });
  }

  if ((payload.durationValue ?? null) !== null && !payload.durationUnit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'durationUnit is required when durationValue is provided',
      path: ['durationUnit']
    });
  }

  if (payload.endAt) {
    const start = new Date(payload.startAt);
    const end = new Date(payload.endAt);

    if (end.getTime() < start.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endAt must be greater than or equal to startAt',
        path: ['endAt']
      });
    }
  }
});

// --- Medication Order Update ---

export const MedicationOrderUpdateSchemaBase = z.object({
  doseValue: optionalPositiveNumberSchema,
  doseUnit: requiredTextSchema.optional(),
  route: MedicationRouteSchema.optional(),
  frequencyType: MedicationFrequencyTypeSchema.optional(),
  endAt: isoDateTimeSchema.optional(),
  durationValue: optionalIntSchema,
  durationUnit: z.enum(['days', 'hours']).optional()
});

export const MedicationOrderUpdateSchema = MedicationOrderUpdateSchemaBase
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided for MedicationOrder update'
  })
  .superRefine((payload, ctx) => {
    if ((payload.durationValue ?? null) === null && payload.durationUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'durationValue is required when durationUnit is provided',
        path: ['durationValue']
      });
    }

    if ((payload.durationValue ?? null) !== null && !payload.durationUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'durationUnit is required when durationValue is provided',
        path: ['durationUnit']
      });
    }
  });

export const MedicationOrderStopSchema = z.object({
  stopReason: requiredTextSchema
});

export const MedicationOrderReadSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  encounterId: z.string().uuid().nullable().optional(),
  stayId: z.string().uuid().nullable().optional(),
  patientId: z.string().uuid(),
  medicationName: z.string(),
  doseValue: z.union([z.string(), z.number()]),
  doseUnit: z.string(),
  route: MedicationRouteSchema,
  frequencyType: MedicationFrequencyTypeSchema,
  durationValue: z.number().int().positive().nullable().optional(),
  durationUnit: z.enum(['days', 'hours']).nullable().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().nullable().optional(),
  status: MedicationOrderStatusSchema,
  stopReason: z.string().nullable().optional(),
  createdByUserId: z.string().uuid(),
  stoppedByUserId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

// --- Medication Schedule Create (CORRIGIDO AQUI) ---

export const MedicationScheduleCreateSchemaBase = z.object({
  orderId: z.string().uuid('orderId must be a valid UUID'),
  scheduleType: MedicationScheduleTypeSchema,
  intervalMinutes: optionalIntSchema,
  times: z.array(fixedTimeSchema).optional(),
  nextDueAt: isoDateTimeSchema.optional()
});

export const MedicationScheduleCreateSchema = MedicationScheduleCreateSchemaBase.superRefine((payload, ctx) => {
  if (payload.scheduleType === 'interval' && !payload.intervalMinutes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'intervalMinutes is required when scheduleType is interval',
      path: ['intervalMinutes']
    });
  }

  if (payload.scheduleType === 'fixed_times' && (!payload.times || payload.times.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'times must contain at least one item when scheduleType is fixed_times',
      path: ['times']
    });
  }
});

// --- Medication Schedule Update ---

export const MedicationScheduleUpdateSchemaBase = z.object({
  scheduleType: MedicationScheduleTypeSchema.optional(),
  intervalMinutes: optionalIntSchema,
  times: z.array(fixedTimeSchema).optional(),
  nextDueAt: isoDateTimeSchema.optional()
});

export const MedicationScheduleUpdateSchema = MedicationScheduleUpdateSchemaBase
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided for MedicationSchedule update'
  })
  .superRefine((payload, ctx) => {
    if (payload.scheduleType === 'interval' && !payload.intervalMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'intervalMinutes is required when scheduleType is interval',
        path: ['intervalMinutes']
      });
    }

    if (payload.scheduleType === 'fixed_times' && (!payload.times || payload.times.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'times must contain at least one item when scheduleType is fixed_times',
        path: ['times']
      });
    }
  });

// --- Medication Administration ---

export const MedicationAdministrationCreateSchemaBase = z.object({
  orderId: z.string().uuid('orderId must be a valid UUID'),
  stayId: z.string().uuid('stayId must be a valid UUID').optional(),
  encounterId: z.string().uuid('encounterId must be a valid UUID').optional(),
  scheduledFor: isoDateTimeSchema,
  effectiveAt: isoDateTimeSchema.optional(),
  delayedUntil: isoDateTimeSchema.optional(),
  status: MedicationAdministrationStatusSchema,
  reason: optionalTextSchema
});

export const MedicationAdministrationCreateSchema = MedicationAdministrationCreateSchemaBase.superRefine((payload, ctx) => {
  if (payload.status === 'administered' && !payload.effectiveAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'effectiveAt is required when status is administered',
      path: ['effectiveAt']
    });
  }

  if (payload.status === 'administered' && payload.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'reason must not be provided when status is administered',
      path: ['reason']
    });
  }

  if (payload.status === 'administered' && payload.delayedUntil) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'delayedUntil must not be provided when status is administered',
      path: ['delayedUntil']
    });
  }

  if ((payload.status === 'refused' || payload.status === 'held' || payload.status === 'delayed') && !payload.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'reason is required when status is refused, delayed or held',
      path: ['reason']
    });
  }

  if ((payload.status === 'refused' || payload.status === 'held') && payload.delayedUntil) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'delayedUntil must only be provided when status is delayed',
      path: ['delayedUntil']
    });
  }

  if ((payload.status === 'refused' || payload.status === 'held' || payload.status === 'delayed') && payload.effectiveAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'effectiveAt must only be provided when status is administered',
      path: ['effectiveAt']
    });
  }

  if (payload.status === 'delayed') {
    if (!payload.delayedUntil) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'delayedUntil is required when status is delayed',
        path: ['delayedUntil']
      });
    } else {
      const scheduledFor = new Date(payload.scheduledFor).getTime();
      const delayedUntil = new Date(payload.delayedUntil).getTime();

      if (delayedUntil <= scheduledFor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'delayedUntil must be greater than scheduledFor',
          path: ['delayedUntil']
        });
      }
    }
  }
});

export type MedicationRoute = z.infer<typeof MedicationRouteSchema>;
export type MedicationFrequencyType = z.infer<typeof MedicationFrequencyTypeSchema>;
export type MedicationOrderStatus = z.infer<typeof MedicationOrderStatusSchema>;
export type MedicationScheduleType = z.infer<typeof MedicationScheduleTypeSchema>;
export type MedicationAdministrationStatus = z.infer<typeof MedicationAdministrationStatusSchema>;
export type MedicationOrderCreateDto = z.infer<typeof MedicationOrderCreateSchema>;
export type MedicationOrderUpdateDto = z.infer<typeof MedicationOrderUpdateSchema>;
export type MedicationOrderStopDto = z.infer<typeof MedicationOrderStopSchema>;
export type MedicationOrderReadDto = z.infer<typeof MedicationOrderReadSchema>;
export type MedicationScheduleCreateDto = z.infer<typeof MedicationScheduleCreateSchema>;
export type MedicationScheduleUpdateDto = z.infer<typeof MedicationScheduleUpdateSchema>;
export type MedicationAdministrationCreateDto = z.infer<typeof MedicationAdministrationCreateSchema>;
