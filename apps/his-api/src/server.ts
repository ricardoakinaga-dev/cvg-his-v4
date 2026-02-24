import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { registerErrorHandler } from './lib/errors.js';
import { buildLoggerOptions } from './lib/logger.js';
import { dbPlugin } from './plugins/db.js';
import { envPlugin } from './plugins/env.js';
import { requestIdPlugin, resolveRequestId } from './plugins/requestId.js';
import { requestContextPlugin } from './plugins/requestContext.js';
import { redisPlugin } from './plugins/redis.js';
import { apiRoutes } from './routes/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    requestStartTimeMs: number;
  }
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(),
    disableRequestLogging: true,
    requestIdHeader: 'request-id',
    requestIdLogLabel: 'requestId',
    genReqId: (request) => resolveRequestId(request.headers as Record<string, unknown>)
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(envPlugin);

  await app.register(cors, {
    origin: app.env.NODE_ENV === 'development'
  });

  await app.register(requestIdPlugin);

  app.addHook('onRequest', async (request) => {
    request.requestStartTimeMs = Date.now();
    request.log.info(
      {
        method: request.method,
        url: request.url
      },
      'request received'
    );
  });

  app.addHook('onResponse', async (request, reply) => {
    const responseTimeMs = Date.now() - request.requestStartTimeMs;
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTimeMs
      },
      'request completed'
    );
  });

  await app.register(requestContextPlugin);
  await app.register(dbPlugin);
  await app.register(redisPlugin);

  registerErrorHandler(app);

  if (app.env.NODE_ENV !== 'production') {
    app.get('/__debug/error', async () => {
      throw new Error('Forced debug exception');
    });
  }

  await app.register(apiRoutes);

  return app;
}
