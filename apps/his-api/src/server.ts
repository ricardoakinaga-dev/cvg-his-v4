import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';

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

  await app.register(envPlugin);

  await app.register(cors, {
    origin: app.env.NODE_ENV === 'development'
  });

  // Swagger/OpenAPI Documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'CVG-HIS API',
        description: 'Hospital Information System API - Veterinary Module',
        version: '0.1.0',
        contact: {
          name: 'CVG-HIS Support'
        }
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local Development' }
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Owners', description: 'Pet owners (tutors)' },
        { name: 'Patients', description: 'Patient management' },
        { name: 'Appointments', description: 'Appointment scheduling' },
        { name: 'Exams', description: 'Exam orders and results' },
        { name: 'Reports', description: 'Reports and analytics' },
        { name: 'Inpatient', description: 'Inpatient care management' },
        { name: 'Notifications', description: 'SMS, WhatsApp, and Email notifications' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
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
