import { requirePermission } from '../middlewares/requirePermission.js';
export const settingsRoutes = async (app) => {
    // Compatibility route for his-web 
    // GET /settings/:namespace
    app.get('/:namespace', {
        preHandler: [requirePermission('settings.read')]
    }, async (request, reply) => {
        // Return empty configuration by default so the UI doesn't crash on 500
        return reply.code(200).send({
            namespace: request.params.namespace,
            config: {}
        });
    });
    // PUT /settings/:namespace/:key
    app.put('/:namespace/:key', {
        preHandler: [requirePermission('settings.write')]
    }, async (request, reply) => {
        return reply.code(200).send({ success: true });
    });
};
//# sourceMappingURL=settings.js.map