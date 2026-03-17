import { z } from 'zod';
import { PatientCreateSchema, PatientUpdateSchema } from '@cvg-his/domain';
export const createPatientBodySchema = PatientCreateSchema;
export const updatePatientBodySchema = PatientUpdateSchema;
export const patientIdParamSchema = z.object({
    id: z.string().uuid()
});
export const listPatientsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    ownerId: z.string().uuid().optional(),
    species: z.string().trim().min(1).max(60).optional(),
    q: z.string().trim().max(120).optional()
});
//# sourceMappingURL=types.js.map