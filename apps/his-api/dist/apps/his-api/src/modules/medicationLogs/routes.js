import { requirePermission } from '../../middlewares/requirePermission.js';
import { createMedicationLogsService } from './service.js';
import { medicationLogsQuerySchema } from './types.js';
export const medicationLogsRoutes = async (app) => {
    app.get('/', {
        preHandler: requirePermission('medlog.read')
    }, async (request) => {
        const query = medicationLogsQuerySchema.parse(request.query);
        const service = createMedicationLogsService({ db: app.db, requestContext: request.requestContext });
        return service.getByStay(query.stayId);
    });
};
//# sourceMappingURL=routes.js.map