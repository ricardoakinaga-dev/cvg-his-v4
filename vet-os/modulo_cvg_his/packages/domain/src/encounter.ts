import { z } from 'zod';

import { trim } from './common.js';

const optionalReasonSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = trim(value);
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1, 'reason cannot be empty').optional());

export const EncounterStatusSchema = z.enum(['open', 'closed']);

export const EncounterCreateSchema = z.object({
  patientId: z.string().uuid('patientId must be a valid UUID'),
  reason: optionalReasonSchema
});

export const EncounterCloseSchema = z.object({
  reason: optionalReasonSchema
});

export type EncounterStatus = z.infer<typeof EncounterStatusSchema>;
export type EncounterCreateDto = z.infer<typeof EncounterCreateSchema>;
export type EncounterCloseDto = z.infer<typeof EncounterCloseSchema>;
