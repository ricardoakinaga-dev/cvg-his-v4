import { z } from 'zod';
import { createApiQueues, PROTOCOL_PUBLISH_QUEUE_NAME } from '../../lib/queues.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createProtocolPublishService } from './service.js';
const versionIdParamSchema = z.object({
    versionId: z.string().uuid()
});
export const protocolPublishRoutes = async (app) => {
    const queues = createApiQueues({
        redisUrl: app.env.REDIS_URL,
        prefix: app.env.QUEUE_PREFIX,
        logger: app.log
    });
    app.addHook('onClose', async () => {
        await queues.close();
    });
    app.post('/protocol-versions/:versionId/publish', {
        preHandler: requirePermission('protocol.publish')
    }, async (request, reply) => {
        const params = versionIdParamSchema.parse(request.params);
        const service = createProtocolPublishService({ db: app.db, requestContext: request.requestContext }, { enqueueProtocolPublish: queues.enqueueProtocolPublish });
        const result = await service.requestPublish(params.versionId);
        if (result.kind === 'version_not_found') {
            return reply.status(404).send({ message: 'Protocol version not found' });
        }
        if (result.kind === 'version_not_publishable') {
            return reply.status(409).send({
                message: 'Only draft or failed protocol versions can be published',
                version: result.version
            });
        }
        if (result.kind === 'invalid_content') {
            return reply.status(422).send({
                message: 'Protocol content_json is invalid',
                issues: result.issues
            });
        }
        return reply.status(202).send({
            queue: PROTOCOL_PUBLISH_QUEUE_NAME,
            jobId: result.jobId,
            status: result.version.status,
            protocolId: result.version.protocolId,
            versionId: result.version.id
        });
    });
};
//# sourceMappingURL=routes.js.map