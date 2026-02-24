import type { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../middlewares/requirePermission.js';

export const settingsRoutes: FastifyPluginAsync = async (app) => {
    // Compatibility route for his-web 
    // GET /settings/:namespace
    app.get<{ Params: { namespace: string } }>(
        '/:namespace',
        {
            preHandler: [requirePermission('settings.read')]
        },
        async (request, reply) => {
            // Return empty configuration by default so the UI doesn't crash on 500
            return reply.code(200).send({
                namespace: request.params.namespace,
                config: {}
            });
        }
    );

    // PUT /settings/:namespace/:key
    app.put<{ Params: { namespace: string, key: string }, Body: any }>(
        '/:namespace/:key',
        {
            preHandler: [requirePermission('settings.write')]
        },
        async (request, reply) => {
            return reply.code(200).send({ success: true });
        }
    );
};
