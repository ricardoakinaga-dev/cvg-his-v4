import { z } from 'zod';
import { normalizeStringList, trim } from './common.js';
const normalizedStringArraySchema = z.array(z.string()).transform(normalizeStringList);
const notesSchema = z.preprocess((value) => {
    if (typeof value !== 'string') {
        return value;
    }
    const normalized = trim(value);
    return normalized.length === 0 ? null : normalized;
}, z.string().nullable());
export const AlertSchema = z
    .object({
    aggressive: z.boolean().optional(),
    allergies: normalizedStringArraySchema.optional(),
    anesthesia_risk: z.enum(['low', 'medium', 'high']).nullable().optional(),
    chronic_conditions: normalizedStringArraySchema.optional(),
    notes: notesSchema.optional()
})
    .strict();
//# sourceMappingURL=alerts.js.map