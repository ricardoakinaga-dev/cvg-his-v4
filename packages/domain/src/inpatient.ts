import { z } from 'zod';

import { trim } from './common.js';

const optionalTextSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = trim(value);
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1, 'Field cannot be empty').optional());

const requiredReasonSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'reason is required'));

export const InpatientStayStatusSchema = z.enum(['active', 'discharged', 'transferred']);

export const InpatientAdmitSchema = z
  .object({
    patientId: z.string().uuid('patientId must be a valid UUID'),
    wardId: z.string().uuid('wardId must be a valid UUID'),
    bedId: z.string().uuid('bedId must be a valid UUID'),
    encounterId: z.string().uuid('encounterId must be a valid UUID').optional(),
    chiefComplaint: optionalTextSchema,
    reason: optionalTextSchema,
    planSummary: optionalTextSchema
  })
  .refine((payload) => Boolean(payload.reason || payload.chiefComplaint), {
    message: 'reason or chiefComplaint is required for admission'
  });

export const InpatientTransferSchema = z.object({
  toWardId: z.string().uuid('toWardId must be a valid UUID'),
  toBedId: z.string().uuid('toBedId must be a valid UUID'),
  reason: optionalTextSchema
});

export const InpatientDischargeSchema = z.object({
  reason: requiredReasonSchema
});

export type InpatientStayStatus = z.infer<typeof InpatientStayStatusSchema>;
export type InpatientAdmitDto = z.infer<typeof InpatientAdmitSchema>;
export type InpatientTransferDto = z.infer<typeof InpatientTransferSchema>;
export type InpatientDischargeDto = z.infer<typeof InpatientDischargeSchema>;
