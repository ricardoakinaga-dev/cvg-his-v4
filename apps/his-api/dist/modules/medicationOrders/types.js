import { z } from 'zod';
import { MedicationOrderStatusSchema } from '@cvg-his/domain';
export const medicationOrderIdParamSchema = z.object({
    id: z.string().uuid()
});
export const listMedicationOrdersQuerySchema = z.object({
    encounterId: z.string().uuid().optional(),
    stayId: z.string().uuid().optional(),
    status: MedicationOrderStatusSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20)
});
//# sourceMappingURL=types.js.map