import { z } from 'zod';

import { trim } from './common.js';

const shiftDateSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'shiftDate must be YYYY-MM-DD'));

const optionalNotesSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = trim(value);
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1, 'notes cannot be empty').optional());

const jsonListItemSchema = z.union([
  z
    .string()
    .transform(trim)
    .pipe(z.string().min(1, 'list string item cannot be empty')),
  z.record(z.unknown())
]);

const escalationSchema = z
  .object({
    ifWorse: z
      .string()
      .transform(trim)
      .pipe(z.string().min(1, 'ifWorse cannot be empty'))
      .optional()
  })
  .catchall(z.unknown())
  .refine(
    (value) => typeof value.ifWorse === 'string' || Object.keys(value).length > 0,
    'escalation_json must include ifWorse or equivalent escalation structure'
  );

export const ShiftPeriodSchema = z.enum(['day', 'night', 'custom']);

export const HandoverDraftItemSchema = z
  .object({
    stayId: z.string().uuid('stayId must be a valid UUID'),
    patient_snapshot_json: z.record(z.unknown()).optional(),
    problems_json: z.array(jsonListItemSchema).default([]),
    plan_json: z.array(jsonListItemSchema).min(1, 'plan_json must contain at least one item'),
    critical_meds_json: z.array(jsonListItemSchema).default([]),
    alerts_json: z.record(z.unknown()).default({}),
    pending_json: z.array(jsonListItemSchema).default([]),
    escalation_json: escalationSchema,
    notes: optionalNotesSchema
  })
  .refine((item) => item.problems_json.length > 0 || Boolean(item.notes), {
    message: 'problems_json must have at least one item or notes must be provided'
  });

export const HandoverDraftSchema = z.object({
  wardId: z.string().uuid('wardId must be a valid UUID'),
  shiftDate: shiftDateSchema,
  shiftPeriod: ShiftPeriodSchema,
  items: z.array(HandoverDraftItemSchema).min(1, 'items must contain at least one handover item')
});

export const HandoverPublishSchema = z.object({
  handoverId: z.string().uuid('handoverId must be a valid UUID')
});

export type ShiftPeriod = z.infer<typeof ShiftPeriodSchema>;
export type HandoverDraftItemDto = z.infer<typeof HandoverDraftItemSchema>;
export type HandoverDraftDto = z.infer<typeof HandoverDraftSchema>;
export type HandoverPublishDto = z.infer<typeof HandoverPublishSchema>;
