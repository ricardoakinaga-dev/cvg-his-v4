import { z } from 'zod';
export const searchQuerySchema = z.object({
    q: z.string().trim().min(2, 'q must have at least 2 characters').max(120),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(20).default(10)
});
//# sourceMappingURL=types.js.map