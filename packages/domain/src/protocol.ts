import { z } from 'zod';

import { trim } from './common.js';

const requiredTextSchema = z
  .string()
  .transform(trim)
  .pipe(z.string().min(1, 'Field is required'));

const optionalTextSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = trim(value);
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1, 'Field cannot be empty').optional());

export const ProtocolStatusSchema = z.enum(['draft', 'published']);
export const ProtocolVersionStatusSchema = z.enum(['draft', 'publishing', 'published', 'failed']);
export const ProtocolSeverityLevelSchema = z.enum(['low', 'moderate', 'high', 'critical']);

export const ProtocolStepSchema = z.object({
  order: z.coerce.number().int().min(1, 'order must be >= 1'),
  title: requiredTextSchema,
  instructions: requiredTextSchema,
  notes: optionalTextSchema
});

export const ProtocolEscalationSchema = z.object({
  ifWorse: optionalTextSchema,
  callSupervisor: z.boolean().optional(),
  referTo: optionalTextSchema
});

export const ProtocolSeveritySchema = z.object({
  level: ProtocolSeverityLevelSchema,
  entryCriteria: z.array(requiredTextSchema).default([]),
  steps: z.array(ProtocolStepSchema).default([]),
  contraindications: z.array(requiredTextSchema).default([]),
  escalation: ProtocolEscalationSchema
});

export const ProtocolDosingGuidanceSchema = z.object({
  drug: requiredTextSchema,
  dose: requiredTextSchema,
  route: requiredTextSchema,
  frequency: requiredTextSchema,
  notes: optionalTextSchema
});

export const ProtocolContentSchema = z.object({
  protocolId: z.string().uuid('protocolId must be a valid UUID'),
  title: requiredTextSchema,
  severityLevels: z.array(ProtocolSeveritySchema).default([]),
  dosingGuidance: z.array(ProtocolDosingGuidanceSchema).optional(),
  monitoring: z.array(requiredTextSchema).optional(),
  referencesSummary: optionalTextSchema
});

export const ProtocolContentPublishSchema = ProtocolContentSchema.superRefine((content, ctx) => {
  if (content.severityLevels.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'severityLevels must contain at least one level for publish',
      path: ['severityLevels']
    });
    return;
  }

  for (const [severityIndex, severity] of content.severityLevels.entries()) {
    if (severity.steps.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'each severity level must contain at least one step for publish',
        path: ['severityLevels', severityIndex, 'steps']
      });
    }

    if (!severity.escalation.ifWorse) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'escalation.ifWorse is required for publish',
        path: ['severityLevels', severityIndex, 'escalation', 'ifWorse']
      });
    }

    let previousOrder = 0;
    for (const [stepIndex, step] of severity.steps.entries()) {
      if (step.order <= previousOrder) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'steps order must be incremental',
          path: ['severityLevels', severityIndex, 'steps', stepIndex, 'order']
        });
      }

      previousOrder = step.order;
    }
  }
});

export const ProtocolCreateSchema = z.object({
  title: requiredTextSchema,
  slug: requiredTextSchema,
  domain: optionalTextSchema,
  specialty: optionalTextSchema
});

export const ProtocolUpdateSchema = z
  .object({
    title: optionalTextSchema,
    domain: optionalTextSchema,
    specialty: optionalTextSchema,
    status: ProtocolStatusSchema.optional()
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one field must be provided for Protocol update'
  });

export const ProtocolVersionCreateSchema = z.object({
  protocolId: z.string().uuid('protocolId must be a valid UUID')
});

export const ProtocolVersionEditSchema = z.object({
  content_json: ProtocolContentSchema
});

export const ProtocolPublishRequestSchema = z.object({
  versionId: z.string().uuid('versionId must be a valid UUID')
});

export type ProtocolStatus = z.infer<typeof ProtocolStatusSchema>;
export type ProtocolVersionStatus = z.infer<typeof ProtocolVersionStatusSchema>;
export type ProtocolSeverityLevel = z.infer<typeof ProtocolSeverityLevelSchema>;
export type ProtocolStepDto = z.infer<typeof ProtocolStepSchema>;
export type ProtocolEscalationDto = z.infer<typeof ProtocolEscalationSchema>;
export type ProtocolSeverityDto = z.infer<typeof ProtocolSeveritySchema>;
export type ProtocolDosingGuidanceDto = z.infer<typeof ProtocolDosingGuidanceSchema>;
export type ProtocolContentDto = z.infer<typeof ProtocolContentSchema>;
export type ProtocolContentPublishDto = z.infer<typeof ProtocolContentPublishSchema>;
export type ProtocolCreateDto = z.infer<typeof ProtocolCreateSchema>;
export type ProtocolUpdateDto = z.infer<typeof ProtocolUpdateSchema>;
export type ProtocolVersionCreateDto = z.infer<typeof ProtocolVersionCreateSchema>;
export type ProtocolVersionEditDto = z.infer<typeof ProtocolVersionEditSchema>;
export type ProtocolPublishRequestDto = z.infer<typeof ProtocolPublishRequestSchema>;
