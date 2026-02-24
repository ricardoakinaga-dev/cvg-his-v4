import type { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../middlewares/requirePermission.js';

export const imagingRoutes: FastifyPluginAsync = async (app) => {
    // Compatibility route for his-web 
    // GET /imaging/schedule
    app.get(
        '/schedule',
        {
            preHandler: [requirePermission('encounters.read')] // Using an existing permission
        },
        async (request, reply) => {
            // Return empty schedule by default so the UI doesn't crash on 500
            return reply.code(200).send({
                data: [],
                total: 0
            });
        }
    );
};
