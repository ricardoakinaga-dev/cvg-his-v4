import { InpatientAdmitSchema, InpatientDischargeSchema, InpatientStayStatusSchema, InpatientTransferSchema, parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createInpatientService } from './service.js';
import { createDashboardRepo } from './dashboardRepo.js';
const stayIdParamSchema = z.object({
    id: z.string().uuid()
});
const listStaysQuerySchema = z.object({
    status: InpatientStayStatusSchema.optional(),
    wardId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20)
});
const dashboardQuerySchema = z.object({
    wardId: z.string().uuid().optional()
});
export const inpatientRoutes = async (app) => {
    app.post('/admit', {
        preHandler: requirePermission('inpatient.write')
    }, async (request, reply) => {
        const body = parseOrThrow422(InpatientAdmitSchema, request.body);
        const payload = {
            patientId: body.patientId,
            wardId: body.wardId,
            bedId: body.bedId,
            encounterId: body.encounterId,
            chiefComplaint: body.chiefComplaint,
            reason: body.reason,
            planSummary: body.planSummary,
        };
        const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
        const result = await service.admit(payload);
        if (result.kind === 'patient_not_found') {
            return reply.status(404).send({ message: 'Patient not found' });
        }
        if (result.kind === 'ward_not_found') {
            return reply.status(404).send({ message: 'Ward not found' });
        }
        if (result.kind === 'bed_not_found') {
            return reply.status(404).send({ message: 'Bed not found' });
        }
        if (result.kind === 'bed_inactive') {
            return reply.status(409).send({ message: 'Bed is inactive' });
        }
        if (result.kind === 'bed_ward_mismatch') {
            return reply.status(409).send({ message: 'Bed does not belong to the target ward' });
        }
        if (result.kind === 'bed_occupied') {
            return reply.status(409).send({ message: 'Bed is already occupied by an active stay' });
        }
        return reply.send(result.stay);
    });
    app.post('/stays/:id/transfer', {
        preHandler: requirePermission('inpatient.write')
    }, async (request, reply) => {
        const params = stayIdParamSchema.parse(request.params);
        const body = parseOrThrow422(InpatientTransferSchema, request.body);
        const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
        const result = await service.transfer(params.id, {
            toWardId: body.toWardId,
            toBedId: body.toBedId,
            reason: body.reason
        });
        if (result.kind === 'stay_not_found') {
            return reply.status(404).send({ message: 'Inpatient stay not found' });
        }
        if (result.kind === 'ward_not_found') {
            return reply.status(404).send({ message: 'Ward not found' });
        }
        if (result.kind === 'bed_not_found') {
            return reply.status(404).send({ message: 'Bed not found' });
        }
        if (result.kind === 'stay_not_active') {
            return reply.status(409).send({
                message: 'Only active stays can be transferred',
                stay: result.stay
            });
        }
        if (result.kind === 'bed_inactive') {
            return reply.status(409).send({ message: 'Bed is inactive' });
        }
        if (result.kind === 'bed_ward_mismatch') {
            return reply.status(409).send({ message: 'Bed does not belong to the target ward' });
        }
        if (result.kind === 'bed_occupied') {
            return reply.status(409).send({ message: 'Bed is already occupied by an active stay' });
        }
        return reply.send(result.stay);
    });
    app.post('/stays/:id/discharge', {
        preHandler: requirePermission('inpatient.discharge')
    }, async (request, reply) => {
        const params = stayIdParamSchema.parse(request.params);
        const body = parseOrThrow422(InpatientDischargeSchema, request.body);
        const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
        const result = await service.discharge(params.id, body);
        if (result.kind === 'stay_not_found') {
            return reply.status(404).send({ message: 'Inpatient stay not found' });
        }
        if (result.kind === 'stay_not_active') {
            return reply.status(409).send({
                message: 'Only active stays can be discharged',
                stay: result.stay
            });
        }
        return reply.send(result.stay);
    });
    app.get('/stays/:id', {
        preHandler: requirePermission('inpatient.read')
    }, async (request, reply) => {
        const params = stayIdParamSchema.parse(request.params);
        const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
        const stay = await service.getById(params.id);
        if (!stay) {
            return reply.status(404).send({ message: 'Inpatient stay not found' });
        }
        return reply.send(stay);
    });
    app.get('/stays', {
        preHandler: requirePermission('inpatient.read')
    }, async (request) => {
        const query = listStaysQuerySchema.parse(request.query);
        const service = createInpatientService({ db: app.db, requestContext: request.requestContext });
        return service.list(query);
    });
    app.get('/dashboard', {
        preHandler: requirePermission('inpatient.read')
    }, async (request, reply) => {
        const query = dashboardQuerySchema.parse(request.query);
        const actor = request.requestContext.actor;
        if (!actor?.accountId) {
            return reply.status(401).send({ message: 'Missing actor context' });
        }
        const repo = createDashboardRepo(app.db);
        return repo.getDashboard(actor.accountId, query.wardId);
    });
    // Compatibility route for his-web
    app.get('/panel', {
        preHandler: requirePermission('inpatient.read')
    }, async (request, reply) => {
        const query = dashboardQuerySchema.parse(request.query);
        const actor = request.requestContext.actor;
        if (!actor?.accountId) {
            return reply.status(401).send({ message: 'Missing actor context' });
        }
        try {
            const repo = createDashboardRepo(app.db);
            const dashboard = await repo.getDashboard(actor.accountId, query.wardId);
            return reply.code(200).send(dashboard);
        }
        catch (error) {
            // Return 200 with empty structure to prevent 500 error on the UI
            return reply.code(200).send({
                wards: [],
                totalOccupied: 0,
                totalFree: 0
            });
        }
    });
};
//# sourceMappingURL=routes.js.map