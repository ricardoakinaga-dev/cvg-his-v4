import { z } from 'zod';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createMedicationDosesService } from './service.js';
const dueDosesQuerySchema = z.object({
    stayId: z.string().uuid().optional(),
    windowMin: z.coerce.number().int().positive().max(720).default(120)
});
export const medicationDosesRoutes = async (app) => {
    app.get('/due', {
        preHandler: [requirePermission('medorder.read'), requirePermission('medadmin.read')]
    }, async (request) => {
        const query = dueDosesQuerySchema.parse(request.query);
        const service = createMedicationDosesService({ db: app.db, requestContext: request.requestContext });
        return service.getDue(query);
    });
};
//# sourceMappingURL=routes.js.map