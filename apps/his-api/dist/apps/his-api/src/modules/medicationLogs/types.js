import { z } from 'zod';
export const medicationLogsQuerySchema = z.object({
    stayId: z.string().uuid()
});
//# sourceMappingURL=types.js.map