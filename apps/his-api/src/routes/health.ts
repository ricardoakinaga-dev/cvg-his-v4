import { readFileSync } from 'node:fs';

import type { FastifyPluginAsync } from 'fastify';
import { healthCache } from '../lib/cache.js';

type PackageMetadata = {
  version: string;
};

const packageMetadata = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
) as PackageMetadata;

// Track startup time for detailed uptime
const startedAt = new Date();

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'General health check',
      description: 'Returns overall system health including database and Redis status',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded'] },
            version: { type: 'string' },
            uptime: { type: 'number' },
            startedAt: { type: 'string', format: 'date-time' },
            checks: {
              type: 'object',
              properties: {
                db: { type: 'string', enum: ['ok', 'error'] },
                redis: { type: 'string', enum: ['ok', 'error'] }
              }
            }
          }
        }
      }
    }
  }, async () => {
    // Cache health checks for 5 seconds to avoid hammering DB/Redis
    const cached = healthCache.get<{ status: string; version: string; uptime: number; startedAt: string; checks: { db: string; redis: string } }>('health:main');
    if (cached) {
      // Update uptime from cache
      return { ...cached, uptime: process.uptime() };
    }

    const [db, redis] = await Promise.all([app.checkDbHealth(), app.checkRedisHealth()]);

    const overallStatus = db === 'ok' && redis === 'ok' ? 'ok' : 'degraded';

    const result = {
      status: overallStatus,
      version: packageMetadata.version,
      uptime: process.uptime(),
      startedAt: startedAt.toISOString(),
      checks: {
        db,
        redis
      }
    };

    healthCache.set('health:main', result, 5_000); // Cache for 5 seconds
    return result;
  });

  app.get('/health/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness probe',
      description: 'Kubernetes/Docker readiness probe - checks all dependencies'
    }
  }, async (_request, reply) => {
    // Readiness probe: all dependencies must be healthy
    const [db, redis] = await Promise.all([app.checkDbHealth(), app.checkRedisHealth()]);

    if (db === 'ok' && redis === 'ok') {
      return reply.status(200).send({ status: 'ready' });
    }

    return reply.status(503).send({
      status: 'not_ready',
      checks: { db, redis }
    });
  });

  app.get('/health/live', async () => {
    // Liveness probe: process is alive (no dependency check)
    return {
      status: 'alive',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  });

  app.get('/health/db', async (_request, reply) => {
    const db = await app.checkDbHealth();
    const statusCode = db === 'ok' ? 200 : 503;

    return reply.status(statusCode).send({ db });
  });

  app.get('/health/redis', async (_request, reply) => {
    const redis = await app.checkRedisHealth();
    const statusCode = redis === 'ok' ? 200 : 503;

    return reply.status(statusCode).send({ redis });
  });
};
