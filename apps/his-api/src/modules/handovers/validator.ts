import { parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';

import type { HandoverItemRecord, HandoverRecord } from './repo.js';

const publishItemSchema = z.object({
  planJson: z.array(z.unknown()).min(1, 'plan_json must contain at least one item'),
  escalationJson: z.object({
    ifWorse: z
      .string()
      .trim()
      .min(1, 'escalation_json.ifWorse is required')
  })
});

const publishValidationSchema = z.object({
  shiftDate: z.string().trim().min(1, 'shift_date is required'),
  shiftPeriod: z.enum(['day', 'night', 'custom'], {
    errorMap: () => ({
      message: 'shift_period is required'
    })
  }),
  items: z.array(publishItemSchema).min(1, 'items must contain at least one handover item')
});

type PublishValidationInput = {
  handover: HandoverRecord;
  items: HandoverItemRecord[];
};

export function validateHandoverPublishOrThrow(input: PublishValidationInput): void {
  parseOrThrow422(publishValidationSchema, {
    shiftDate: input.handover.shiftDate,
    shiftPeriod: input.handover.shiftPeriod,
    items: input.items.map((item) => ({
      planJson: item.planJson,
      escalationJson: item.escalationJson
    }))
  });
}
