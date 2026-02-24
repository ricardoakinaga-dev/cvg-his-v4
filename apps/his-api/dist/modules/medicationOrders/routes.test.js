import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerErrorHandler } from '../../lib/errors.js';
import { medicationOrdersRoutes } from './routes.js';
const mockedService = vi.hoisted(() => ({
    create: vi.fn(),
    getById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    stop: vi.fn()
}));
const createMedicationOrdersServiceMock = vi.hoisted(() => vi.fn(() => mockedService));
vi.mock('./service.js', () => ({
    createMedicationOrdersService: createMedicationOrdersServiceMock
}));
function makeOrder() {
    return {
        id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef1',
        accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
        encounterId: null,
        stayId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
        patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef4',
        medicationName: 'ceftriaxona',
        doseValue: '25',
        doseUnit: 'mg/kg',
        route: 'IV',
        frequencyType: 'q12h',
        prescriptionText: null,
        durationValue: 3,
        durationUnit: 'days',
        startAt: '2026-02-18T08:00:00.000Z',
        endAt: null,
        status: 'active',
        stopReason: null,
        createdByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
        stoppedByUserId: null,
        createdAt: '2026-02-18T08:00:00.000Z',
        updatedAt: '2026-02-18T08:00:00.000Z'
    };
}
async function buildTestApp(service, actor) {
    const app = Fastify();
    app.decorate('db', {});
    app.decorate('env', {
        NODE_ENV: 'test',
        PORT: 3000,
        DATABASE_URL: 'postgres://test',
        REDIS_URL: 'redis://test',
        QUEUE_PREFIX: 'cvg-his',
        LOG_LEVEL: 'silent',
        QDRANT_URL: undefined,
        QDRANT_COLLECTION: 'professor',
        QDRANT_API_KEY: undefined
    });
    app.addHook('onRequest', async (request) => {
        request.requestContext = {
            requestId: request.id,
            actor
        };
    });
    registerErrorHandler(app);
    await app.register(medicationOrdersRoutes);
    await app.ready();
    createMedicationOrdersServiceMock.mockReturnValue(service);
    return app;
}
describe('medication orders routes', () => {
    const adminActor = {
        accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
        userId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
        role: 'admin',
        roles: ['admin'],
        permissions: []
    };
    const nursingActor = {
        accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
        userId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
        role: 'enfermagem',
        roles: ['enfermagem'],
        permissions: []
    };
    beforeEach(() => {
        vi.clearAllMocks();
        mockedService.create.mockResolvedValue({
            kind: 'created',
            order: makeOrder()
        });
        mockedService.getById.mockResolvedValue(makeOrder());
        mockedService.list.mockResolvedValue({
            data: [makeOrder()],
            page: 1,
            pageSize: 20,
            total: 1
        });
        mockedService.update.mockResolvedValue({
            kind: 'updated',
            order: makeOrder()
        });
        mockedService.stop.mockResolvedValue({
            kind: 'stopped',
            order: makeOrder()
        });
    });
    it('aplica RBAC: enfermagem recebe 403 ao tentar stop', async () => {
        const app = await buildTestApp(mockedService, nursingActor);
        const response = await app.inject({
            method: 'POST',
            url: '/fdd8c156-b52d-4117-a5e1-73dd61474ef1/stop',
            payload: {
                stopReason: 'sem indicacao'
            }
        });
        expect(response.statusCode).toBe(403);
        expect(mockedService.stop).not.toHaveBeenCalled();
        await app.close();
    });
    it('lista por filtros stay/encounter/status', async () => {
        const app = await buildTestApp(mockedService, adminActor);
        const response = await app.inject({
            method: 'GET',
            url: '/?stayId=fdd8c156-b52d-4117-a5e1-73dd61474ef3&status=active&page=1&pageSize=20'
        });
        expect(response.statusCode).toBe(200);
        expect(mockedService.list).toHaveBeenCalledWith(expect.objectContaining({
            stayId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
            status: 'active'
        }));
        await app.close();
    });
});
//# sourceMappingURL=routes.test.js.map